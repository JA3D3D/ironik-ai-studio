import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DAILY_GENERATION_LIMIT, IMAGES_PER_GENERATION, KINDS, QUALITY } from '@/lib/pricing';

// High-quality sets of 4 can take a while.
export const maxDuration = 120;

function buildPrompt({ prompt, kind, brandColors, businessName }) {
  const parts = [`Create ${KINDS[kind].guide}.`, `Client request: ${prompt}`];
  if (brandColors) parts.push(`Use this brand color palette: ${brandColors}.`);
  if (businessName && kind !== 'pattern') parts.push(`The brand is called "${businessName}" (only include the name as text if the request asks for it).`);
  return parts.join('\n');
}

export async function POST(req) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  const prompt = String(body.prompt || '').trim();
  const kind = String(body.kind || '');
  const quality = String(body.quality || '');
  const useBrand = Boolean(body.useBrand);

  if (prompt.length < 3) return NextResponse.json({ error: 'Describe what you want first.' }, { status: 400 });
  if (prompt.length > 1000) return NextResponse.json({ error: 'Keep the description under 1,000 characters.' }, { status: 400 });
  if (!KINDS[kind] || !QUALITY[quality]) return NextResponse.json({ error: 'Pick a type and quality.' }, { status: 400 });

  const admin = createAdminClient();

  // Daily safety limit
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since.toISOString());
  if ((count ?? 0) >= DAILY_GENERATION_LIMIT) {
    return NextResponse.json({ error: 'Daily limit reached. Try again tomorrow.' }, { status: 429 });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('brand_colors, business_name')
    .eq('id', user.id)
    .single();

  const cost = QUALITY[quality].credits;
  const genId = crypto.randomUUID();

  // Take the credits first (atomic: fails if the balance is too low)
  const { data: spent, error: spendError } = await admin.rpc('spend_credits', {
    p_user: user.id,
    p_amount: cost,
    p_ref: 'gen:' + genId,
  });
  if (spendError) return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  if (!spent) return NextResponse.json({ error: 'Not enough credits for this quality.', needCredits: true }, { status: 402 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
      prompt: buildPrompt({
        prompt,
        kind,
        brandColors: useBrand ? profile?.brand_colors : null,
        businessName: profile?.business_name,
      }),
      n: IMAGES_PER_GENERATION,
      size: '1024x1024',
      quality: QUALITY[quality].apiQuality,
    });

    const { error: genError } = await admin.from('generations').insert({
      id: genId,
      user_id: user.id,
      prompt,
      kind,
      quality,
      cost,
    });
    if (genError) throw genError;

    const rows = [];
    for (let i = 0; i < result.data.length; i++) {
      const b64 = result.data[i].b64_json;
      if (!b64) continue;
      const path = `${user.id}/${genId}/${i + 1}.png`;
      const { error: upError } = await admin.storage
        .from('generations')
        .upload(path, Buffer.from(b64, 'base64'), { contentType: 'image/png' });
      if (upError) throw upError;
      rows.push({ generation_id: genId, user_id: user.id, storage_path: path });
    }
    if (!rows.length) throw new Error('No images returned');

    const { data: inserted, error: imgError } = await admin.from('images').insert(rows).select('id, storage_path');
    if (imgError) throw imgError;

    const { data: signed } = await admin.storage
      .from('generations')
      .createSignedUrls(inserted.map((r) => r.storage_path), 60 * 60);

    const { data: after } = await admin.from('profiles').select('credits').eq('id', user.id).single();

    return NextResponse.json({
      images: inserted.map((r, i) => ({ id: r.id, url: signed?.[i]?.signedUrl, n: i + 1 })),
      credits: after?.credits ?? null,
    });
  } catch (err) {
    // Give the credits back if anything failed
    await admin.rpc('add_credits', {
      p_user: user.id,
      p_amount: cost,
      p_reason: 'refund',
      p_ref: 'refund:' + genId,
    });
    console.error('generate failed', err);
    const blocked = err?.status === 400 && /safety|moderation|policy/i.test(String(err?.message));
    return NextResponse.json(
      {
        error: blocked
          ? 'That request was blocked by the AI safety filter. Try rewording it. Your credits were returned.'
          : 'The image service had a problem. Your credits were returned. Try again in a minute.',
      },
      { status: 502 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { KINDS } from '@/lib/pricing';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });

  // Row level security limits this to the user's own images
  const { data: images, error } = await supabase
    .from('images')
    .select('id, storage_path, created_at, generations(prompt, kind)')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) return NextResponse.json({ error: 'Could not load your gallery.' }, { status: 500 });
  if (!images.length) return NextResponse.json({ images: [] });

  const admin = createAdminClient();
  const { data: signed } = await admin.storage
    .from('generations')
    .createSignedUrls(images.map((i) => i.storage_path), 60 * 60);

  return NextResponse.json({
    images: images.map((img, i) => ({
      id: img.id,
      url: signed?.[i]?.signedUrl,
      prompt: img.generations?.prompt || '',
      kind: KINDS[img.generations?.kind]?.label || '',
      createdAt: img.created_at,
    })),
  });
}

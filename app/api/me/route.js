import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, business_name, brand_colors, credits, plan')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ profile });
}

// Clients can update their own business name and brand colors (nothing else).
export async function PATCH(req) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const update = {
    business_name: String(body.businessName ?? '').trim().slice(0, 120) || null,
    brand_colors: String(body.brandColors ?? '').trim().slice(0, 300) || null,
  };

  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update(update).eq('id', user.id);
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

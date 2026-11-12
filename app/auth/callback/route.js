import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// The login email link lands here.
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/studio', url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}

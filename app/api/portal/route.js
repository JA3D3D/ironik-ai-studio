import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe, siteUrl } from '@/lib/stripe';

// Opens Stripe's billing page where Pro clients can update their card or cancel.
export async function POST(req) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: 'No billing account yet.' }, { status: 400 });

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl(req)}/studio?tab=credits`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('portal failed', err);
    return NextResponse.json({ error: 'Could not open billing. Try again.' }, { status: 500 });
  }
}

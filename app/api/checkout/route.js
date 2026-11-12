import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, siteUrl } from '@/lib/stripe';
import { PACKS } from '@/lib/pricing';

// Make sure each client has one Stripe customer, saved before they pay,
// so the webhook can always match a payment back to the right account.
async function ensureCustomer(admin, stripe, user) {
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single();
  if (profile?.stripe_customer_id) return profile;

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { user_id: user.id },
  });
  await admin.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id);
  return { ...profile, stripe_customer_id: customer.id };
}

export async function POST(req) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });

  const { item } = await req.json().catch(() => ({}));
  const stripe = getStripe();
  const admin = createAdminClient();
  const base = siteUrl(req);

  try {
    const profile = await ensureCustomer(admin, stripe, user);

    if (item === 'pro') {
      const { data: me } = await admin.from('profiles').select('plan').eq('id', user.id).single();
      if (me?.plan === 'pro') return NextResponse.json({ error: 'You are already on Pro.' }, { status: 400 });
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: profile.stripe_customer_id,
        client_reference_id: user.id,
        line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
        subscription_data: { metadata: { user_id: user.id } },
        success_url: `${base}/studio?purchase=pro`,
        cancel_url: `${base}/studio?tab=credits`,
      });
      return NextResponse.json({ url: session.url });
    }

    const pack = PACKS[item];
    if (!pack) return NextResponse.json({ error: 'Unknown item.' }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: profile.stripe_customer_id,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pack.cents,
            product_data: { name: `Ironik Grafix AI Studio — ${pack.label} (${pack.credits} credits)` },
          },
        },
      ],
      metadata: { user_id: user.id, credits: String(pack.credits), item },
      success_url: `${base}/studio?purchase=credits`,
      cancel_url: `${base}/studio?tab=credits`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('checkout failed', err);
    return NextResponse.json({ error: 'Could not start checkout. Try again.' }, { status: 500 });
  }
}

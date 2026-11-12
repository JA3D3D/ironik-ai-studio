import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRO } from '@/lib/pricing';

// Stripe calls this after payments. It's the ONLY place credits get added for purchases.
export async function POST(req) {
  const stripe = getStripe();
  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature failed', err?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createAdminClient();

  async function profileByCustomer(customerId) {
    if (!customerId) return null;
    const { data } = await admin.from('profiles').select('id').eq('stripe_customer_id', customerId).single();
    return data;
  }

  try {
    switch (event.type) {
      // Credit packs (card payments finish here; bank payments finish on async_payment_succeeded)
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const s = event.data.object;
        if (s.mode === 'payment' && s.payment_status === 'paid' && s.metadata?.credits) {
          const userId = s.metadata.user_id || s.client_reference_id;
          const credits = parseInt(s.metadata.credits, 10);
          const { error } = await admin.rpc('add_credits', {
            p_user: userId,
            p_amount: credits,
            p_reason: 'pack:' + (s.metadata.item || ''),
            p_ref: 'cs:' + s.id,
          });
          if (error) throw error;
        }
        break;
      }

      // Pro: every paid monthly invoice adds the monthly credits
      case 'invoice.paid': {
        const inv = event.data.object;
        if (!String(inv.billing_reason || '').startsWith('subscription')) break;
        const profile = await profileByCustomer(inv.customer);
        if (!profile) throw new Error('No profile for customer ' + inv.customer);
        await admin.from('profiles').update({ plan: 'pro' }).eq('id', profile.id);
        const { error } = await admin.rpc('add_credits', {
          p_user: profile.id,
          p_amount: PRO.monthlyCredits,
          p_reason: 'pro_monthly',
          p_ref: 'inv:' + inv.id,
        });
        if (error) throw error;
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const profile = await profileByCustomer(sub.customer);
        if (!profile) break;
        const active = event.type === 'customer.subscription.updated' && ['active', 'trialing', 'past_due'].includes(sub.status);
        await admin.from('profiles').update({ plan: active ? 'pro' : 'free' }).eq('id', profile.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('webhook handling failed', event.type, err);
    // A 500 makes Stripe retry later; the unique ref stops double-crediting.
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

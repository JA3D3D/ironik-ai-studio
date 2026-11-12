import Stripe from 'stripe';

let stripe;
export function getStripe() {
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export function siteUrl(req) {
  return (process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || '').replace(/\/$/, '');
}

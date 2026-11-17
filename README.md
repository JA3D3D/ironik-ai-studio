# Ironik Grafix AI Studio

Clients sign up, buy credits or subscribe to Pro, and generate graphic elements
(logo marks, icons, badges, patterns, social graphics) with AI. Every image is
saved to their private gallery.

**Built with:** Next.js · Supabase (logins, database, image storage) · Stripe
(payments) · OpenAI image API (`gpt-image-2` for Drafts, `gpt-image-2.6-sunburst` for Standard/High) · hosted on Vercel.

## Prices and credits

All in `lib/pricing.js` — change them there.

| | Credits | Price |
|---|---|---|
| Draft image (4 options, fast model) | 1 | — |
| Standard image (4 options) | 8 | — |
| High image (4 options) | 12 | — |
| 1 Standard image | 8 | $1 |
| 10 Standard images | 80 | $5 |
| 25 Standard images | 200 | $12 |
| 50 Standard images | 400 | $20 |
| Pro plan | 400 / month | $29 / month |

Safety: each client is limited to 40 generations a day, and if the AI fails
the credits are refunded automatically.

---

## Setup (one time)

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: copy the Project URL, the `anon` key and the
   `service_role` key (keep the service key secret).
4. After step 5 gives you your site address: **Authentication → URL
   Configuration** → set **Site URL** to it and add
   `https://YOUR-SITE/auth/callback` to **Redirect URLs**.

### 2. OpenAI
1. platform.openai.com → add billing and a prepaid balance.
2. **Limits**: set a monthly budget (e.g. $25) as a safety cap.
3. **API keys** → create a key. (If OpenAI asks you to verify your
   organization before using image models, do that too.)

### 3. Stripe (start in Test mode)
1. **Product catalog → Add product**: name `Pro`, recurring, $29 / month.
   Copy its **price id** (`price_...`).
2. **Developers → API keys**: copy the **secret key** (`sk_test_...`).
3. **Settings → Billing → Customer portal**: activate it (lets Pro clients
   cancel or update their card).
4. After step 5: **Developers → Webhooks → Add endpoint**
   - URL: `https://YOUR-SITE/api/stripe/webhook`
   - Events: `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`, `invoice.paid`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **signing secret** (`whsec_...`).

### 4. Vercel
1. vercel.com → **Add New → Project** → import `ironik-ai-studio` from GitHub.
2. Add every variable from `.env.example` under **Environment Variables**.
3. **Deploy**. Note: Vercel's free Hobby plan is meant for non-commercial
   use; switch to Pro before taking real payments.

### 5. Your address (ai.ironikgrafix.com)
1. Vercel → Project → **Settings → Domains** → add `ai.ironikgrafix.com`.
2. Vercel shows a CNAME record. Add it in Squarespace → **Domains →
   ironikgrafix.com → DNS settings**.
3. Set `NEXT_PUBLIC_SITE_URL=https://ai.ironikgrafix.com` in Vercel and
   redeploy. Then finish the "after step 5" items above.

### 6. Test
Use Stripe test card `4242 4242 4242 4242`, any future date, any CVC. Buy a
pack, check credits appear, generate an image. When everything works, switch
Stripe to live mode, repeat step 3 with live keys, and update Vercel.

## Run locally (optional)
```
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

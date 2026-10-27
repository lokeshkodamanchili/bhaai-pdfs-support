<div align="center">

<img src="public/logo.jpeg" width="84" alt="Bhaai PDFs handprint logo">

# Keep the PDFs coming, bhaai.

**A little support today. More study resources for the semesters ahead.**

₹400 goal · Contributions from ₹10 · Looking ahead to 4-2

![Stack](https://img.shields.io/badge/HTML_·_CSS_·_JavaScript-0A0A0F?style=for-the-badge)
![Payments](https://img.shields.io/badge/Razorpay-FF6B35?style=for-the-badge)
![Database](https://img.shields.io/badge/Supabase-00D4AA?style=for-the-badge)

</div>

## One community. One next chapter.

Bhaai PDFs shares academic study PDFs and uses student feedback to improve future resources. This portal raises ₹400 towards renewing the creator's ChatGPT Go subscription, which ends on **4 November 2026**, with the aim of continuing PDF preparation and sharing through the 4-2 semester. It is an independent student initiative, not affiliated with OpenAI.

The original portal's handprint logo, Syne and Instrument Sans fonts, coral and teal accents, ambient orbs, and rounded glass surfaces carry into a focused contribution experience.

| Page | Experience |
|---|---|
| Home | Campaign story, verified funding progress, previous work, ₹10–₹50 suggestions and custom contributions. |
| Payments | Latest 100 verified entries with public display names, net amounts and dates. |
| Reviews | Original feedback layout, star selector, review cards, overall analytics and rating chart. |

No donor list appears on Home. Statistics use all matching records; lists show the latest 100. Progress refreshes every 30 seconds while the browser is visible and after payment verification. Existing feedback-site records are not migrated automatically.

## Set it up — in order

### 1. Supabase

Open the **new bhaai-pdfs-support project → SQL Editor → New query**. Paste the complete contents of [`supabase/setup.sql`](supabase/setup.sql) and click **Run** once. It creates donation/review tables, constraints, indexes and aggregate functions. If it reports an error, stop and inspect the message; do not delete an existing table to retry.

The tables have RLS enabled with no browser access. Only the server uses the secret key. Payment IDs are not included in the public response. The provided publishable key is not needed by this server-mediated architecture.

Open **Settings → API Keys → Secret keys**, create/copy a server secret key, and keep it private for Vercel. Do not commit it or send it through chat.

### 2. Vercel

1. Sign in to Vercel with GitHub.
2. Choose **Add New → Project → Import bhaai-pdfs-support**.
3. Framework preset: **Other**. Root directory: repository root. Build command: `npm run build`. Output directory: `public` (also configured in `vercel.json`).
4. Add the variables below directly in Vercel, then deploy.

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://rohummbpnwsujwgycsqx.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase server secret key; keep private. |
| `RAZORPAY_KEY_ID` | `rzp_test_TsxkPGjc4xvtZG` initially. |
| `RAZORPAY_KEY_SECRET` | Matching Test Key Secret; keep private. |
| `RAZORPAY_WEBHOOK_SECRET` | A long random string you create and save privately; use the identical value in Razorpay. |

Never prefix a secret with `NEXT_PUBLIC_`. No secrets belong in GitHub. Environment changes require a Vercel redeployment. This is a static frontend plus Vercel Node functions; GitHub Pages alone cannot run the payment backend.

### 3. Razorpay webhook and capture

After deployment, in **Test Mode → Account & Settings → Webhooks → Add new webhook**:

- URL: your deployed HTTPS origin followed by `/api/webhook`.
- Secret: the exact value saved as `RAZORPAY_WEBHOOK_SECRET` in Vercel.
- Events: `payment.captured`, `order.paid`, `refund.processed`.
- Keep the webhook enabled. Add an alert email if offered.

Set payment capture to **automatic** in Razorpay payment capture settings. Only captured payments are listed. If capture remains manual, you must capture an authorised payment in Razorpay before it can appear.

Complete one successful and one failed Test Mode checkout. Confirm the successful entry appears on Payments and progress changes; confirm the failed attempt does not. Test a refund and a duplicate webhook delivery. Do not use real credentials or real money in Test Mode.

### 4. Going live

Complete Razorpay onboarding and obtain approval for the actual collection purpose. Add the deployed website URL to your account. Review the website's contribution, refund and privacy information with your actual operating process and add any contact/policy details Razorpay requests.

Replace the Key ID and Key Secret in Vercel with a matching **Live** pair, configure a **Live** webhook with the same events and its own matching secret, and redeploy. Test records stay in the database but never count towards live progress. The banner changes based on the configured key. Review current provider fees separately: the campaign goal is ₹400 in contributions before payment processing fees, not a guaranteed ₹400 bank settlement.

## Payment integrity

Orders originate on the server with a minimum of ₹10. Suggested amounts are conveniences; custom amounts up to the technical limit of ₹10,00,000 are supported. The backend validates the checkout signature, fetches the payment from Razorpay, and checks the stored order, amount, INR currency, mode and capture status. A unique order row prevents duplicate notifications from double-counting. Signed webhooks provide reconciliation when checkout is closed, and fetch the latest payment status rather than trusting webhook amounts. Recorded refunds reduce the displayed total. The bar caps at 100%; the total can exceed ₹400 and further contributions remain allowed for the same renewal purpose.

Public reviews and order creation do not require sign-in. Before broad public promotion, configure suitable Vercel request limits for `/api/create-order` and `/api/reviews` if needed. No authentication, moderation dashboard or email notification service is included.

## Development and validation

```bash
npm test
npm run build
```

For full local API development, use the official Vercel CLI with environment variables configured privately. A basic static file server previews visuals only and cannot process payments.

Tests cover minimum amounts, signature tampering, capture/order/amount/currency checks, repeated verification and full-refund reconciliation. Full database and checkout validation requires running the SQL and deploying with server secrets; no live payment has been made during development.

## Source map

```text
public/             Frontend, original logo and theme
api/                Vercel API functions
lib/server.js       Verification and provider helpers
supabase/setup.sql  Database schema and privileges
test/               Payment integrity tests
.env.example        Variable names; no secrets
vercel.json         Deployment configuration
```

**Created for Lokesh Kodamanchili and the Bhaai PDFs community.**

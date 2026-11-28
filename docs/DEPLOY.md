# Putting the site online

The site is built for Vercel (the pages) and Supabase (the database and sign-in). Stripe takes payments and
Anthropic powers the assistant; both stay off until their keys are set. Work through the stages in order and
stop after any of them: each one leaves a working site.

## Stage 1: a private test site

1. **Supabase.** Create a project in a European region. In Project Settings, Database, copy the connection
   string of the connection pooler.
2. **Load the data.** On your computer, in the repo folder:
   `SYNC_DATABASE_URL="<connection string>" npx tsx scripts/sync-db.ts`.
   It creates the tables and loads every ETF. Run it again whenever you want to refresh by hand.
3. **Vercel.** Import the GitHub repo. Before the first deploy, add these environment variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | The Supabase connection string, ideally for a read-only role |
   | `NEXT_PUBLIC_SUPABASE_URL` | From Supabase, Project Settings, API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From the same page |
   | `NEXT_PUBLIC_SITE_URL` | The address Vercel gives you, for example `https://etf-xyz.vercel.app` |

   Do not deploy without `DATABASE_URL`. Without it the site builds its database in memory, which suits a
   laptop but not Vercel.
4. **Keep it private.** In Vercel, Settings, Deployment Protection, require a Vercel login.
5. **Sign-in.** In Supabase, Authentication, URL Configuration, set the site URL and add
   `<your address>/auth/callback` to the redirect URLs.

Check: open `/api/v1/health`, then the home page, a fund page, `/themes` and `/fr`.

## Stage 2: the parts that need keys

- **Daily refresh.** In GitHub, Settings, Secrets, add `SYNC_DATABASE_URL` with the same connection string.
  The daily job then reloads the live database after it collects prices.
- **Assistant.** Add `ANTHROPIC_API_KEY` in Vercel. Without it, search still works from the database.
- **Payments, in test mode.** Follow "Switch on payments" in the README with Stripe test keys. Pay with a
  Stripe test card and check that the account page shows the plan.
- **Accounts.** Sign in, save a watchlist, open the site on another device and check the list is there.
  This path has never run against a live project, so test it before anything else in this stage.

## Stage 3: opening to the public

1. Buy the domain, add it in Vercel, and set `NEXT_PUBLIC_SITE_URL` to it. The sitemap, the links in sign-in
   emails and the pictures shown when a page is shared all use this value.
2. Fill in `LEGAL_OPERATOR_NAME`, `LEGAL_OPERATOR_ADDRESS`, `LEGAL_CONTACT_EMAIL` and `LEGAL_GOVERNING_LAW`.
   They appear on the legal notice.
3. Have a lawyer review `/legal/terms`, `/legal/privacy` and `/legal/notice`, and a tax adviser review `/tax`.
   The pages say they are drafts until `src/lib/legal/content.ts` is updated.
4. Move Vercel and Supabase to paid plans. Vercel's free plan is for personal, non-commercial use, and a free
   Supabase project pauses after about a week without activity.
5. Switch Stripe to live keys and add the live webhook.
6. Remove the Vercel login requirement.
7. Submit `<your address>/sitemap.xml` in Google Search Console. It lists every page in English and French.

## Google sign-in

1. In Google Cloud, create an OAuth client of type "Web application" with the authorized redirect URI
   `https://<project ref>.supabase.co/auth/v1/callback`, and publish the consent screen.
2. In Supabase, Authentication, Sign In / Providers, Google: switch it on and paste the client ID and secret.
3. In Vercel, set `NEXT_PUBLIC_GOOGLE_AUTH=1` and redeploy. The sign-in page then offers Google first.

## Listing requests from issuers

The form at `/list-your-etf` (linked in the footer) saves requests to `public.listing_requests`. Nobody can
read them through the API: open the table in the Supabase table editor, and set `status` as you handle each.

## The website's database role

The site reads as the read-only role `etf_web`. Migration 0013 grants it every public data table; when a new
migration adds a public data table, add the table to that list in a new migration as well.

## After launch

- `/data` shows when each data job last ran and which sources failed.
- GitHub, Actions, shows every job. A red run means a source changed or refused; the site keeps the last good data.
- To change a schedule, edit the `cron` line in the matching file under `.github/workflows`.

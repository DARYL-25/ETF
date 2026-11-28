-- Requests from issuers whose ETFs are missing from the site, sent from /list-your-etf.
-- Anyone may send one; nobody can read them through the API. The owner reads them in the Supabase
-- table editor, which bypasses Row Level Security.
create table if not exists public.listing_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  company text not null check (char_length(company) between 2 and 200),
  contact_name text not null check (char_length(contact_name) between 2 and 200),
  email text not null check (char_length(email) between 5 and 254 and email like '%_@_%'),
  website text check (char_length(website) <= 500),
  funds text check (char_length(funds) <= 4000),
  message text check (char_length(message) <= 4000),
  lang text not null default 'en' check (lang in ('en', 'fr')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'listed', 'declined'))
);

alter table public.listing_requests enable row level security;

drop policy if exists "Anyone can send a listing request" on public.listing_requests;
create policy "Anyone can send a listing request" on public.listing_requests
  for insert to anon, authenticated
  with check (status = 'new');

grant insert (company, contact_name, email, website, funds, message, lang) on public.listing_requests to anon, authenticated;

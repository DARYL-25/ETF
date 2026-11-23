-- From each share class's KID (key information document): risk class 1 to 7, and transaction costs per year.
alter table public.universe_details add column if not exists sri smallint check (sri between 1 and 7);
alter table public.universe_details add column if not exists transaction_cost_pct double precision;
alter table public.universe_details add column if not exists kid_url text;

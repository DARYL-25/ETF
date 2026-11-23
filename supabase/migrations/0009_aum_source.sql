-- A fund size can come from a different file than the fee on the same row (US sizes from SEC N-PORT filings),
-- so the size keeps its own source. Null means the row's own source.
alter table public.universe_details add column if not exists aum_source text;
alter table public.universe_details add column if not exists aum_source_url text;

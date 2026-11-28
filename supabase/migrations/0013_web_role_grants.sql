-- The website reads the database as the read-only role etf_web (created by hand, see docs/DEPLOY.md).
-- Its grants are per table, so a table added by a later migration stayed unreadable to it and every
-- ETF page failed with "permission denied for table universe_exposures". This grants every public data
-- table to the role whenever it exists. User tables are not touched: the site reads those as the user.
do $$
declare t text;
begin
  if exists (select 1 from pg_roles where rolname = 'etf_web') then
    foreach t in array array[
      'universe_exposures', 'universe_monthly_returns', 'holdings', 'holdings_summary', 'universe_prices',
      'universe_details', 'universe_etfs', 'fund_top_holdings', 'fund_prices', 'fund_exposures',
      'metric_observations', 'share_class_fees', 'listings', 'share_classes', 'fund_categories',
      'fund_index_relationships', 'funds', 'categories', 'indices', 'exchanges', 'issuers', 'fx_rates',
      'data_sources', 'data_update_logs', 'etf_directory', 'etf_overview'
    ] loop
      if to_regclass('public.' || t) is not null then
        execute format('grant select on public.%I to etf_web', t);
      end if;
    end loop;
  end if;
end $$;

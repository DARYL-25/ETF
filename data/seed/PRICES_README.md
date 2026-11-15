# Price files

`data/seed/prices/*.csv` holds monthly closes (`date,close`), one file per market data symbol,
for example `CSPX.LON.csv`. The folder is ignored by git because the data comes from Alpha
Vantage's free tier, which is for personal, non-commercial use. Do not commit it to a public
repository. See `docs/DATA_SOURCES.md`.

With the folder present, the local database loads the prices and the chart appears. Without it,
ETF pages state that no price history is loaded.

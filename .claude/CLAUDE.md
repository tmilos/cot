# Project goal

Obtain and visualize Commitments of Traders (COT) data

# Structure

```
.                     # vite typescript + react compiler web app to render COT data with lightweight-charts
├── python            # build type python scripts to obtain data
│   ├── .venv         # python venv
│   ├── download.py   # download COT data for last X years and save to combined.parquet
│   └── transform.py  # transform combined.parquet to web format and save to public dir
├── public            # web app public data available in the runtime
└── package.json      # web app package.json
```

# Python build time data obtain

The `python` dir contains build time scripts that obtain data for the web

# React Web app

Use obtained available data from `public` dir and render it using lightweight-charts. Primary goal: The rendered charts should inform about the institutional trend following fast money activity.

The UI should let user pick the report, instrument, party (for Traders in Financial Futures futures only report: dealer, asset manager, leveraged money, other reports, and non-reporting), series (long, short, change long, change short, % long, % short, net positions (long-short) and render the chart.


# COT reports of interest

## Traders in Financial Futures futures only report

## Disaggregated Commitments of Traders

# Reference

* docs/cot-report-formats-and-columns.md - COT report summary, formats and columns
* docs/data-format.md - web app data requirements and mapping of COT data to it

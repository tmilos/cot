# COT Web Data Format Specification

This document specifies all JSON files produced by `python/transform.py` and consumed by the
React web app from the `public/cot/` directory. It serves as the authoritative spec for
implementing and extending the transform script.

---

## Directory Structure

```
public/cot/
  index.json                    # always loaded on app start
  tff/
    markets.json                # loaded when TFF report is selected
    {market-slug}.json          # loaded when a TFF market is selected
    ...                         # one file per market (~122 files)
  disagg/
    markets.json                # loaded when Disaggregated report is selected
    {market-slug}.json          # loaded when a Disaggregated market is selected
    ...
```

Adding a new report type requires: (1) a new entry in `REPORT_CONFIGS` in `transform.py`,
(2) a corresponding subdirectory under `public/cot/`. No changes to any other file.

---

## File: `public/cot/index.json`

### Purpose
Single entry point loaded once on app startup. Drives the report picker UI and defines the
ordered party list for each report (which determines array index positions in market data files).

### When loaded
On app initialization, before any user interaction.

### Schema

```json
[
  {
    "id": "tff",
    "label": "Traders in Financial Futures",
    "parties": [
      ["dealer",     "Dealer Intermediary"],
      ["asset_mgr",  "Asset Manager/Institutional"],
      ["lev_money",  "Leveraged Funds"],
      ["other_rept", "Other Reportables"],
      ["non_rept",   "Nonreportable Positions"]
    ]
  },
  {
    "id": "disagg",
    "label": "Disaggregated Commitments of Traders",
    "parties": [
      ["prod_merc",  "Producer/Merchant/Processor/User"],
      ["swap",       "Swap Dealers"],
      ["m_money",    "Managed Money"],
      ["other_rept", "Other Reportables"],
      ["non_rept",   "Nonreportable Positions"]
    ]
  }
]
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Report identifier; matches the subdirectory name under `public/cot/` |
| `label` | string | Human-readable report name for the UI picker |
| `parties` | array | Ordered list of `[partyId, partyLabel]` tuples |
| `parties[i][0]` | string | Party identifier; matches the column mapping key in `REPORT_CONFIGS` |
| `parties[i][1]` | string | Official CFTC party name for display |

### How created
Built entirely from `REPORT_CONFIGS` in `transform.py` — not read from the parquet. Rebuilt
on every transform run so it always reflects the current config.

---

## File: `public/cot/{report_id}/markets.json`

### Purpose
List of all markets available for a given report. Drives the market picker UI and provides
the slug needed to construct the fetch URL for market data.

### When loaded
When the user selects a report. Replaced when the user switches reports.

### Schema

```json
[
  ["3-month-eurodollars-chicago-mercantile-exchange", "3-MONTH EURODOLLARS - CHICAGO MERCANTILE EXCHANGE"],
  ["2-year-u-s-treasury-notes-chicago-board-of-trade", "2-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE"],
  ...
]
```

Each entry is a `[slug, name]` tuple.

### Fields

| Index | Type | Description |
|-------|------|-------------|
| `[0]` | string | URL-safe slug; also the filename (without `.json`) for the market data file |
| `[1]` | string | Full market name as it appears in the CFTC data (`Market_and_Exchange_Names`) |

### Sorting
Entries are sorted ascending by market name (index `[1]`), so the UI can render the list
in alphabetical order without client-side sorting.

### How created

For each market in the parquet:
1. Take the `Market_and_Exchange_Names` value.
2. Slugify: `re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')`
3. Collect `[slug, name]` and sort by name.

Slugification produces unique, pure `[a-z0-9-]` identifiers for all known markets.
Verified collision-free for all 122 TFF markets.

---

## File: `public/cot/{report_id}/{market-slug}.json`

### Purpose
Complete time-series data for one market within one report. Contains all parties' position
data across all available weekly reporting dates. This is the primary data file for chart
rendering.

### When loaded
When the user selects a market. Stays loaded while the user switches parties or series.
Replaced when the user selects a different market or report.

### Schema

```json
{
  "meta": {
    "code": "064642",
    "name": "3-MONTH EURODOLLARS - CHICAGO MERCANTILE EXCHANGE"
  },
  "d":  [20230103, 20230110, 20230117, ...],
  "oi": [1234567,  1240000,  1250000,  ...],
  "p": [
    { "l": [...], "s": [...], "cl": [...], "cs": [...], "pl": [...], "ps": [...] },
    { "l": [...], "s": [...], "cl": [...], "cs": [...], "pl": [...], "ps": [...] },
    { "l": [...], "s": [...], "cl": [...], "cs": [...], "pl": [...], "ps": [...] },
    { "l": [...], "s": [...], "cl": [...], "cs": [...], "pl": [...], "ps": [...] },
    { "l": [...], "s": [...], "cl": [...], "cs": [...], "pl": [...], "ps": [...] }
  ]
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `meta.code` | string | `CFTC_Contract_Market_Code` — for reference/display only (not unique) |
| `meta.name` | string | `Market_and_Exchange_Names` — full market name |
| `d` | int[] | Dates as YYYYMMDD integers, ascending chronological order |
| `oi` | int[] | `Open_Interest_All` — total open interest, parallel to `d` |
| `p` | object[] | Party data array; `p[i]` corresponds to `parties[i]` in `index.json` |
| `p[i].l` | int[] | Long positions, parallel to `d` |
| `p[i].s` | int[] | Short positions, parallel to `d` |
| `p[i].cl` | int[] | Change in long positions from previous week, parallel to `d` |
| `p[i].cs` | int[] | Change in short positions from previous week, parallel to `d` |
| `p[i].pl` | float[] | Long positions as % of open interest, 1 decimal place, parallel to `d` |
| `p[i].ps` | float[] | Short positions as % of open interest, 1 decimal place, parallel to `d` |

### Derived series (computed client-side, not stored)

| Series | Derivation |
|--------|------------|
| Net positions | `p[i].l[t] - p[i].s[t]` |
| % net | `p[i].pl[t] - p[i].ps[t]` |

### Party index mapping

`p[i]` maps to `parties[i]` from `index.json` for the same report. The party index is
stable within a report across all market files.

Example for TFF:
- `p[0]` = Dealer Intermediary
- `p[1]` = Asset Manager/Institutional
- `p[2]` = Leveraged Funds
- `p[3]` = Other Reportables
- `p[4]` = Nonreportable Positions

### Invariants

All arrays under a market file have the same length (`len(d) == len(oi) == len(p[i].l) == ...`).

### Future extension: spread fields

When spreading data is needed, add optional keys `sp`, `csp`, `psp` to each party object.
Consumers must treat these as optional. For `prod_merc` in the Disaggregated report, these
keys must be absent (Producer/Merchant has no spreading per CFTC spec).

### How created

For each market in the parquet (group by `Market_and_Exchange_Names`):
1. Sort rows by `As_of_Date_In_Form_YYMMDD` ascending.
2. Convert YYMMDD date to YYYYMMDD: `int('20' + str(d).zfill(6))`
3. Extract `Open_Interest_All` as integer list.
4. For each party in `REPORT_CONFIGS[report_id]['parties']`, extract the 6 columns using the
   column mapping, applying type conversions (see below).
5. Collect `meta`, `d`, `oi`, `p` and write JSON.

### Type conversion rules

| Target field | Source column dtype | Conversion |
|---|---|---|
| `l`, `s` | int64 or object | `pd.to_numeric(s, errors='coerce').fillna(0).astype(int).tolist()` |
| `cl`, `cs` | object (string with whitespace) | `pd.to_numeric(s, errors='coerce').fillna(0).astype(int).tolist()` |
| `pl`, `ps` | float64 | `[round(float(v), 1) for v in s.fillna(0.0)]` |
| `oi` | int64 | `.astype(int).tolist()` |
| `d` (date) | int (YYMMDD) | `int('20' + str(d).zfill(6))` per row |

---

## REPORT_CONFIGS — transform.py Data Structure

The transform script is driven entirely by `REPORT_CONFIGS`. Adding a new report requires
only a new entry in this dict — no logic changes.

```python
REPORT_CONFIGS = {
    "tff": {
        "parquet":    "combined_tff.parquet",      # relative to python/ directory
        "report_type": "traders_in_financial_futures_fut",  # cot-reports library type ID
        "label":      "Traders in Financial Futures",
        "parties": [
            {
                "id": "dealer",
                "cols": {
                    "l":  "Dealer_Positions_Long_All",
                    "s":  "Dealer_Positions_Short_All",
                    "cl": "Change_in_Dealer_Long_All",
                    "cs": "Change_in_Dealer_Short_All",
                    "pl": "Pct_of_OI_Dealer_Long_All",
                    "ps": "Pct_of_OI_Dealer_Short_All",
                },
            },
            {
                "id": "asset_mgr",
                "cols": {
                    "l":  "Asset_Mgr_Positions_Long_All",
                    "s":  "Asset_Mgr_Positions_Short_All",
                    "cl": "Change_in_Asset_Mgr_Long_All",
                    "cs": "Change_in_Asset_Mgr_Short_All",
                    "pl": "Pct_of_OI_Asset_Mgr_Long_All",
                    "ps": "Pct_of_OI_Asset_Mgr_Short_All",
                },
            },
            {
                "id": "lev_money",
                "cols": {
                    "l":  "Lev_Money_Positions_Long_All",
                    "s":  "Lev_Money_Positions_Short_All",
                    "cl": "Change_in_Lev_Money_Long_All",
                    "cs": "Change_in_Lev_Money_Short_All",
                    "pl": "Pct_of_OI_Lev_Money_Long_All",
                    "ps": "Pct_of_OI_Lev_Money_Short_All",
                },
            },
            {
                "id": "other_rept",
                "cols": {
                    "l":  "Other_Rept_Positions_Long_All",
                    "s":  "Other_Rept_Positions_Short_All",
                    "cl": "Change_in_Other_Rept_Long_All",
                    "cs": "Change_in_Other_Rept_Short_All",
                    "pl": "Pct_of_OI_Other_Rept_Long_All",
                    "ps": "Pct_of_OI_Other_Rept_Short_All",
                },
            },
            {
                "id": "non_rept",
                "cols": {
                    "l":  "NonRept_Positions_Long_All",
                    "s":  "NonRept_Positions_Short_All",
                    "cl": "Change_in_NonRept_Long_All",
                    "cs": "Change_in_NonRept_Short_All",
                    "pl": "Pct_of_OI_NonRept_Long_All",
                    "ps": "Pct_of_OI_NonRept_Short_All",
                },
            },
        ],
    },

    "disagg": {
        "parquet":    "combined_disagg.parquet",   # requires download.py update
        "report_type": "disaggregated_fut",
        "label":      "Disaggregated Commitments of Traders",
        "parties": [
            {
                "id": "prod_merc",
                # NOTE: Producer/Merchant has NO spreading per CFTC spec
                "cols": {
                    "l":  "Prod_Merc_Positions_Long_All",
                    "s":  "Prod_Merc_Positions_Short_All",
                    "cl": "Change_in_Prod_Merc_Long_All",
                    "cs": "Change_in_Prod_Merc_Short_All",
                    "pl": "Pct_of_OI_Prod_Merc_Long_All",
                    "ps": "Pct_of_OI_Prod_Merc_Short_All",
                },
            },
            {
                "id": "swap",
                # Verify: Swap short col may be "Swap__Positions_Short_All" (double underscore)
                "cols": {
                    "l":  "Swap_Positions_Long_All",
                    "s":  "Swap__Positions_Short_All",
                    "cl": "Change_in_Swap_Long_All",
                    "cs": "Change_in_Swap_Short_All",
                    "pl": "Pct_of_OI_Swap_Long_All",
                    "ps": "Pct_of_OI_Swap_Short_All",
                },
            },
            {
                "id": "m_money",
                "cols": {
                    "l":  "M_Money_Positions_Long_All",
                    "s":  "M_Money_Positions_Short_All",
                    "cl": "Change_in_M_Money_Long_All",
                    "cs": "Change_in_M_Money_Short_All",
                    "pl": "Pct_of_OI_M_Money_Long_All",
                    "ps": "Pct_of_OI_M_Money_Short_All",
                },
            },
            {
                "id": "other_rept",
                "cols": {
                    "l":  "Other_Rept_Positions_Long_All",
                    "s":  "Other_Rept_Positions_Short_All",
                    "cl": "Change_in_Other_Rept_Long_All",
                    "cs": "Change_in_Other_Rept_Short_All",
                    "pl": "Pct_of_OI_Other_Rept_Long_All",
                    "ps": "Pct_of_OI_Other_Rept_Short_All",
                },
            },
            {
                "id": "non_rept",
                "cols": {
                    "l":  "NonRept_Positions_Long_All",
                    "s":  "NonRept_Positions_Short_All",
                    "cl": "Change_in_NonRept_Long_All",
                    "cs": "Change_in_NonRept_Short_All",
                    "pl": "Pct_of_OI_NonRept_Long_All",
                    "ps": "Pct_of_OI_NonRept_Short_All",
                },
            },
        ],
    },
}
```

---

## Adding a New Report Type

1. Update `python/download.py` to download the new report and save it as
   `python/combined_{report_id}.parquet` (e.g. `combined_tff.parquet`, `combined_disagg.parquet`).

2. Add a new entry to `REPORT_CONFIGS` in `python/transform.py`:
   - Set `parquet` to the new parquet filename.
   - Set `report_type` to the `cot-reports` library type string.
   - Set `label` to the display name.
   - Define `parties` with the correct column mapping (verify exact column names from parquet).

3. Run `python/transform.py`. It will:
   - Create `public/cot/{report_id}/markets.json`
   - Create `public/cot/{report_id}/{slug}.json` for each market
   - Rebuild `public/cot/index.json` with the new report included

No web app code changes are needed to support new reports — `index.json` is the single source
of truth for what reports and parties are available.

---

## File Size Reference

For the TFF report (122 markets, ~160 weekly observations, 5 parties):
- Individual market file: 347 bytes (min) to ~34 KB (max), median ~10 KB
- All market files combined: ~1.75 MB uncompressed, ~400–500 KB gzip
- `markets.json`: ~7 KB
- `index.json`: ~440 bytes

# CFTC Commitments of Traders — Report Formats and Column Schemas

Reference document compiled from the official CFTC COT report pages and explanatory notes
(https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm).

---

## Program Overview

The CFTC publishes Commitments of Traders (COT) reports weekly (released Fridays at 3:30 PM ET,
reflecting Tuesday's open interest). A report is published for a market only when 20 or more
traders hold positions at or above the CFTC reporting thresholds.

All reports come in two position formats:
- **Futures Only** — futures positions only
- **Futures-and-Options Combined** — options converted to futures-equivalent using delta factors

All reports come in two data formats:
- **Short format** — positions, changes from previous report, % of open interest, trader counts
- **Long format** — everything in short format + nonreportable positions + crop year breakdown
  (where applicable) + concentration ratios for the largest 4 and 8 traders

Historical data availability: Legacy reports back to January 1986; Disaggregated and TFF back
to June 13, 2006.

---

## Report Types

### 1. Legacy Futures Only (`legacy_fut`)

**Historical start:** January 15, 1986  
**Historical bulk file:** `deacot1986_2016.zip`  
**Annual file pattern:** `deacot{YEAR}.zip`  
**Columns:** 129  
**Variants:** All, Old, Other  

**Trader categories:**
- Noncommercial — all reportable traders NOT using futures for hedging
- Commercial — traders using futures to manage/hedge business risks (includes swap dealers)
- Total Reportable
- Nonreportable (derived)

**Position fields per category:** Long, Short, Spreading (except Nonreportable: Long, Short only)

**Note:** Swap dealers are lumped into "Commercial" in the Legacy report. The Disaggregated
report was created specifically to separate them out.

---

### 2. Legacy Futures and Options (`legacy_futopt`)

**Historical start:** 1995  
**Historical bulk file:** `deahistfo_1995_2016.zip`  
**Annual file pattern:** `deahistfo{YEAR}.zip`  
**Columns:** 129  

Identical structure to Legacy Futures Only, but options converted to futures-equivalent.

---

### 3. Supplemental Futures and Options (`supplemental_futopt`)

**Historical start:** 2006  
**Historical bulk file:** `dea_cit_txt_2006_2016.zip`  
**Annual file pattern:** `dea_cit_txt_{YEAR}.zip`  
**Columns:** 54  
**Coverage:** 13 select agricultural commodity contracts only  

**Trader categories:**
- Noncommercial
- Commercial
- Index Traders (CIT) — a distinct category tracking commodity index investors

**Short format only.**

---

### 4. Disaggregated Futures Only (`disaggregated_fut`) ★ In use

**Historical start:** June 13, 2006  
**Historical bulk file:** `fut_disagg_txt_hist_2006_2016.zip`  
**Annual file pattern:** `fut_disagg_txt_{YEAR}.zip`  
**Columns:** 191  
**Variants per party:** All, Old, Other  
**Coverage:** Physical commodity markets (agriculture, petroleum, natural gas, electricity, metals)

**Trader categories (official CFTC names):**

| # | Official Name | Description |
|---|---------------|-------------|
| 1 | Producer/Merchant/Processor/User | Entity engaged in production, processing, packing, or handling of a physical commodity; uses futures to manage/hedge business risks |
| 2 | Swap Dealers | Entity that deals primarily in swaps for a commodity; uses futures to manage/hedge swap risk; counterparties may be speculators or commercial clients |
| 3 | Managed Money | Registered CTA, registered CPO, or unregistered fund (including hedge funds); manages organized futures trading on behalf of clients |
| 4 | Other Reportables | Every reportable trader not placed in the above three categories |
| — | Nonreportable Positions | Derived: total open interest minus total reportable long/short |

**Spreading availability:**
- Producer/Merchant/Processor/User: **NO spreading** (long and short only)
- Swap Dealers: long, short, spreading
- Managed Money: long, short, spreading
- Other Reportables: long, short, spreading

**Context:** The Disaggregated report was introduced in 2009 to increase transparency over the
Legacy report. "Commercial" was split into Producer/Merchant and Swap Dealers; "Non-commercial"
was split into Managed Money and Other Reportables.

---

### 5. Disaggregated Futures and Options (`disaggregated_futopt`)

**Historical bulk file:** `com_disagg_txt_hist_2006_2016.zip`  
**Annual file pattern:** `com_disagg_txt_{YEAR}.zip`  
**Columns:** 191  

Identical structure to Disaggregated Futures Only but options are converted to futures-equivalent.

---

### 6. Traders in Financial Futures — Futures Only (`traders_in_financial_futures_fut`) ★ In use

**Historical start:** June 13, 2006  
**Historical bulk file:** `fin_fut_txt_2006_2016.zip`  
**Annual file pattern:** `fut_fin_txt_{YEAR}.zip`  
**Columns:** 87  
**Long format only** (no short format available)  
**Coverage:** Financial contracts — currencies, US Treasury securities, Eurodollars, stock index
futures, VIX, Bloomberg commodity index

**Trader categories (official CFTC names from published reports):**

| # | Official Name | Parquet column prefix | Description |
|---|---------------|----------------------|-------------|
| 1 | Dealer Intermediary | `Dealer_` | Sell-side financial institutions; make markets and facilitate transactions for clients |
| 2 | Asset Manager/Institutional | `Asset_Mgr_` | Buy-side institutional investors: pension funds, endowments, insurance companies, mutual funds |
| 3 | Leveraged Funds | `Lev_Money_` | Hedge funds and various money managers trading for speculative purposes or to hedge fund strategies; registered CTAs and CPOs |
| 4 | Other Reportables | `Other_Rept_` | Every other reportable trader not in the above three categories |
| — | Nonreportable Positions | `NonRept_` | Derived: total open interest minus total reportable long/short |

**Important naming note:** The official CFTC report label is "Leveraged Funds" but the parquet
column prefix is `Lev_Money_`. The `cot-reports` Python library uses this prefix. The CFTC
also sometimes refers to this category as "Leveraged Money" in older documentation.

All 4 reportable categories have long, short, and spreading positions.

---

### 7. Traders in Financial Futures — Futures and Options (`traders_in_financial_futures_futopt`)

**Historical bulk file:** `fin_com_txt_2006_2016.zip`  
**Annual file pattern:** `com_fin_txt_{YEAR}.zip`  
**Columns:** 87  

Identical structure to TFF Futures Only but options are converted to futures-equivalent.

---

## Detailed Column Schema: TFF Futures Only

Source: `python/combined.parquet` (87 columns, MultiIndex on `[Market_and_Exchange_Names, As_of_Date_In_Form_YYMMDD]`)

### Identifiers

| Column | Type | Notes |
|--------|------|-------|
| `Market_and_Exchange_Names` | string (index) | Full market name, e.g. "3-MONTH EURODOLLARS - CHICAGO MERCANTILE EXCHANGE" |
| `As_of_Date_In_Form_YYMMDD` | int (index) | Date as 6-digit integer YYMMDD, e.g. 230103 for Jan 3, 2023 |
| `Report_Date_as_YYYY-MM-DD` | string | ISO date string |
| `CFTC_Contract_Market_Code` | string | Exchange contract code — **NOT unique** across markets (108 unique codes for 122 markets) |
| `CFTC_Market_Code` | string | |
| `CFTC_Region_Code` | string | |
| `CFTC_Commodity_Code` | string | |
| `CFTC_Contract_Market_Code_Quotes` | string | |
| `CFTC_Market_Code_Quotes` | string | |
| `CFTC_Commodity_Code_Quotes` | string | |
| `CFTC_SubGroup_Code` | string | |
| `FutOnly_or_Combined` | string | "FutOnly" or "Combined" |
| `Contract_Units` | string | Contract size/unit description |

### Open Interest

| Column | Type |
|--------|------|
| `Open_Interest_All` | int |

### Positions (per party)

Pattern: `{Party}_Positions_{Direction}_All`

| Party prefix | Long | Short | Spread |
|---|---|---|---|
| `Dealer` | `Dealer_Positions_Long_All` | `Dealer_Positions_Short_All` | `Dealer_Positions_Spread_All` |
| `Asset_Mgr` | `Asset_Mgr_Positions_Long_All` | `Asset_Mgr_Positions_Short_All` | `Asset_Mgr_Positions_Spread_All` |
| `Lev_Money` | `Lev_Money_Positions_Long_All` | `Lev_Money_Positions_Short_All` | `Lev_Money_Positions_Spread_All` |
| `Other_Rept` | `Other_Rept_Positions_Long_All` | `Other_Rept_Positions_Short_All` | `Other_Rept_Positions_Spread_All` |
| `Tot_Rept` | `Tot_Rept_Positions_Long_All` | `Tot_Rept_Positions_Short_All` | — |
| `NonRept` | `NonRept_Positions_Long_All` | `NonRept_Positions_Short_All` | — |

### Changes in Positions (week-over-week)

Pattern: `Change_in_{Party}_{Direction}_All`

| Party | Change Long | Change Short | Change Spread |
|---|---|---|---|
| `Dealer` | `Change_in_Dealer_Long_All` | `Change_in_Dealer_Short_All` | `Change_in_Dealer_Spread_All` |
| `Asset_Mgr` | `Change_in_Asset_Mgr_Long_All` | `Change_in_Asset_Mgr_Short_All` | `Change_in_Asset_Mgr_Spread_All` |
| `Lev_Money` | `Change_in_Lev_Money_Long_All` | `Change_in_Lev_Money_Short_All` | `Change_in_Lev_Money_Spread_All` |
| `Other_Rept` | `Change_in_Other_Rept_Long_All` | `Change_in_Other_Rept_Short_All` | `Change_in_Other_Rept_Spread_All` |
| `Tot_Rept` | `Change_in_Tot_Rept_Long_All` | `Change_in_Tot_Rept_Short_All` | — |
| `NonRept` | `Change_in_NonRept_Long_All` | `Change_in_NonRept_Short_All` | — |
| `Open_Interest` | `Change_in_Open_Interest_All` | — | — |

**Data type gotcha:** Change columns are stored as `object` dtype (strings with leading whitespace,
e.g. `'       0'`) in the parquet. Must convert with:
```python
pd.to_numeric(series, errors='coerce').fillna(0).astype(int)
```

### Percent of Open Interest

Pattern: `Pct_of_OI_{Party}_{Direction}_All`

| Party | Pct Long | Pct Short | Pct Spread |
|---|---|---|---|
| `Dealer` | `Pct_of_OI_Dealer_Long_All` | `Pct_of_OI_Dealer_Short_All` | `Pct_of_OI_Dealer_Spread_All` |
| `Asset_Mgr` | `Pct_of_OI_Asset_Mgr_Long_All` | `Pct_of_OI_Asset_Mgr_Short_All` | `Pct_of_OI_Asset_Mgr_Spread_All` |
| `Lev_Money` | `Pct_of_OI_Lev_Money_Long_All` | `Pct_of_OI_Lev_Money_Short_All` | `Pct_of_OI_Lev_Money_Spread_All` |
| `Other_Rept` | `Pct_of_OI_Other_Rept_Long_All` | `Pct_of_OI_Other_Rept_Short_All` | `Pct_of_OI_Other_Rept_Spread_All` |
| `Tot_Rept` | `Pct_of_OI_Tot_Rept_Long_All` | `Pct_of_OI_Tot_Rept_Short_All` | — |
| `NonRept` | `Pct_of_OI_NonRept_Long_All` | `Pct_of_OI_NonRept_Short_All` | — |
| Total | `Pct_of_Open_Interest_All` | — | — |

**Precision:** Values have 1 decimal place as provided by CFTC.

### Number of Traders

Pattern: `Traders_{Party}_{Direction}_All`

| Party | Long | Short | Spread |
|---|---|---|---|
| `Dealer` | `Traders_Dealer_Long_All` | `Traders_Dealer_Short_All` | `Traders_Dealer_Spread_All` |
| `Asset_Mgr` | `Traders_Asset_Mgr_Long_All` | `Traders_Asset_Mgr_Short_All` | `Traders_Asset_Mgr_Spread_All` |
| `Lev_Money` | `Traders_Lev_Money_Long_All` | `Traders_Lev_Money_Short_All` | `Traders_Lev_Money_Spread_All` |
| `Other_Rept` | `Traders_Other_Rept_Long_All` | `Traders_Other_Rept_Short_All` | `Traders_Other_Rept_Spread_All` |
| `Tot_Rept` | `Traders_Tot_Rept_Long_All` | `Traders_Tot_Rept_Short_All` | — |
| Total | `Traders_Tot_All` | — | — |

Note: A trader may be counted in multiple categories (e.g., both outright long and spreading),
so category totals can exceed the total trader count. When fewer than 4 traders hold positions
in a category, the trader count is suppressed in the published report.

### Concentration Ratios (long format only)

| Column | Description |
|--------|-------------|
| `Conc_Gross_LE_4_TDR_Long_All` | Gross long concentration: % held by 4 largest traders |
| `Conc_Gross_LE_4_TDR_Short_All` | Gross short concentration: % held by 4 largest traders |
| `Conc_Gross_LE_8_TDR_Long_All` | Gross long concentration: % held by 8 largest traders |
| `Conc_Gross_LE_8_TDR_Short_All` | Gross short concentration: % held by 8 largest traders |
| `Conc_Net_LE_4_TDR_Long_All` | Net long concentration: % held by 4 largest traders |
| `Conc_Net_LE_4_TDR_Short_All` | Net short concentration: % held by 4 largest traders |
| `Conc_Net_LE_8_TDR_Long_All` | Net long concentration: % held by 8 largest traders |
| `Conc_Net_LE_8_TDR_Short_All` | Net short concentration: % held by 8 largest traders |

---

## Detailed Column Schema: Disaggregated Futures Only

Source: `python/combined_disagg.parquet` (191 columns, to be downloaded).  
The Disaggregated report has more columns than TFF because it includes "Old" and "Other" crop
year variants for some position fields.

### Key differences from TFF schema

1. **Producer/Merchant has no spreading.** Only Swap Dealers, Managed Money, and Other
   Reportables have spreading fields.
2. **Three position variants:** `_All`, `_Old`, `_Other` — where "Old" is the front/nearby
   crop year and "Other" is deferred crop years.
3. **Different party prefixes** (see below).

### Expected column prefixes (verify against actual parquet once downloaded)

| Party key | Parquet prefix | Official name |
|---|---|---|
| `prod_merc` | `Prod_Merc_` | Producer/Merchant/Processor/User |
| `swap` | `Swap_` | Swap Dealers |
| `m_money` | `M_Money_` | Managed Money |
| `other_rept` | `Other_Rept_` | Other Reportables |
| `non_rept` | `NonRept_` | Nonreportable Positions (derived) |

### Expected position columns

| Party | Long | Short | Spread |
|---|---|---|---|
| `Prod_Merc` | `Prod_Merc_Positions_Long_All` | `Prod_Merc_Positions_Short_All` | **none** |
| `Swap` | `Swap_Positions_Long_All` | `Swap_Positions_Short_All` | `Swap_Positions_Spread_All` |
| `M_Money` | `M_Money_Positions_Long_All` | `M_Money_Positions_Short_All` | `M_Money_Positions_Spread_All` |
| `Other_Rept` | `Other_Rept_Positions_Long_All` | `Other_Rept_Positions_Short_All` | `Other_Rept_Positions_Spread_All` |
| `NonRept` | `NonRept_Positions_Long_All` | `NonRept_Positions_Short_All` | — |

### Expected change columns

| Party | Change Long | Change Short | Change Spread |
|---|---|---|---|
| `Prod_Merc` | `Change_in_Prod_Merc_Long_All` | `Change_in_Prod_Merc_Short_All` | **none** |
| `Swap` | `Change_in_Swap_Long_All` | `Change_in_Swap_Short_All` | `Change_in_Swap_Spread_All` |
| `M_Money` | `Change_in_M_Money_Long_All` | `Change_in_M_Money_Short_All` | `Change_in_M_Money_Spread_All` |
| `Other_Rept` | `Change_in_Other_Rept_Long_All` | `Change_in_Other_Rept_Short_All` | `Change_in_Other_Rept_Spread_All` |
| `NonRept` | `Change_in_NonRept_Long_All` | `Change_in_NonRept_Short_All` | — |

### Expected % of OI columns

Pattern: `Pct_of_OI_{Party}_{Direction}_All` — same as TFF but with Disaggregated party prefixes.

**Caution:** The `Swap` prefix may have an inconsistent double underscore in some columns
(e.g., `Swap__Positions_Short_All`). Verify against the actual parquet when downloaded.

---

## Data Quirks and Gotchas

1. **`CFTC_Contract_Market_Code` is not unique.** 122 TFF markets share only 108 unique codes.
   Three codes contain `+` which is not URL-safe. Never use as a file key.

2. **Change columns are string dtype** in the parquet (stored as text with leading whitespace
   from the original CFTC CSV). Always convert via `pd.to_numeric(errors='coerce').fillna(0)`.

3. **Date format is YYMMDD** in the index (`As_of_Date_In_Form_YYMMDD`), not YYYYMMDD.
   Convert to YYYYMMDD by prepending `20` (valid for all data from 2006 onward).

4. **Pct columns have exactly 1 decimal place** as provided by the CFTC source.

5. **Trader count suppression:** When fewer than 4 traders hold positions in a category for a
   given market, CFTC suppresses the trader count (shows `·` in published report). In the
   parquet this may appear as null/NaN.

6. **"Leveraged Funds" vs "Leveraged Money":** The official CFTC published report header says
   "Leveraged Funds" but the parquet column prefix is `Lev_Money_` (from the `cot-reports`
   library). Both refer to the same category.

7. **Backcasting limitation:** Historical data (back to 2006) was classified using recent
   trader classifications applied retroactively. Accuracy decreases further back in time.

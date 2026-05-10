from datetime import date
import pandas as pd
from cot_reports import cot_year

current_year = date.today().year
years = range(current_year - 3, current_year + 1)

REPORTS = [
    ("traders_in_financial_futures_fut", "combined_tff.parquet"),
    ("disaggregated_fut",               "combined_disagg.parquet"),
]

for report_type, output_file in REPORTS:
    print(f"\n=== Downloading {report_type} ===")
    frames = []
    for year in years:
        print(f"  Year {year}")
        df = cot_year(year=year, cot_report_type=report_type, store_txt=True)
        frames.append(df)

    combined = (
        pd.concat(frames)
        .drop_duplicates(
            subset=["Market_and_Exchange_Names", "As_of_Date_In_Form_YYMMDD"],
            keep="last",
        )
        .sort_values(["Market_and_Exchange_Names", "As_of_Date_In_Form_YYMMDD"])
        .set_index(["Market_and_Exchange_Names", "As_of_Date_In_Form_YYMMDD"])
    )

    # CFTC uses "." for suppressed/missing values in these string columns; convert to 0
    for prefix in ("Traders_", "Change_in_"):
        for col in [c for c in combined.columns if c.startswith(prefix)]:
            combined[col] = (
                pd.to_numeric(combined[col].astype(str).str.strip(), errors="coerce")
                .fillna(0)
                .astype("int64")
            )

    # Per-market forward fill for snapshot columns (positions, OI, percentages, concentration)
    ffill_cols = [
        c for c in combined.columns
        if any(c.startswith(p) for p in ("Positions_", "Pct_of_OI_", "Conc_"))
        or c == "Open_Interest_All"
    ]
    combined[ffill_cols] = combined.groupby(level=0)[ffill_cols].ffill()

    print(f"  Saving to {output_file} ({len(combined)} rows, {len(combined.columns)} columns)")
    combined.to_parquet(output_file)
    print(f"  Saved.")

import json
import re
from pathlib import Path

import pandas as pd

SCRIPT_DIR = Path(__file__).parent
PUBLIC_COT = SCRIPT_DIR.parent / "public" / "cot"

REPORT_CONFIGS = {
    "tff": {
        "parquet": "combined_tff.parquet",
        "label": "Traders in Financial Futures",
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
        "parquet": "combined_disagg.parquet",
        "label": "Disaggregated Commitments of Traders",
        "parties": [
            {
                "id": "prod_merc",
                # Producer/Merchant has NO spreading per CFTC spec
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
                # Swap short col may be "Swap__Positions_Short_All" (double underscore) — verify
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

# Official CFTC party labels, keyed by party id
PARTY_LABELS = {
    "dealer":     "Dealer Intermediary",
    "asset_mgr":  "Asset Manager/Institutional",
    "lev_money":  "Leveraged Funds",
    "other_rept": "Other Reportables",
    "non_rept":   "Nonreportable Positions",
    "prod_merc":  "Producer/Merchant/Processor/User",
    "swap":       "Swap Dealers",
    "m_money":    "Managed Money",
}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def to_int_list(series: pd.Series) -> list:
    return pd.to_numeric(series, errors="coerce").fillna(0).astype(int).tolist()


def to_float1_list(series: pd.Series) -> list:
    return [round(float(v), 1) for v in pd.to_numeric(series, errors="coerce").fillna(0.0)]


def yymmdd_to_yyyymmdd(d: int) -> int:
    return int("20" + str(d).zfill(6))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))


def transform_report(report_id: str, config: dict):
    parquet_path = SCRIPT_DIR / config["parquet"]
    if not parquet_path.exists():
        print(f"  Skipping {report_id}: {parquet_path.name} not found")
        return None

    print(f"  Loading {parquet_path.name}")
    df = pd.read_parquet(parquet_path)
    df = df.reset_index()

    out_dir = PUBLIC_COT / report_id
    markets_list = []

    market_names = sorted(df["Market_and_Exchange_Names"].unique())
    print(f"  Processing {len(market_names)} markets")

    for market_name in market_names:
        slug = slugify(market_name)
        markets_list.append([slug, market_name])

        mdf = (
            df[df["Market_and_Exchange_Names"] == market_name]
            .sort_values("As_of_Date_In_Form_YYMMDD")
            .reset_index(drop=True)
        )

        dates = [yymmdd_to_yyyymmdd(d) for d in mdf["As_of_Date_In_Form_YYMMDD"]]
        oi = to_int_list(mdf["Open_Interest_All"])
        code = str(mdf["CFTC_Contract_Market_Code"].iloc[0])

        parties = []
        for party in config["parties"]:
            c = party["cols"]
            parties.append({
                "l":  to_int_list(mdf[c["l"]]),
                "s":  to_int_list(mdf[c["s"]]),
                "cl": to_int_list(mdf[c["cl"]]),
                "cs": to_int_list(mdf[c["cs"]]),
                "pl": to_float1_list(mdf[c["pl"]]),
                "ps": to_float1_list(mdf[c["ps"]]),
            })

        payload = {
            "meta": {"code": code, "name": market_name},
            "d": dates,
            "oi": oi,
            "p": parties,
        }
        write_json(out_dir / f"{slug}.json", payload)

    write_json(out_dir / "markets.json", markets_list)
    print(f"  Written {len(markets_list)} market files + markets.json")
    return markets_list


def build_index() -> list:
    index = []
    for report_id, config in REPORT_CONFIGS.items():
        parties = [
            [p["id"], PARTY_LABELS[p["id"]]]
            for p in config["parties"]
        ]
        index.append({
            "id": report_id,
            "label": config["label"],
            "parties": parties,
        })
    return index


def main():
    PUBLIC_COT.mkdir(parents=True, exist_ok=True)

    for report_id, config in REPORT_CONFIGS.items():
        print(f"\n=== {report_id} ===")
        transform_report(report_id, config)

    index = build_index()
    write_json(PUBLIC_COT / "index.json", index)
    print(f"\nWritten index.json with {len(index)} report(s)")


if __name__ == "__main__":
    main()

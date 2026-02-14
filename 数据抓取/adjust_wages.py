"""
Real-World Wage Adjuster
========================
Adds 'real_wage' and 'real_index' fields to rpp_final.json to simulate
the harsh reality of low-income workers (10-12 hr days, ~2000-2500 RMB/month).

Formula:
    real_wage  = official_wage * 0.45
    real_index = real_wage / basket_price
"""

import json
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "public" / "data" / "rpp_final.json"
WAGE_MULTIPLIER = 0.45


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"📂 Loaded {len(data)} provinces from {DATA_PATH}\n")
    print(f"  {'Province':<8}  {'Wage':>6} → {'Real':>6}  {'Index':>6} → {'Real':>6}")
    print(f"  {'─' * 8}  {'─' * 6}   {'─' * 6}  {'─' * 6}   {'─' * 6}")

    for item in data:
        item["real_wage"] = round(item["wage"] * WAGE_MULTIPLIER, 2)
        item["real_index"] = round(item["real_wage"] / item["basket_price"], 2)

    # Sort by real_index descending
    data.sort(key=lambda x: x["real_index"], reverse=True)

    for item in data:
        print(
            f"  {item['name']:<8}"
            f"  ¥{item['wage']:>5.1f} → ¥{item['real_wage']:>5.2f}"
            f"  {item['index']:>6.2f} → {item['real_index']:>6.2f}"
        )

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Updated {DATA_PATH}")
    print(f"   Added fields: real_wage, real_index (multiplier: {WAGE_MULTIPLIER})")


if __name__ == "__main__":
    main()

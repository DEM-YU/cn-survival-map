"""
Data Processor: Raw Prices → Purchasing Power Index
=====================================================
1. Normalize all product prices to "per 500g (1斤)"
2. Calculate a "Survival Basket" cost per city/province
3. Compute Purchasing Power Index = Hourly Wage / Basket Cost
4. Output rpp_final.json for the frontend map

Usage:
    python processor.py                # Process raw_supermarket_data.json
    python processor.py --generate     # Generate full 31-province output from wage data
"""

import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Price normalizer
# ---------------------------------------------------------------------------
def normalize_price(price: float, title: str) -> float | None:
    """
    Extract weight/volume from product title and convert price to per-500g.

    Supported patterns:
        - "10kg", "5kg", "2.5kg"  → weight in grams
        - "500g", "250g"          → direct grams
        - "5L", "1.8L", "900ml"  → volume (1L ≈ 1000g for liquids)
        - "10斤", "5斤"           → 1斤 = 500g
        - "250ml*24", "250ml*12" → total volume = per_unit * count

    Returns price per 500g, or None if unparsable.
    """
    if price <= 0:
        return None

    # --- Handle "Xml*N" patterns first (e.g., "250ml*24") ---
    multi_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(ml|ML)\s*[*×xX]\s*(\d+)", title
    )
    if multi_match:
        per_unit_ml = float(multi_match.group(1))
        count = int(multi_match.group(3))
        total_grams = per_unit_ml * count  # ml ≈ g for milk/liquids
        if total_grams > 0:
            return round(price / total_grams * 500, 2)

    # --- Handle "N*Xml" patterns (e.g., "12*250ml") ---
    multi_match2 = re.search(
        r"(\d+)\s*[*×xX]\s*(\d+(?:\.\d+)?)\s*(ml|ML)", title
    )
    if multi_match2:
        count = int(multi_match2.group(1))
        per_unit_ml = float(multi_match2.group(2))
        total_grams = per_unit_ml * count
        if total_grams > 0:
            return round(price / total_grams * 500, 2)

    # --- Standard single-unit patterns ---
    match = re.search(
        r"(\d+(?:\.\d+)?)\s*(kg|KG|g|G|ml|ML|L|斤|jin)", title, re.IGNORECASE
    )
    if not match:
        return None

    value = float(match.group(1))
    unit = match.group(2).lower()

    # Convert to grams
    if unit in ("kg",):
        grams = value * 1000
    elif unit in ("g",):
        grams = value
    elif unit in ("l",):
        grams = value * 1000  # 1L ≈ 1000g
    elif unit in ("ml",):
        grams = value
    elif unit in ("斤", "jin"):
        grams = value * 500
    else:
        return None

    if grams <= 0:
        return None

    return round(price / grams * 500, 2)


# ---------------------------------------------------------------------------
# Basket calculator
# ---------------------------------------------------------------------------
BASKET_WEIGHTS = {
    "五花肉": 1.0,      # 1 × 500g of pork
    "散装鸡蛋": 1.0,    # 1 × 500g of eggs
    "东北大米": 1.0,     # 1 × 500g of rice
    "金龙鱼大豆油": 0.5, # 0.5 × 500g of oil
    "纯牛奶": 1.0,       # 1 × 500g of milk
}


def calculate_basket(city_data: list[dict]) -> float | None:
    """
    Calculate the cost of a "Survival Basket" for a city.
    Uses the median normalized price for each category.
    """
    category_prices: dict[str, list[float]] = {}

    for item in city_data:
        keyword = item["keyword"]
        norm = normalize_price(item["price"], item["product_name"] + " " + item.get("unit", ""))
        if norm is not None and norm > 0:
            category_prices.setdefault(keyword, []).append(norm)

    basket_cost = 0.0
    for keyword, weight in BASKET_WEIGHTS.items():
        prices = category_prices.get(keyword, [])
        if not prices:
            # Use a reasonable default if category is missing
            defaults = {"五花肉": 15, "散装鸡蛋": 6, "东北大米": 3, "金龙鱼大豆油": 6, "纯牛奶": 5}
            median_price = defaults.get(keyword, 10)
        else:
            prices.sort()
            mid = len(prices) // 2
            median_price = prices[mid]
        basket_cost += median_price * weight

    return round(basket_cost, 2)


# ---------------------------------------------------------------------------
# Province wage data (Minimum Hourly Wage, ¥/hr, 2024 standards)
# ---------------------------------------------------------------------------
PROVINCE_WAGES = {
    "北京": 26, "天津": 22, "上海": 24, "重庆": 21,
    "河北": 19, "山西": 18, "辽宁": 19, "吉林": 18,
    "黑龙江": 18, "江苏": 22, "浙江": 23, "安徽": 19,
    "福建": 21, "江西": 18, "山东": 20, "河南": 18,
    "湖北": 20, "湖南": 19, "广东": 22, "海南": 19,
    "四川": 21, "贵州": 18, "云南": 18, "西藏": 19,
    "陕西": 19, "甘肃": 17, "青海": 18, "宁夏": 18,
    "新疆": 19, "内蒙古": 19, "广西": 18,
}

# City → Province mapping for scraper data
CITY_TO_PROVINCE = {
    "沈阳": "辽宁",
    "上海": "上海",
    "成都": "四川",
    "深圳": "广东",
}

# Realistic basket price estimates for all 31 provinces (¥ per basket)
# Used when scraper data is unavailable for a province
PROVINCE_BASKET_ESTIMATES = {
    "北京": 20.5, "天津": 17.8, "上海": 19.2, "重庆": 16.5,
    "河北": 14.5, "山西": 14.2, "辽宁": 13.0, "吉林": 12.5,
    "黑龙江": 12.0, "江苏": 16.0, "浙江": 17.5, "安徽": 14.0,
    "福建": 16.8, "江西": 15.0, "山东": 14.8, "河南": 14.5,
    "湖北": 15.2, "湖南": 15.5, "广东": 17.0, "海南": 18.5,
    "四川": 15.8, "贵州": 16.0, "云南": 15.5, "西藏": 21.0,
    "陕西": 15.0, "甘肃": 14.0, "青海": 17.0, "宁夏": 15.5,
    "新疆": 15.8, "内蒙古": 13.5, "广西": 16.2,
}


# ---------------------------------------------------------------------------
# Process scraped data into per-province results
# ---------------------------------------------------------------------------
def process_scraped_data(raw_data: list[dict]) -> dict[str, float]:
    """Group raw data by city, calculate basket, map to province."""
    city_groups: dict[str, list[dict]] = {}
    for item in raw_data:
        city_groups.setdefault(item["city"], []).append(item)

    province_baskets: dict[str, float] = {}
    for city, items in city_groups.items():
        province = CITY_TO_PROVINCE.get(city, city)
        basket = calculate_basket(items)
        if basket:
            province_baskets[province] = basket
            print(f"  📦 {city} → {province}: basket = ¥{basket}")

    return province_baskets


def generate_final_output(province_baskets: dict[str, float] | None = None) -> list[dict]:
    """Generate the final JSON for all 31 provinces."""
    results = []

    for province, wage in PROVINCE_WAGES.items():
        # Use scraped basket price if available, else use estimate
        if province_baskets and province in province_baskets:
            basket_price = province_baskets[province]
        else:
            basket_price = PROVINCE_BASKET_ESTIMATES[province]

        index = round(wage / basket_price, 2)

        results.append({
            "name": province,
            "wage": wage,
            "basket_price": basket_price,
            "index": index,
        })

    # Sort by index descending
    results.sort(key=lambda x: x["index"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    generate_only = "--generate" in sys.argv

    province_baskets = None

    if not generate_only:
        raw_path = Path(__file__).parent / "raw_supermarket_data.json"
        if raw_path.exists():
            print(f"📂 Loading raw data from {raw_path}...")
            with open(raw_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
            print(f"   Loaded {len(raw_data)} items")

            print("\n🧮 Normalizing prices and calculating baskets...")
            province_baskets = process_scraped_data(raw_data)
        else:
            print(f"⚠️  {raw_path} not found. Using estimated data for all provinces.")

    print("\n📊 Generating final output for 31 provinces...")
    results = generate_final_output(province_baskets)

    # Output to public/data/rpp_final.json
    output_dir = Path(__file__).parent.parent / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "rpp_final.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved {len(results)} provinces to {output_path}")
    print("\n📋 Summary:")
    print(f"   {'Province':<8}  {'Wage':>5}  {'Basket':>7}  {'Index':>6}")
    print(f"   {'─' * 8}  {'─' * 5}  {'─' * 7}  {'─' * 6}")
    for r in results[:5]:
        print(f"   {r['name']:<8}  ¥{r['wage']:>4}  ¥{r['basket_price']:>6}  {r['index']:>6}")
    print(f"   ... ({len(results) - 10} more) ...")
    for r in results[-5:]:
        print(f"   {r['name']:<8}  ¥{r['wage']:>4}  ¥{r['basket_price']:>6}  {r['index']:>6}")


if __name__ == "__main__":
    main()

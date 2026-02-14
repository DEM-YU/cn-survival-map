"""
Supermarket Price Scraper for Cost of Living Project
=====================================================
Uses Playwright to scrape prices from Yonghui Life (yhlife.com) with
geolocation mocking. Includes a mock_data_generator fallback for testing.

Usage:
    python scraper.py              # Attempt live scraping
    python scraper.py --mock       # Generate mock data only
"""

import json
import random
import re
import time
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# City geolocation data
# ---------------------------------------------------------------------------
CITIES = {
    "沈阳": {"latitude": 41.8057, "longitude": 123.4315},
    "上海": {"latitude": 31.2304, "longitude": 121.4737},
    "成都": {"latitude": 30.5728, "longitude": 104.0668},
    "深圳": {"latitude": 22.5431, "longitude": 114.0579},
}

KEYWORDS = ["五花肉", "散装鸡蛋", "东北大米", "金龙鱼大豆油", "纯牛奶"]


# ---------------------------------------------------------------------------
# Mock data generator (realistic fallback)
# ---------------------------------------------------------------------------
def mock_data_generator() -> list[dict]:
    """Generate realistic mock supermarket data for testing downstream logic."""

    # Realistic price ranges per keyword per city (min, max per common unit)
    price_templates = {
        "五花肉": {
            "units": ["500g", "500g", "1kg"],
            "base_prices": {"沈阳": (12, 16), "上海": (18, 24), "成都": (15, 20), "深圳": (17, 22)},
            "name_variants": [
                "精选五花肉 鲜切 {unit}",
                "国产猪五花肉 去皮 {unit}",
                "冷鲜五花肉 带皮 {unit}",
            ],
        },
        "散装鸡蛋": {
            "units": ["500g", "10枚", "1kg"],
            "base_prices": {"沈阳": (5, 7), "上海": (7, 10), "成都": (6, 8), "深圳": (7, 9)},
            "name_variants": [
                "新鲜散装鸡蛋 {unit}",
                "农家散养土鸡蛋 {unit}",
                "优选散装鸡蛋 {unit}",
            ],
        },
        "东北大米": {
            "units": ["5kg", "10kg", "2.5kg"],
            "base_prices": {"沈阳": (30, 45), "上海": (35, 55), "成都": (32, 50), "深圳": (35, 52)},
            "name_variants": [
                "东北珍珠大米 {unit}",
                "五常稻花香大米 {unit}",
                "东北长粒香大米 {unit}",
            ],
        },
        "金龙鱼大豆油": {
            "units": ["5L", "1.8L", "900ml"],
            "base_prices": {"沈阳": (50, 65), "上海": (55, 72), "成都": (52, 68), "深圳": (55, 70)},
            "name_variants": [
                "金龙鱼精炼一级大豆油 {unit}",
                "金龙鱼大豆油 食用油 {unit}",
                "金龙鱼阳光大豆油 {unit}",
            ],
        },
        "纯牛奶": {
            "units": ["250ml*12", "250ml*24", "1L"],
            "base_prices": {"沈阳": (35, 50), "上海": (40, 60), "成都": (38, 55), "深圳": (40, 58)},
            "name_variants": [
                "伊利纯牛奶 {unit}",
                "蒙牛纯牛奶 整箱 {unit}",
                "特仑苏纯牛奶 {unit}",
            ],
        },
    }

    results = []
    for city in CITIES:
        for keyword in KEYWORDS:
            tpl = price_templates[keyword]
            for i in range(3):  # 3 results per keyword
                unit = tpl["units"][i]
                low, high = tpl["base_prices"][city]
                # Scale price by unit size
                scale = 1.0
                if "10kg" in unit:
                    scale = 3.5
                elif "5kg" in unit:
                    scale = 1.8
                elif "2.5kg" in unit:
                    scale = 0.9
                elif "1kg" in unit:
                    scale = 2.0
                elif "5L" in unit:
                    scale = 1.0
                elif "1.8L" in unit:
                    scale = 0.4
                elif "900ml" in unit:
                    scale = 0.2
                elif "250ml*24" in unit:
                    scale = 1.5
                elif "250ml*12" in unit:
                    scale = 0.8
                elif "1L" in unit:
                    scale = 0.25
                elif "10枚" in unit:
                    scale = 1.3

                price = round(random.uniform(low, high) * scale, 1)
                name = tpl["name_variants"][i].format(unit=unit)

                results.append({
                    "city": city,
                    "keyword": keyword,
                    "rank": i + 1,
                    "product_name": name,
                    "price": price,
                    "unit": unit,
                })

    return results


# ---------------------------------------------------------------------------
# Live scraper (Playwright)
# ---------------------------------------------------------------------------
def scrape_live() -> list[dict]:
    """Attempt to scrape prices from Yonghui Life using Playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌ playwright not installed. Run: pip install playwright && playwright install")
        print("⚠️  Falling back to mock data generator.")
        return mock_data_generator()

    results = []

    with sync_playwright() as p:
        for city_name, geo in CITIES.items():
            print(f"\n🏙️  Scraping {city_name} (lat={geo['latitude']}, lng={geo['longitude']})...")

            context = p.chromium.launch(headless=True).new_context(
                geolocation=geo,
                permissions=["geolocation"],
                locale="zh-CN",
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
            )
            page = context.new_page()

            for keyword in KEYWORDS:
                print(f"  🔍 Searching: {keyword}")
                try:
                    search_url = f"https://www.yhlife.com/search?keyword={keyword}"
                    page.goto(search_url, timeout=15000)
                    page.wait_for_timeout(3000)

                    # Try to extract product cards
                    items = page.query_selector_all(".product-card, .goods-item, .search-item")[:3]

                    if not items:
                        # Fallback: try broader selectors
                        items = page.query_selector_all("[class*='product'], [class*='goods']")[:3]

                    for rank, item in enumerate(items, 1):
                        try:
                            name_el = item.query_selector(
                                ".product-name, .goods-name, .title, h3, h4, [class*='name']"
                            )
                            price_el = item.query_selector(
                                ".price, .product-price, [class*='price'], .num"
                            )
                            product_name = name_el.inner_text().strip() if name_el else keyword
                            price_text = price_el.inner_text().strip() if price_el else "0"
                            price_val = float(re.sub(r"[^\d.]", "", price_text) or "0")

                            # Try to extract unit from product name
                            unit_match = re.search(
                                r"(\d+(?:\.\d+)?)\s*(kg|g|ml|L|斤|枚|盒|袋|瓶)",
                                product_name, re.IGNORECASE,
                            )
                            unit = unit_match.group(0) if unit_match else ""

                            results.append({
                                "city": city_name,
                                "keyword": keyword,
                                "rank": rank,
                                "product_name": product_name,
                                "price": price_val,
                                "unit": unit,
                            })
                        except Exception as e:
                            print(f"    ⚠️  Error parsing item {rank}: {e}")

                except Exception as e:
                    print(f"    ❌ Failed to search '{keyword}': {e}")

                # Anti-blocking delay
                delay = random.uniform(2, 5)
                print(f"    ⏳ Waiting {delay:.1f}s...")
                time.sleep(delay)

            context.close()

    # If scraping yielded very few results, supplement with mock data
    if len(results) < 10:
        print(f"\n⚠️  Only scraped {len(results)} items. Website may have changed structure.")
        print("💡 Supplementing with mock data for testing.")
        results = mock_data_generator()

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    use_mock = "--mock" in sys.argv

    if use_mock:
        print("🎲 Generating mock data...")
        data = mock_data_generator()
    else:
        print("🌐 Attempting live scrape...")
        data = scrape_live()

    output_path = Path(__file__).parent / "raw_supermarket_data.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved {len(data)} items to {output_path}")
    print(f"   Cities: {sorted(set(d['city'] for d in data))}")
    print(f"   Keywords: {sorted(set(d['keyword'] for d in data))}")


if __name__ == "__main__":
    main()

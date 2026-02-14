#!/usr/bin/env python3
"""Generate rpp_final.json with 2026 minimum wage data and tier-based basket pricing."""

import json
import os

# ── 2026 Official Hourly Wages (¥/hr) ──
WAGES = {
    '北京': 27.7, '上海': 24.0, '江苏': 25.0, '天津': 24.4,
    '广东': 23.7, '浙江': 24.0, '山东': 24.0, '湖北': 24.0,
    '河北': 24.0, '四川': 23.0, '河南': 23.0, '福建': 23.5,
    '辽宁': 22.0, '内蒙古': 22.4, '湖南': 21.0, '安徽': 22.0,
    '陕西': 21.0, '广西': 22.4, '重庆': 21.0, '江西': 20.9,
    '宁夏': 20.0, '山西': 21.3, '吉林': 20.0, '黑龙江': 19.0,
    '西藏': 18.0, '新疆': 19.0, '甘肃': 19.0, '青海': 18.0,
    '贵州': 20.0, '云南': 19.0, '海南': 20.5,
}

# ── Tier Classification ──
TIER_1 = {'北京', '上海', '广东'}          # Base ¥18 + 20% = ¥21.6
NORTHEAST = {'辽宁', '吉林', '黑龙江'}      # Base ¥14 - 15% = ¥11.9
REMOTE = {'西藏', '青海', '新疆'}          # Base ¥18 + 40% = ¥25.2
DEVELOPED = {'江苏', '浙江', '福建', '天津', '山东'}  # Base ¥16.5
CENTRAL = {'湖北', '湖南', '河南', '四川', '重庆', '陕西'}  # Base ¥15.0
OTHERS = set(WAGES.keys()) - TIER_1 - NORTHEAST - REMOTE - DEVELOPED - CENTRAL

REAL_MULTIPLIER = 0.45

# ── Item Weight Breakdown (for reference) ──
ITEM_WEIGHTS = {
    'pork_500g': 0.45,     # 45%
    'eggs_10':   0.15,     # 15%
    'rice_500g': 0.15,     # 15%
    'milk_250ml': 0.25,    # 25%
}

def calculate_basket_price(province: str) -> float:
    """Calculate basket price based on regional tier."""
    if province in TIER_1:
        return round(18.0 * 1.20, 1)  # +20%
    elif province in NORTHEAST:
        return round(14.0 * 0.85, 1)  # -15%
    elif province in REMOTE:
        return round(18.0 * 1.40, 1)  # +40%
    elif province in DEVELOPED:
        return 16.5
    elif province in CENTRAL:
        return 15.0
    else:
        return 14.5  # Default for others

def generate():
    results = []
    for name, wage in WAGES.items():
        bp = calculate_basket_price(name)
        rw = round(wage * REAL_MULTIPLIER, 2)
        
        # Calculate indices
        official_idx = round(wage / bp, 2)
        real_idx = round(rw / bp, 2)
        
        results.append({
            'name': name,
            'wage': wage,
            'basket_price': bp,
            'index': official_idx,
            'real_wage': rw,
            'real_index': real_idx,
        })
    
    # Sort by real_index descending (best survival first)
    results.sort(key=lambda x: x['real_index'], reverse=True)
    return results

data = generate()

# Write JSON
out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'rpp_final.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f'✅ Wrote {len(data)} provinces to {os.path.abspath(out_path)}')

# ── Summary table ──
print()
print('=' * 85)
print(f'{"Province":<8} {"Wage":>6} {"Real":>6} {"Basket":>7} {"Off.Idx":>8} {"Real.Idx":>9} {"Tier"}')
print('-' * 85)

def get_tier(name):
    if name in TIER_1: return "Tier-1"
    if name in NORTHEAST: return "NE-Low"
    if name in REMOTE: return "Remote"
    if name in DEVELOPED: return "Develop"
    if name in CENTRAL: return "Central"
    return "Other"

for d in data:
    tier = get_tier(d["name"])
    print(f'{d["name"]:<8} ¥{d["wage"]:>5.1f} ¥{d["real_wage"]:>5.2f} '
          f'¥{d["basket_price"]:>6.1f} {d["index"]:>8.2f} {d["real_index"]:>9.2f} {tier}')

# ── Item Breakdown Example ──
print()
print('═' * 85)
print('ITEM BREAKDOWN FORMULA (Example: 辽宁 with basket_price = ¥11.9)')
print('═' * 85)
ln_basket = calculate_basket_price('辽宁')
print(f'\nBasket Price: ¥{ln_basket:.1f}')
print(f'  - Pork (500g):    {ITEM_WEIGHTS["pork_500g"]*100:.0f}% → ¥{ln_basket * ITEM_WEIGHTS["pork_500g"]:.2f}/jin')
print(f'  - Eggs (10 units): {ITEM_WEIGHTS["eggs_10"]*100:.0f}% → ¥{ln_basket * ITEM_WEIGHTS["eggs_10"]:.2f} total')
print(f'  - Rice (500g):    {ITEM_WEIGHTS["rice_500g"]*100:.0f}% → ¥{ln_basket * ITEM_WEIGHTS["rice_500g"]:.2f}/jin')
print(f'  - Milk (250ml):   {ITEM_WEIGHTS["milk_250ml"]*100:.0f}% → ¥{ln_basket * ITEM_WEIGHTS["milk_250ml"]:.2f}/bag')

# ── Spotlight: 辽宁 vs 上海 ──
print()
print('═' * 85)
print('SPOTLIGHT: 辽宁 (Northeast) vs 上海 (Tier-1)')
print('═' * 85)
for target in ['辽宁', '上海']:
    d = next(x for x in data if x['name'] == target)
    print(f'\n  {d["name"]} ({get_tier(d["name"])}) — Real Index: {d["real_index"]:.2f}')
    print(f'    Official Wage:  ¥{d["wage"]}/hr')
    print(f'    Reality Wage:   ¥{d["real_wage"]}/hr  (×0.45)')
    print(f'    Basket Price:   ¥{d["basket_price"]}')
    
    # Calculate "What 1 hour buys"
    rw = d["real_wage"]
    bp = d["basket_price"]
    pork_price_jin = bp * 0.45
    pork_grams = (rw / pork_price_jin) * 500
    eggs_price_unit = (bp * 0.15) / 10
    eggs = rw / eggs_price_unit
    
    print(f'    → 1 hour buys: {pork_grams:.0f}g pork, {eggs:.0f} eggs')
    
    monthly = rw * 10 * 26
    print(f'    Monthly Income: ¥{monthly:.0f}  (10h × 26d)')
    print(f'    Survival Assessment: {"✅ Manageable" if d["real_index"] >= 0.65 else "⚠ Difficult" if d["real_index"] >= 0.5 else "💀 Crushing"}')

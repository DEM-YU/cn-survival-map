#!/usr/bin/env python3
"""Generate rpp_final.json — Hardcore Reality dataset."""
import json, os

# ── Core "Truth" data ──
CORE = {
    '辽宁':   {'wage': 11.5, 'basket': 18.0, 'verdict': '唯一的乐土 (早市碳水管饱，赖活天堂)', 'level': 1},
    '黑龙江': {'wage': 10.5, 'basket': 18.0, 'verdict': '相对容易 (除了冷，活着不难)', 'level': 1},
    '吉林':   {'wage': 10.5, 'basket': 19.0, 'verdict': '相对容易 (物价感人)', 'level': 1},
    '四川':   {'wage': 11.0, 'basket': 24.0, 'verdict': '勉强维持 (安逸是假象，内卷是真)', 'level': 2},
    '北京':   {'wage': 21.0, 'basket': 45.0, 'verdict': '手停口停 (赚得多花得更多，存不下钱)', 'level': 2},
    '上海':   {'wage': 21.0, 'basket': 48.0, 'verdict': '魔都结界 (便利店盒饭都吃不起)', 'level': 2},
    '湖北':   {'wage': 12.0, 'basket': 26.0, 'verdict': '一般 (九省通衢，两头不靠)', 'level': 2},
    '河南':   {'wage':  9.0, 'basket': 22.0, 'verdict': '困难 (人多工价贱，9块钱都有人抢)', 'level': 3},
    '山东':   {'wage': 10.0, 'basket': 25.0, 'verdict': '困难 (考公大省，打工者地狱)', 'level': 3},
    '广东':   {'wage': 14.0, 'basket': 30.0, 'verdict': '两极分化 (深圳赚钱深圳花，工厂时薪低)', 'level': 3},
    '新疆':   {'wage': 11.0, 'basket': 38.0, 'verdict': '地狱模式 (运费贵死人，拌面30一碗)', 'level': 4},
    '西藏':   {'wage': 12.0, 'basket': 40.0, 'verdict': '无法生存 (物价堪比欧洲，工资堪比非洲)', 'level': 4},
    '海南':   {'wage': 10.0, 'basket': 35.0, 'verdict': '天崩开局 (东北人的富人区，本地人的火坑)', 'level': 5},
}

# ── Auto-fill mapping ──
MAP_TO = {
    '天津': '北京',
    '江苏': '上海', '浙江': '上海',
    '河北': '河南', '山西': '河南', '安徽': '河南', '陕西': '河南',
    '内蒙古': '辽宁',
    '福建': '广东', '广西': '广东',
    '江西': '湖北', '湖南': '湖北',
    '重庆': '四川', '贵州': '四川', '云南': '四川',
    '甘肃': '新疆', '宁夏': '新疆',
    '青海': '西藏',
}

# ── Build full dataset ──
data = []

for name, d in CORE.items():
    ri = round(d['wage'] / d['basket'], 2)
    pork = round(d['basket'] * 0.45, 2)
    eggs = round(d['basket'] * 0.15, 2)
    rice = round(d['basket'] * 0.15, 2)
    milk = round(d['basket'] * 0.25, 2)
    data.append({
        'name': name,
        'official_wage': 20.0,
        'real_wage': d['wage'],
        'basket_price': d['basket'],
        'real_index': ri,
        'verdict': d['verdict'],
        'level': d['level'],
        'details': {'pork': pork, 'eggs': eggs, 'rice': rice, 'milk': milk},
    })

for name, ref in MAP_TO.items():
    src = CORE[ref]
    ri = round(src['wage'] / src['basket'], 2)
    pork = round(src['basket'] * 0.45, 2)
    eggs = round(src['basket'] * 0.15, 2)
    rice = round(src['basket'] * 0.15, 2)
    milk = round(src['basket'] * 0.25, 2)
    data.append({
        'name': name,
        'official_wage': 20.0,
        'real_wage': src['wage'],
        'basket_price': src['basket'],
        'real_index': ri,
        'verdict': src['verdict'],
        'level': src['level'],
        'details': {'pork': pork, 'eggs': eggs, 'rice': rice, 'milk': milk},
    })

# Sort by real_index descending (best survival first)
data.sort(key=lambda x: x['real_index'], reverse=True)

# ── Write ──
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'rpp_final.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'✅ Wrote {len(data)} provinces → {os.path.abspath(out)}')
print()
print(f'{"Province":<6} {"RealW":>6} {"Basket":>7} {"Index":>6} {"Lv":>3}  Verdict')
print('─' * 80)
for d in data:
    print(f'{d["name"]:<6} ¥{d["real_wage"]:>5.1f} ¥{d["basket_price"]:>6.1f} {d["real_index"]:>6.2f} {d["level"]:>3}  {d["verdict"]}')

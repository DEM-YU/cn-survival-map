'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import type { ProvinceData } from './ChinaMap';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Per-province verdicts (bilingual) ──
const VERDICTS: Record<string, { zh: string; en: string }> = {
  '黑龙江': { zh: '便宜的菜价勉强维持生存，但零下严寒和流失的就业机会冻结了你的未来。', en: 'Cheap groceries keep you alive, but sub-zero winters and vanishing jobs freeze your future.' },
  '辽宁': { zh: '低物价救了你的命，但低工资碎了你的梦。', en: 'Low prices save your life, but low wages break your dreams.' },
  '吉林': { zh: '严寒保住了食品价格——也保住了你停滞不前的工资。', en: 'The cold preserves food prices — and also your stagnant paycheck.' },
  '内蒙古': { zh: '草原无边无际——就像你的工资和北京房租之间的差距。', en: 'The steppes are endless — just like the gap between your wage and Beijing rent.' },
  '江苏': { zh: '工厂从不停工，你也不能——因为加班是"自愿"的。', en: 'Factories never sleep, and neither do you — because overtime is "voluntary".' },
  '安徽': { zh: '你把劳动力输出到上海，把贫穷带回了家乡。', en: 'You export labor to Shanghai and import poverty back home.' },
  '山东': { zh: '大蒜便宜，但尊严的价格超出了你的收入。', en: 'Garlic is cheap but dignity costs more than you earn.' },
  '四川': { zh: '火锅又辣又便宜——但医疗不是。', en: 'The hotpot is spicy and affordable — unlike healthcare.' },
  '湖北': { zh: '2020年后他们重建了城市，但没人重建你的储蓄。', en: 'They rebuilt after 2020, but no one rebuilt your savings.' },
  '河北': { zh: '你吸着北京的雾霾，却只赚北京工资的零头。', en: "You breathe Beijing's smog but earn a fraction of Beijing's wage." },
  '浙江': { zh: '电商百万富翁住在隔壁，旁边是时薪¥8的工厂工人。', en: 'E-commerce millionaires live next door to factory workers earning ¥8/hr.' },
  '广东': { zh: '珠三角灯火辉煌——但背后的工人不是。', en: "The Pearl River Delta glitters — but the workers behind it don't." },
  '北京': { zh: '地铁票¥3，你从六环外通勤2小时的代价是灵魂。', en: 'The subway costs ¥3. Your 2-hour commute from the 6th ring costs your soul.' },
  '重庆': { zh: '山城让送外卖更难，经济让其他一切更难。', en: 'The hills make delivery harder. The economy makes everything else harder.' },
  '山西': { zh: '煤炭曾经带来财富，现在带来的是尘肺病和废弃的城镇。', en: 'Coal once brought wealth. Now it brings lung disease and abandoned towns.' },
  '陕西': { zh: '古代的兵马俑比你有更好的就业保障。', en: 'Ancient terracotta warriors had better job security than you.' },
  '上海': { zh: '外滩夜景璀璨，但你消费不起那里的一顿饭。', en: "The Bund sparkles at night. You can't afford to eat there." },
  '福建': { zh: '茶文化底蕴深厚，你的银行余额却不是。', en: 'Tea culture is rich. Your bank account is not.' },
  '天津': { zh: '近到能闻到北京的繁华——但尝不到。', en: "Close enough to smell Beijing's prosperity — but not to taste it." },
  '河南': { zh: '一亿人口争抢就业岗位，这笔账怎么也算不过来。', en: "100 million people compete for jobs. The math doesn't add up." },
  '湖南': { zh: '辣椒火辣，房租涨幅更火辣。', en: 'The chili peppers are fiery. So is the rent inflation.' },
  '甘肃': { zh: '丝绸之路几百年前就终结了，经济机会也跟着走了。', en: 'The Silk Road ended centuries ago. Economic opportunity followed.' },
  '江西': { zh: '群山阻断了高速公路，也阻断了你的职业道路。', en: 'Mountains block the highway and your career path.' },
  '新疆': { zh: '风景令人窒息——距离海岸5000公里的物价也是。', en: 'The scenery is breathtaking — so are the prices at 5000km from the coast.' },
  '云南': { zh: '游客的天堂，本地打工人的炼狱。', en: 'Paradise for tourists, purgatory for local workers.' },
  '宁夏': { zh: '黄河奔流而过，机会也是——径直流走了。', en: 'The Yellow River flows through, and so does opportunity — right past you.' },
  '贵州': { zh: '大数据中心来了，大工资没来。', en: 'Big data centers arrived. Big paychecks did not.' },
  '广西': { zh: '喀斯特山水如画，工资底线难看。', en: 'The karst mountains are beautiful. The wage floor is ugly.' },
  '青海': { zh: '盐湖如锂般闪耀，你的工资不会。', en: "The salt lake sparkles like lithium. Your wage doesn't." },
  '海南': { zh: '自贸区的梦想遇上服务业的现实。', en: 'Free-trade zone dreams meet service-worker realities.' },
  '西藏': { zh: '离天堂更近——离能活下去的工资更远。', en: 'Closer to heaven — and farther from a living wage.' },
};

// ── GeoJSON name mapping (same as ChinaMap) ──
const NAME_MAP: Record<string, string> = {
  '北京': '北京市', '天津': '天津市', '上海': '上海市', '重庆': '重庆市',
  '河北': '河北省', '山西': '山西省', '辽宁': '辽宁省', '吉林': '吉林省',
  '黑龙江': '黑龙江省', '江苏': '江苏省', '浙江': '浙江省', '安徽': '安徽省',
  '福建': '福建省', '江西': '江西省', '山东': '山东省', '河南': '河南省',
  '湖北': '湖北省', '湖南': '湖南省', '广东': '广东省', '海南': '海南省',
  '四川': '四川省', '贵州': '贵州省', '云南': '云南省', '陕西': '陕西省',
  '甘肃': '甘肃省', '青海': '青海省', '台湾': '台湾省',
  '内蒙古': '内蒙古自治区', '广西': '广西壮族自治区', '西藏': '西藏自治区',
  '宁夏': '宁夏回族自治区', '新疆': '新疆维吾尔自治区',
  '香港': '香港特别行政区', '澳门': '澳门特别行政区',
};

// ── Difficulty badge ──
function getDifficulty(realIndex: number, t: (key: string, params?: Record<string, string>) => string) {
  if (realIndex >= 0.6) return { label: t('difficulty.extreme'), color: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/10' };
  if (realIndex >= 0.5) return { label: t('difficulty.hardcore'), color: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/10' };
  return { label: t('difficulty.unlivable'), color: 'text-red-300', border: 'border-red-400/50', bg: 'bg-red-500/15' };
}

// ── SVG Province Silhouette from GeoJSON ──
function ProvinceSilhouette({ provinceName }: { provinceName: string }) {
  const [svgPath, setSvgPath] = useState<string>('');

  useEffect(() => {
    const fullName = NAME_MAP[provinceName] || provinceName;
    fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
      .then((r) => r.json())
      .then((geoJson) => {
        const feature = geoJson.features?.find(
          (f: any) => f.properties?.name === fullName || f.properties?.name === provinceName
        );
        if (!feature) return;

        // Convert GeoJSON coordinates to SVG path
        const geom = feature.geometry;
        const allCoords: number[][] = [];

        function extractCoords(coords: any, depth: number) {
          if (depth === 0) {
            allCoords.push(coords);
          } else {
            for (const c of coords) extractCoords(c, depth - 1);
          }
        }

        if (geom.type === 'Polygon') {
          extractCoords(geom.coordinates, 2);
        } else if (geom.type === 'MultiPolygon') {
          extractCoords(geom.coordinates, 3);
        }

        if (allCoords.length === 0) return;

        // Find bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [x, y] of allCoords) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const scale = Math.min(280 / w, 280 / h);

        function project(x: number, y: number): [number, number] {
          return [
            (x - minX) * scale + (300 - w * scale) / 2,
            (maxY - y) * scale + (300 - h * scale) / 2, // flip Y
          ];
        }

        // Build SVG paths from polygons
        let pathData = '';
        function buildPolygonPath(ring: any[]) {
          const projected = ring.map(([x, y]: [number, number]) => project(x, y));
          return projected.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ') + ' Z';
        }

        if (geom.type === 'Polygon') {
          for (const ring of geom.coordinates) {
            pathData += buildPolygonPath(ring) + ' ';
          }
        } else if (geom.type === 'MultiPolygon') {
          for (const polygon of geom.coordinates) {
            for (const ring of polygon) {
              pathData += buildPolygonPath(ring) + ' ';
            }
          }
        }

        setSvgPath(pathData.trim());
      })
      .catch(() => {});
  }, [provinceName]);

  if (!svgPath) {
    return (
      <div className="w-[280px] h-[280px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-red-500/40 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.svg
      viewBox="0 0 300 300"
      className="w-[280px] h-[280px]"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={svgPath}
        fill="rgba(239, 68, 68, 0.12)"
        stroke="#ef4444"
        strokeWidth="1.5"
        filter="url(#glow)"
        opacity="0.9"
      />
    </motion.svg>
  );
}

// ── Animated Progress Bar ──
function TimeCostBar({ label, hours, maxHours, unit }: { label: string; hours: number; maxHours: number; unit?: string }) {
  const pct = Math.min((hours / maxHours) * 100, 100);
  const displayValue = unit ? `${hours.toFixed(1)} ${unit}` : (hours >= 24 ? `${(hours / 8).toFixed(0)} work-days` : `${hours.toFixed(1)} hrs`);
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-400 font-mono">{label}</span>
        <span className="text-red-400 font-mono font-bold">{displayValue}</span>
      </div>
      <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          className="h-full rounded-full"
          style={{
            background: pct > 60
              ? 'linear-gradient(90deg, #dc2626, #991b1b)'
              : pct > 30
              ? 'linear-gradient(90deg, #f59e0b, #dc2626)'
              : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
          }}
        />
      </div>
    </div>
  );
}

interface ProvinceDetailProps {
  province: ProvinceData;
  onBack: () => void;
}

export default function ProvinceDetail({ province, onBack }: ProvinceDetailProps) {
  const { language, t } = useLanguage();
  const d = province;
  const realWage = d.real_wage ?? d.wage * 0.45;
  const realIndex = d.real_index ?? realWage / d.basket_price;
  const difficulty = getDifficulty(realIndex, t);

  // ── Survival Combo: AND relationship (wage split across items) ──
  const porkPrice = d.details?.pork ?? d.basket_price * 0.45;   // per 500g
  const ricePrice = d.details?.rice ?? d.basket_price * 0.15;   // per 500g
  const eggPrice  = d.details?.eggs ?? d.basket_price * 0.15;   // per 10 pcs
  const milkPrice = d.details?.milk ?? d.basket_price * 0.25;   // per 250ml

  // Split wage: 40% pork, 30% rice, 15% eggs, 15% milk
  const porkSpend = realWage * 0.40;
  const riceSpend = realWage * 0.30;
  const eggSpend  = realWage * 0.15;
  const milkSpend = realWage * 0.15;

  const comboPork  = Math.round((porkSpend / porkPrice) * 500);  // grams
  const comboRice  = Math.round((riceSpend / ricePrice) * 500);  // grams
  const comboEggs  = Math.round((eggSpend / eggPrice) * 10);     // units
  const comboMilk  = Math.round((milkSpend / milkPrice) * 250);  // ml

  // ── Time costs (tier-based dynamic pricing) ──
  const TIER_COSTS: Record<number, { meal: number; rent: number }> = {
    1: { meal: 12, rent: 800 },    // Tier 3: Liaoning, Heilongjiang, etc.
    2: { meal: 18, rent: 1500 },   // Tier 2: Sichuan, Hubei, Shandong
    3: { meal: 18, rent: 1500 },   // Tier 2 equivalent
    4: { meal: 22, rent: 600 },    // Tier 4: Xinjiang, Tibet
    5: { meal: 22, rent: 600 },    // Tier 5: Hainan
  };
  // Override for Tier-1 cities
  const TIER1_NAMES = ['北京', '上海', '广东', '天津', '江苏', '浙江'];
  const isTier1 = TIER1_NAMES.includes(d.name);
  const tierCosts = isTier1
    ? { meal: 25, rent: 2500 }
    : TIER_COSTS[d.level ?? 2] ?? { meal: 18, rent: 1500 };

  const mealCost = tierCosts.meal;
  const rentMonthly = tierCosts.rent;
  const monthlyIncome = realWage * 10 * 26;
  const mealHours = +(mealCost / realWage).toFixed(1);
  const rentDays = +(rentMonthly / (realWage * 10)).toFixed(1);

  const verdictEntry = VERDICTS[d.name];
  const defaultVerdict = { zh: '每一分钱都很重要，而大多数不属于你。', en: "Every yuan counts, and most of them aren't yours." };
  const verdict = verdictEntry ? verdictEntry[language] : defaultVerdict[language];

  const comboItems = [
    { icon: '🥩', label: t('item.pork'), value: `${comboPork}g`, spend: porkSpend, pct: 40 },
    { icon: '🍚', label: t('item.rice'), value: `${comboRice}g`, spend: riceSpend, pct: 30 },
    { icon: '🥚', label: t('item.eggs'), value: `${comboEggs}`, spend: eggSpend, pct: 15 },
    { icon: '🥛', label: t('item.milk'), value: `${comboMilk}${t('item.milkUnit')}`, spend: milkSpend, pct: 15 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="min-h-[600px] flex flex-col lg:flex-row gap-0 rounded-2xl overflow-hidden border border-red-900/30"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0c0a09 50%, #0a0a0a 100%)' }}
    >
      {/* ═══ LEFT PANEL (40%) — Province Identity ═══ */}
      <div className="lg:w-[40%] relative flex flex-col items-center justify-center p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-red-900/20">
        {/* Back button */}
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg
            bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-mono
            hover:border-red-500/50 hover:text-red-400 transition-colors cursor-pointer z-10"
        >
          {t('detail.backButton')}
        </motion.button>

        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)' }}
        />

        {/* Province SVG silhouette */}
        <div className="mb-4">
          <ProvinceSilhouette provinceName={d.name} />
        </div>

        {/* Province Name — industrial stencil style */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-6xl lg:text-7xl font-black tracking-[-0.04em] leading-none text-center"
          style={{
            color: '#fafafa',
            textShadow: '0 0 40px rgba(239,68,68,0.2), 0 2px 0 #27272a',
            fontFamily: '"Impact", "Arial Black", sans-serif',
            letterSpacing: '0.05em',
          }}
        >
          {d.name}
        </motion.h1>

        {/* Reality Index */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center"
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600 mb-1">
            {t('detail.realityIndex')}
          </p>
          <p className="text-4xl font-black font-mono text-red-400" style={{ textShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
            {realIndex.toFixed(2)}
          </p>
        </motion.div>

        {/* Difficulty badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono font-bold border ${difficulty.border} ${difficulty.bg} ${difficulty.color}`}
        >
          {difficulty.label}
        </motion.div>

        {/* Wage stat */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 bg-zinc-900/80 rounded-lg px-5 py-3 border border-red-900/30 text-center"
        >
          <p className="text-[10px] font-mono uppercase text-zinc-600">{t('detail.realityWage')}</p>
          <p className="text-2xl font-black text-red-400 font-mono">¥{realWage.toFixed(2)}<span className="text-sm text-zinc-500">/hr</span></p>
        </motion.div>
      </div>

      {/* ═══ RIGHT PANEL (60%) — Survival Report ═══ */}
      <div className="lg:w-[60%] overflow-y-auto max-h-[85vh] p-6 lg:p-8 space-y-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-mono font-bold text-zinc-200 flex items-center gap-2">
            <span className="text-red-500">▮</span> {t('detail.survivalReport')}
          </h2>
          <p className="text-xs font-mono text-zinc-600 mt-1">{t('detail.basedOn', { wage: realWage.toFixed(2) })}</p>
        </motion.div>

        {/* ── Section 1: Survival Combo Receipt ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-red-500/40 to-transparent" />
            <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-red-400">
              {t('section.survivalCombo', { wage: realWage.toFixed(2) })}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-l from-red-500/40 to-transparent" />
          </div>

          {/* Receipt card */}
          <div className="bg-zinc-950 rounded-xl border border-red-900/30 overflow-hidden"
            style={{ boxShadow: '0 0 30px rgba(239,68,68,0.05)' }}
          >
            {/* Receipt header */}
            <div className="bg-red-950/30 px-5 py-2.5 border-b border-red-900/20 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-red-400/80">🧾 SURVIVAL RECEIPT</span>
              <span className="text-[10px] font-mono text-zinc-600">¥{realWage.toFixed(2)} / 1hr</span>
            </div>

            {/* Receipt items — connected by "+" */}
            <div className="px-5 py-4">
              <div className="flex items-stretch justify-between gap-1">
                {comboItems.map((item, i) => (
                  <div key={item.label} className="flex items-center gap-1">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.12 }}
                      className="flex-1 bg-zinc-900/80 rounded-lg p-3 text-center border border-zinc-800
                        hover:border-red-500/30 transition-all hover:bg-zinc-900 min-w-[72px]"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <p className="text-base font-black text-white font-mono mt-1 leading-tight">{item.value}</p>
                      <p className="text-[9px] text-zinc-500 font-mono uppercase mt-0.5">{item.label}</p>
                      <p className="text-[8px] text-red-400/60 font-mono mt-1">¥{item.spend.toFixed(1)}</p>
                    </motion.div>
                    {i < comboItems.length - 1 && (
                      <span className="text-red-500/50 text-lg font-bold mx-0.5 self-center">+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt footer — dashed line + total */}
            <div className="px-5 pb-4">
              <div className="border-t border-dashed border-zinc-700 pt-3 flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-600">
                  {t('receipt.totalCost', { wage: realWage.toFixed(2) })}
                </span>
                <span className="text-xs font-mono font-bold text-red-400">
                  = {t('detail.realityWage')}
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Section 2: Time Cost Cards ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-orange-500/40 to-transparent" />
            <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-orange-400">
              {t('section.timeCost')}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-l from-orange-500/40 to-transparent" />
          </div>

          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
            <TimeCostBar label={t('time.meal', { price: String(mealCost) })} hours={mealHours} maxHours={5} />
            <TimeCostBar label={t('time.rent', { price: String(rentMonthly) })} hours={rentDays} maxHours={30} unit="work-days" />

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 text-center">
                <p className="text-[10px] font-mono text-zinc-600">{t('time.mealsPerDay')}</p>
                <p className="text-xl font-black font-mono text-white">{((realWage * 10) / mealCost).toFixed(1)}</p>
                <p className="text-[9px] font-mono text-zinc-700">{t('time.workDay')}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 text-center">
                <p className="text-[10px] font-mono text-zinc-600">{t('time.rentPercent')}</p>
                <p className="text-xl font-black font-mono text-red-400">{((rentMonthly / monthlyIncome) * 100).toFixed(0)}%</p>
                <p className="text-[9px] font-mono text-zinc-700">{t('time.monthlyIncome')}</p>
              </div>
            </div>

            <p className="text-[9px] font-mono text-zinc-600 mt-3 text-center">
              {t('time.regionalNote')}
            </p>
          </div>
        </motion.section>

        {/* ── Section 3: The Truth Note ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-500/40 to-transparent" />
            <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">
              {t('section.finePrint')}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-l from-zinc-500/40 to-transparent" />
          </div>

          <div className="bg-zinc-950 rounded-xl border border-red-900/30 p-5">
            <p className="text-zinc-400 text-sm font-mono leading-relaxed">
              <span className="text-red-500 font-bold">{t('fine.calcBasis')}</span>{' '}
              <span className="text-white font-semibold">{t('fine.12hShifts')}</span>,{' '}
              <span className="text-white font-semibold">{t('fine.noSocial')}</span>,{' '}
              <span className="text-white font-semibold">{t('fine.26days')}</span>.{' '}
              {t('fine.officialNote', { wage: String(d.official_wage ?? d.wage ?? 20) })}
            </p>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="text-zinc-500 text-xs font-mono italic">
                &ldquo;{verdict}&rdquo;
              </p>
            </div>
          </div>
        </motion.section>

        {/* Terminal footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-[10px] text-zinc-700 font-mono pb-4"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500/60 animate-pulse mr-1" />
          {t('footer.terminal', { name: d.name })}
        </motion.div>
      </div>
    </motion.div>
  );
}

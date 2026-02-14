'use client';

import { Suspense, lazy, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ProvinceData } from '@/components/ChinaMap';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const ChinaMap = lazy(() => import('@/components/ChinaMap'));
const ProvinceDetail = lazy(() => import('@/components/ProvinceDetail'));

const REAL_WAGE_MULTIPLIER = 0.45;

// Fallback data
const FALLBACK_DATA: ProvinceData[] = [
  { name: '上海', wage: 24, basket_price: 19.2, index: 1.25 },
  { name: '北京', wage: 26, basket_price: 20.5, index: 1.27 },
  { name: '广东', wage: 22, basket_price: 17.0, index: 1.29 },
  { name: '辽宁', wage: 19, basket_price: 13.0, index: 1.46 },
  { name: '四川', wage: 21, basket_price: 15.8, index: 1.33 },
];

function getColor(realIndex: number): string {
  if (realIndex >= 0.65) return 'text-orange-400';
  if (realIndex >= 0.55) return 'text-red-400';
  if (realIndex >= 0.50) return 'text-red-500';
  return 'text-red-300';
}

function getBg(realIndex: number): string {
  if (realIndex >= 0.65) return 'bg-orange-500/8';
  if (realIndex >= 0.55) return 'bg-red-500/8';
  if (realIndex >= 0.50) return 'bg-red-500/10';
  return 'bg-red-500/15';
}

function RankingList({
  title,
  items,
  icon,
  ascending,
  onItemClick,
}: {
  title: string;
  items: ProvinceData[];
  icon: string;
  ascending?: boolean;
  onItemClick?: (d: ProvinceData) => void;
}) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 p-5">
      <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2 font-mono">
        <span>{icon}</span> {title}
      </h3>
      <div className="space-y-2">
        {items.map((d, i) => {
          const rank = ascending ? items.length - i : i + 1;
          const ri = d.real_index ?? (d.wage * REAL_WAGE_MULTIPLIER) / d.basket_price;
          return (
            <div
              key={d.name}
              onClick={() => onItemClick?.(d)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${getBg(ri)} transition-all hover:scale-[1.02] cursor-pointer border border-transparent hover:border-red-500/20`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-600 w-5 text-right font-mono">
                  {rank}
                </span>
                <span className="text-sm font-semibold text-zinc-200">
                  {d.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 font-mono">
                  ¥{(d.real_wage ?? d.wage * REAL_WAGE_MULTIPLIER).toFixed(1)}/hr
                </span>
                <span className={`font-bold text-sm tabular-nums font-mono ${getColor(ri)}`}>
                  {ri.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const [data, setData] = useState<ProvinceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);

  useEffect(() => {
    fetch('/data/rpp_final.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: ProvinceData[]) => {
        // Enrich with real fields
        const enriched = json.map((d) => ({
          ...d,
          real_wage: d.real_wage ?? +(d.wage * REAL_WAGE_MULTIPLIER).toFixed(2),
          real_index: d.real_index ?? +((d.wage * REAL_WAGE_MULTIPLIER) / d.basket_price).toFixed(2),
        }));
        setData(enriched);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to load rpp_final.json, using fallback:', err);
        const enriched = FALLBACK_DATA.map((d) => ({
          ...d,
          real_wage: +(d.wage * REAL_WAGE_MULTIPLIER).toFixed(2),
          real_index: +((d.wage * REAL_WAGE_MULTIPLIER) / d.basket_price).toFixed(2),
        }));
        setData(enriched);
        setLoading(false);
      });
  }, []);

  // Sort by real_index
  const sorted = [...data].sort((a, b) => (b.real_index ?? 0) - (a.real_index ?? 0));
  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();

  // Stats based on real_index
  const avgRealIndex = data.length
    ? (data.reduce((s, d) => s + (d.real_index ?? 0), 0) / data.length).toFixed(2)
    : '—';

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 font-mono text-sm">{t('map.loading')}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80">
        <div className="max-w-[1600px] mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>
              <span className="text-red-500">💀</span>{' '}
              <span className="text-white">{t('header.title')}</span>
            </h1>
            <p className="text-sm text-zinc-600 sm:ml-4 sm:mb-0.5 font-mono">
              {t('header.subtitle')}
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Dashboard */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Stats Bar — reality only */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: t('stats.provinces'), value: data.length, accent: 'text-zinc-300' },
            {
              label: t('stats.bestSurvival'),
              value: sorted[0]?.real_index?.toFixed(2) ?? '—',
              sub: sorted[0]?.name,
              accent: 'text-orange-400',
            },
            {
              label: t('stats.worstSurvival'),
              value: sorted[sorted.length - 1]?.real_index?.toFixed(2) ?? '—',
              sub: sorted[sorted.length - 1]?.name,
              accent: 'text-red-400',
            },
            {
              label: t('stats.avgIndex'),
              value: avgRealIndex,
              accent: 'text-red-300',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800 px-4 py-3"
            >
              <p className="text-[11px] uppercase tracking-wider text-zinc-600 font-semibold font-mono">
                {stat.label}
              </p>
              <p className={`text-xl font-black mt-1 font-mono ${stat.accent}`}>
                {stat.value}
                {stat.sub && (
                  <span className="text-xs text-zinc-500 font-normal ml-1.5">
                    ({stat.sub})
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel — 70% */}
          <div className="lg:w-[70%] bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-800 p-4 min-h-[600px]">
            <AnimatePresence mode="wait">
              {selectedProvince ? (
                <Suspense
                  key="detail"
                  fallback={
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  }
                >
                  <ProvinceDetail
                    province={selectedProvince}
                    onBack={() => setSelectedProvince(null)}
                  />
                </Suspense>
              ) : (
                <motion.div
                  key="map"
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="h-full"
                >
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full min-h-[400px]">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-zinc-500 text-sm font-mono">Loading map...</span>
                        </div>
                      </div>
                    }
                  >
                    <ChinaMap
                      data={data}
                      onProvinceClick={(province) => setSelectedProvince(province)}
                    />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar — 30% */}
          <div className="lg:w-[30%] flex flex-col gap-5">
            <RankingList
              title={t('sidebar.bestSurvival')}
              items={top10}
              icon="🔥"
              onItemClick={(d) => setSelectedProvince(d)}
            />
            <RankingList
              title={t('sidebar.worstSurvival')}
              items={bottom10}
              icon="💀"
              ascending
              onItemClick={(d) => setSelectedProvince(d)}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-zinc-700 pb-6 font-mono">
          {t('footer.note')}
        </footer>
      </div>
    </main>
  );
}

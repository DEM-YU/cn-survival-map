'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { MapChart } from 'echarts/charts';
import {
  TooltipComponent,
  VisualMapComponent,
  GeoComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([MapChart, TooltipComponent, VisualMapComponent, GeoComponent, CanvasRenderer]);

// ── Types ──
export interface ProvinceData {
  name: string;
  wage: number;
  basket_price: number;
  index: number;
  real_wage?: number;
  real_index?: number;
  official_wage?: number;
  verdict?: string;
  level?: number;
  details?: {
    pork: number;
    eggs: number;
    rice: number;
    milk: number;
  };
}

interface ChinaMapProps {
  data?: ProvinceData[];
  onProvinceClick?: (province: ProvinceData) => void;
}

// ── Constants ──
const REAL_WAGE_MULTIPLIER = 0.45;

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

function toGeoName(shortName: string, geoNames: string[]): string {
  if (geoNames.includes(shortName)) return shortName;
  const mapped = NAME_MAP[shortName];
  if (mapped && geoNames.includes(mapped)) return mapped;
  const fuzzy = geoNames.find((g) => g.startsWith(shortName));
  return fuzzy ?? shortName;
}

// ── Main Component (Reality-Only) ──
export default function ChinaMap({ data: externalData, onProvinceClick }: ChinaMapProps) {
  const { t } = useLanguage();
  const [mapReady, setMapReady] = useState(false);
  const [geoNames, setGeoNames] = useState<string[]>([]);
  const [localData, setLocalData] = useState<ProvinceData[]>([]);
  const chartRef = useRef<ReactEChartsCore | null>(null);

  // ── Fetch GeoJSON ──
  useEffect(() => {
    let cancelled = false;
    fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
      .then((res) => res.json())
      .then((geoJson) => {
        if (cancelled) return;
        echarts.registerMap('china', geoJson as any);
        setGeoNames(
          (geoJson.features || []).map((f: any) => f.properties?.name ?? ''),
        );
        setMapReady(true);
      })
      .catch((err) => console.error('Failed to load China GeoJSON:', err));
    return () => { cancelled = true; };
  }, []);

  // ── Fetch province data & compute real fields ──
  useEffect(() => {
    function enrich(items: ProvinceData[]): ProvinceData[] {
      return items.map((d) => ({
        ...d,
        real_wage: d.real_wage ?? +(d.wage * REAL_WAGE_MULTIPLIER).toFixed(2),
        real_index: d.real_index ?? +((d.wage * REAL_WAGE_MULTIPLIER) / d.basket_price).toFixed(2),
      }));
    }
    if (externalData && externalData.length > 0) {
      setLocalData(enrich(externalData));
      return;
    }
    fetch('/data/rpp_final.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: ProvinceData[]) => setLocalData(enrich(json)))
      .catch((err) => console.error('Failed to load rpp_final.json:', err));
  }, [externalData]);

  // ── Build series data (reality only) ──
  const seriesData = useMemo(
    () =>
      localData.map((d) => ({
        name: toGeoName(d.name, geoNames),
        value: d.real_index!,
        realWage: d.real_wage!,
        basketPrice: d.basket_price,
        realIndex: d.real_index!,
        shortName: d.name,
      })),
    [localData, geoNames],
  );

  // ── ECharts option (reality-only, harsh palette) ──
  const option: echarts.EChartsCoreOption = {
    backgroundColor: 'transparent',

    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const d = params.data;
        if (!d) return params.name;
        return `
          <div style="font-family: 'SF Mono', 'Fira Code', monospace; padding: 4px 0; line-height: 1.9;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px; color: #fca5a5;">
              💀 ${params.name}
            </div>
            <div>📉 <span style="color:#f87171;">${t('tooltip.realityWage')}:</span> <b style="color:#fca5a5; font-family:monospace;">¥${d.realWage?.toFixed(2)}/hr</b></div>
            <div style="font-size: 10px; color: #71717a; padding-left: 20px;">${t('tooltip.shifts')}</div>
            <div>📊 <span style="color:#fbbf24;">${t('tooltip.survivalIndex')}:</span> <b style="color:#f1f5f9; font-size: 14px; font-family:monospace;">${d.value?.toFixed(2)}</b></div>
            <div>🧺 <span style="color:#fb923c;">${t('tooltip.basketCost')}:</span> <span style="font-family:monospace;">¥${d.basketPrice?.toFixed(1)}</span></div>
            <div style="margin-top: 6px; border-top: 1px solid rgba(239,68,68,0.2); padding-top: 6px;">
              <div style="color:#ef4444; font-size: 11px; font-weight:600;">
                ${t('tooltip.warning', { value: d.value?.toFixed(2) })}
              </div>
            </div>
          </div>
        `;
      },
      backgroundColor: 'rgba(15, 5, 5, 0.96)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0' },
      extraCssText: 'border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.6); max-width: 320px;',
    },

    visualMap: {
      type: 'continuous',
      min: 0.3,
      max: 0.8,
      text: [t('map.vmHard'), t('map.vmCrushing')],
      textStyle: { color: '#71717a', fontSize: 11, fontFamily: 'monospace' },
      inRange: {
        color: ['#7f1d1d', '#dc2626', '#f59e0b'],
      },
      calculable: true,
      left: 'left',
      bottom: 30,
      itemWidth: 14,
      itemHeight: 140,
    },

    series: [
      {
        name: 'Reality Survival Index',
        type: 'map',
        map: 'china',
        roam: true,
        scaleLimit: { min: 0.8, max: 6 },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            color: '#fef2f2',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'monospace',
          },
          itemStyle: {
            areaColor: '#991b1b',
            borderColor: '#fca5a5',
            borderWidth: 1.5,
          },
        },
        itemStyle: {
          borderColor: '#450a0a',
          borderWidth: 0.5,
          areaColor: '#1c1917',
        },
        data: seriesData,
      },
    ],
  };

  const onEvents = {
    click: (params: any) => {
      if (onProvinceClick && params.data?.shortName) {
        const match = localData.find((d) => d.name === params.data.shortName);
        if (match) onProvinceClick(match);
      }
    },
  };

  if (!mapReady) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm font-mono">{t('map.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Reality badge — top-right */}
      <div className="absolute top-2 right-2 z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold
          bg-red-500/15 border border-red-500/30 text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {t('map.realityMode')}
        </span>
      </div>

      <ReactEChartsCore
        ref={(e) => { chartRef.current = e; }}
        echarts={echarts}
        option={option}
        notMerge={true}
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
        onEvents={onEvents}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}

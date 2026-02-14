'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
const translations: Record<Language, Record<string, string>> = {
  zh: {
    // Header
    'header.title': '购买力地图',
    'header.subtitle': '真实指数 = 现实工资 (×0.45) ÷ 生存篮子 · 12小时工作 · 无保险',
    
    // Stats
    'stats.provinces': '省份',
    'stats.bestSurvival': '最佳生存',
    'stats.worstSurvival': '最差生存',
    'stats.avgIndex': '平均真实指数',
    
    // Sidebar
    'sidebar.bestSurvival': '最佳生存',
    'sidebar.worstSurvival': '最差生存',
    
    // Province Detail
    'detail.backButton': '⬅ 返回全国地图',
    'detail.realityIndex': '现实生存指数',
    'detail.realityWage': '现实工资',
    'detail.survivalReport': '生存报告',
    'detail.basedOn': '基于现实工资 · ¥{wage}/小时',
    
    // Sections
    'section.survivalCombo': '1小时劳动 (¥{wage}) 生存套餐',
    'section.timeCost': '生活时间成本',
    'section.finePrint': '残酷真相',
    
    // Items
    'item.pork': '猪肉',
    'item.eggs': '鸡蛋',
    'item.milk': '牛奶',
    'item.rice': '大米',
    'item.milkUnit': 'ml',
    'receipt.totalCost': '总计: ¥{wage} (1小时生命)',
    'receipt.allocation': '分配 {pct}% = ¥{amount}',
    
    // Time costs
    'time.meal': '🍜 1顿标准餐 (¥{price})',
    'time.rent': '🏠 1个月房租 (¥{price})',
    'time.mealsPerDay': '每日可吃餐数',
    'time.rentPercent': '房租 / 收入',
    'time.workDay': '按10小时工作日',
    'time.monthlyIncome': '占月收入比例',
    'time.regionalNote': 'ℹ️ 价格已根据地区经济水平调整',
    
    // Fine print
    'fine.calcBasis': '⚠ 计算基于',
    'fine.12hShifts': '每日12小时轮班',
    'fine.noSocial': '无社保',
    'fine.26days': '每月26个工作日',
    'fine.officialNote': '官方最低工资 (¥{wage}/小时) 假设8小时工作制+福利——这对大多数低收入工人来说并不存在。',
    
    // Difficulty badges
    'difficulty.extreme': '⚠️ 极端困难',
    'difficulty.hardcore': '💀 艰难生存',
    'difficulty.unlivable': '☠️ 无法生存',
    
    // Map
    'map.loading': '加载地图数据...',
    'map.realityMode': '现实模式',
    'map.vmHard': '困难',
    'map.vmCrushing': '碾压',
    
    // Tooltip
    'tooltip.realityWage': '现实工资',
    'tooltip.shifts': '12小时轮班 · 无福利 · 无社保',
    'tooltip.survivalIndex': '生存指数',
    'tooltip.basketCost': '篮子成本',
    'tooltip.warning': '⚠ 1小时劳动仅能购买 {value} 个生存篮子。',
    
    // Footer
    'footer.note': '现实工资 = 官方最低工资 × 0.45 (12小时班次，无保险，无加班费)。点击任意省份查看完整生存报告。',
    'footer.terminal': 'SURVIVAL_ENGINE v2.0 — {name} 区域 — 仅限现实模式',
  },
  en: {
    // Header
    'header.title': 'Purchasing Power Map',
    'header.subtitle': 'Reality Index = Real Wage (×0.45) ÷ Survival Basket · 12h shifts · No benefits',
    
    // Stats
    'stats.provinces': 'Provinces',
    'stats.bestSurvival': 'Best Survival',
    'stats.worstSurvival': 'Worst Survival',
    'stats.avgIndex': 'Avg Reality Index',
    
    // Sidebar
    'sidebar.bestSurvival': 'Best Survival',
    'sidebar.worstSurvival': 'Worst Survival',
    
    // Province Detail
    'detail.backButton': '⬅ Back to National Map',
    'detail.realityIndex': 'Reality Survival Index',
    'detail.realityWage': 'Reality Wage',
    'detail.survivalReport': 'The Survival Report',
    'detail.basedOn': 'Based on Reality Wage · ¥{wage}/hr',
    
    // Sections
    'section.survivalCombo': '1 Hour of Labor (¥{wage}) Survival Combo',
    'section.timeCost': 'Time Cost of Living',
    'section.finePrint': 'The Fine Print',
    
    // Items
    'item.pork': 'Pork',
    'item.eggs': 'Eggs',
    'item.milk': 'Milk',
    'item.rice': 'Rice',
    'item.milkUnit': 'ml',
    'receipt.totalCost': 'Total: ¥{wage} (1 Hour of Life)',
    'receipt.allocation': 'Allocate {pct}% = ¥{amount}',
    
    // Time costs
    'time.meal': '🍜 1 Standard Meal (¥{price})',
    'time.rent': '🏠 1 Month Rent (¥{price})',
    'time.mealsPerDay': 'Meals per day',
    'time.rentPercent': 'Rent / Income',
    'time.workDay': '@ 10hr work day',
    'time.monthlyIncome': 'of monthly take-home',
    'time.regionalNote': 'ℹ️ Prices adjusted for regional economic level',
    
    // Fine print
    'fine.calcBasis': '⚠ Calculation based on',
    'fine.12hShifts': '12-hour daily shifts',
    'fine.noSocial': 'no social security',
    'fine.26days': '26 working days/month',
    'fine.officialNote': 'The official minimum wage (¥{wage}/hr) assumes 8-hour days with benefits — a reality that does not exist for most low-income workers.',
    
    // Difficulty badges
    'difficulty.extreme': '⚠️ EXTREME DIFFICULTY',
    'difficulty.hardcore': '💀 HARDCORE SURVIVAL',
    'difficulty.unlivable': '☠️ UNLIVABLE',
    
    // Map
    'map.loading': 'Loading reality data...',
    'map.realityMode': 'REALITY MODE',
    'map.vmHard': 'Hard',
    'map.vmCrushing': 'Crushing',
    
    // Tooltip
    'tooltip.realityWage': 'Reality Wage',
    'tooltip.shifts': '12h shifts · no benefits · no insurance',
    'tooltip.survivalIndex': 'Survival Index',
    'tooltip.basketCost': 'Basket Cost',
    'tooltip.warning': '⚠ 1 hour of labor buys only {value} survival baskets.',
    
    // Footer
    'footer.note': 'Reality Wage = Official Min Wage × 0.45 (12h shift, no insurance, no overtime pay). Click any province for the full survival report.',
    'footer.terminal': 'SURVIVAL_ENGINE v2.0 — {name} SECTOR — REALITY_ONLY',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    // Load saved language from localStorage on client side only
    const saved = localStorage.getItem('language') as Language | null;
    if (saved && (saved === 'zh' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    let text = translations[language][key] || key;
    
    // Replace parameters like {wage}
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

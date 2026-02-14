'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-zinc-900/80 rounded-full p-0.5 border border-zinc-700">
      <motion.button
        onClick={() => setLanguage('zh')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${
          language === 'zh'
            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        中文
      </motion.button>
      <motion.button
        onClick={() => setLanguage('en')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${
          language === 'en'
            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        EN
      </motion.button>
    </div>
  );
}

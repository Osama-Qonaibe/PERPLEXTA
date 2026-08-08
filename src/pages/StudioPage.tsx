import React from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { ShieldCheck, BookOpen, Cpu, CreditCard, Lock, FileText, Zap } from 'lucide-react';
import { DefaultLogo } from '../components/DefaultLogo';
import { resolveImageUrl } from '../utils/imageResolver';

export const StudioPage = () => {
  const { theme, language, siteSettings } = useAppContext();
  const siteName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;
  const logo = theme === 'dark' ? siteSettings.logoBase64 : (siteSettings.logoLightBase64 || siteSettings.logoBase64);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-primary)]/80 border-b border-[var(--border-main)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={resolveImageUrl(logo, 'general')} alt={siteName} className="w-8 h-8 rounded-[12px] object-cover" />
            ) : (
              <DefaultLogo className="w-8 h-8" iconClassName="w-5 h-5" />
            )}
            <h1 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-widest">
              {language === 'ar' ? 'استوديو بيربليكستا' : 'Perplexta Studio'}
            </h1>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#overview" className="text-sm font-bold text-gray-400 hover:text-emerald-500 transition-colors">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</a>
            <a href="#api" className="text-sm font-bold text-gray-400 hover:text-emerald-500 transition-colors">{language === 'ar' ? 'الربط البرمجي' : 'API'}</a>
            <a href="#subscription" className="text-sm font-bold text-gray-400 hover:text-emerald-500 transition-colors">{language === 'ar' ? 'الاشتراكات' : 'Subscription'}</a>
            <a href="#legal" className="text-sm font-bold text-gray-400 hover:text-emerald-500 transition-colors">{language === 'ar' ? 'القوانين' : 'Legal'}</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-20">
        <section className="text-center space-y-6">
          <h2 className="text-5xl font-black uppercase tracking-tight">
            {language === 'ar' ? 'استوديو بيربليكستا: البنية التقنية السيادية' : 'PERPLEXTA Studio: Sovereign Technical Architecture'}
          </h2>
          <p className="max-w-2xl mx-auto text-gray-500 text-lg">
            {language === 'ar' ? 'مساحة متكاملة للمطورين لاستكشاف الأدوات، الربط البرمجي، والاشتراكات النخبة.' : 'A comprehensive workspace for developers to explore tools, API integration, and premium elite subscriptions.'}
          </p>
        </section>

        <section id="overview" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-emerald-500/50 transition-theme">
            <BookOpen className="text-emerald-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'الأدوات وسير العمل' : 'Tools & Workflows'}</h3>
            <p className="text-gray-400">
              {language === 'ar' 
                ? 'منصة سيادية متكاملة مصممة خصيصاً للشركات والتجار لحماية الأرباح والقضاء على الهدر المالي. نجمع لك توليد المحتوى الذكي بالذكاء الاصطناعي مع نظام إعلاني محلي موجه جغرافياً، لخلق بيئة تجارية نقية خالية من الحسابات الوهمية.'
                : 'A sovereign platform designed for businesses and merchants to protect profits and eliminate financial waste. We combine intelligent AI content generation with local geo-targeted advertising for a pure, bot-free commercial environment.'}
            </p>
          </div>
          <div id="api" className="p-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-emerald-500/50 transition-theme">
            <Cpu className="text-emerald-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'الربط البرمجي API' : 'API Integration'}</h3>
            <p className="text-gray-400">
              {language === 'ar'
                ? 'بوابتك التقنية لربط منظومتك وأنظمتك الخارجية مباشرة مع محركات بيربليكستا السيادية. استمتع بواقع برمجي مرن وآمن يتيح لك أتمتة العمليات التجارية وتكامل خدماتك بأعلى معايير الأمان.'
                : 'Your technical gateway to link your systems directly with Perplexta sovereign engines. Enjoy a flexible, secure API environment to automate commercial processes and integrate services with top-tier security.'}
            </p>
          </div>
          <div id="subscription" className="p-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-emerald-500/50 transition-theme">
            <CreditCard className="text-emerald-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'الاشتراكات' : 'Subscriptions'}</h3>
            <p className="text-gray-400">
              {language === 'ar'
                ? 'وداعاً للعمولات المرتفعة والمصاريف الإعلانية المرهقة التي تلتهم أرباحك. اختر البنية التي تناسب حجم مشروعك، وتمتع بصلاحيات غير محدودة تضعك في قمة المنافسة.'
                : 'Say goodbye to high commissions and exhausting advertising expenses that eat your profits. Choose the plan that fits your project size and enjoy unlimited powers that put you at the top of the competition.'}
            </p>
          </div>
          <div id="legal" className="p-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-emerald-500/50 transition-theme">
            <ShieldCheck className="text-emerald-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'القوانين' : 'Legal'}</h3>
            <p className="text-gray-400">
              {language === 'ar'
                ? 'بيئة عمل تحترم السيادة الرقمية والخصوصية التامة. اطلع على البروتوكولات المنظمة لاستخدام المنصة، وحقوق التجار والمستخدمين، لضمان معاملات تجارية آمنة وشفافة.'
                : 'A workspace that respects digital sovereignty and absolute privacy. Review the protocols organizing platform usage, merchant and user rights, ensuring safe, transparent commercial transactions.'}
            </p>
          </div>
        </section>

        <footer className="pt-10 border-t border-gray-250/20 dark:border-gray-800/40 space-y-10">
          <div className="text-center">
            <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-widest uppercase font-mono">
              {language === 'ar' ? "فيرال لينك اب - نبتكر لنحمي بياناتك" : "VIRALLINKUP - INNOVATING TO PROTECT YOUR DATA"}
            </p>
          </div>

          <div className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 space-y-4 max-w-4xl mx-auto shadow-inner">
            <div className="flex items-center gap-3 text-gray-900 dark:text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <h3 className="text-base md:text-lg font-black">{language === 'ar' ? "حقوق الملكية الفكرية" : "Intellectual Property Rights"}</h3>
            </div>
            <p className="text-xs md:text-sm leading-relaxed text-gray-600 dark:text-gray-300 font-semibold font-sans">
              {language === 'ar' 
                ? "جميع الحقوق البرمجية، العلامة التجارية، ومنطق الربط الذكي الخاص بـ بيربليكستا وكافة مشاريعنا هي حقوق محفوظة لشركة فيرال لينك اب المحدودة. أي محاولة لإعادة الإنتاج أو الاستخدام غير المصرح به تعرض الفاعل للمساءلة القانونية الدولية"
                : "All software rights, trademarks, and the smart connection logic of PERPLEXTA and all our projects are reserved rights of VIRALLINKUP LTD. Any attempt at reproduction or unauthorized use exposes the actor to international legal accountability"}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

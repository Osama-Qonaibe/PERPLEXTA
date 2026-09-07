import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  ShieldCheck, Cpu, CreditCard, Sparkles, 
  ChevronRight, ChevronLeft, ArrowUpRight,
  MessageSquare, Terminal
} from 'lucide-react';
import { resolveImageUrl } from '../utils/imageResolver';

export const StudioPage: React.FC = () => {
  const { theme, language, siteSettings, dir } = useAppContext();
  const navigate = useNavigate();
  const siteName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;
  const logo = theme === 'dark' ? siteSettings.logoBase64 : (siteSettings.logoLightBase64 || siteSettings.logoBase64);

  const studioFeatures = [
    {
      id: 'chat_engine',
      icon: <MessageSquare className="w-5 h-5 text-accent" />,
      title: language === 'ar' ? 'المحادثة والتحليل الذكي' : 'Smart Chat & Reasoning',
      desc: language === 'ar' ? 'محركات ذكاء اصطناعي متعددة مع نظام التوجيه والتبديل الصامت.' : 'Multi-model AI engines with dynamic failover orchestration.',
      action: () => navigate('/chat'),
      badge: language === 'ar' ? 'نشط' : 'Active'
    },
    {
      id: 'bulletin_hub',
      icon: <Sparkles className="w-5 h-5 text-accent" />,
      title: language === 'ar' ? 'منصة فيرال بوك والمجتمع' : 'ViralBook Community Hub',
      desc: language === 'ar' ? 'مجتمع تفاعلي، ريلز، وقنوات تجارية موثقة بدقة متناهية.' : 'Interactive feed, verified commercial pages, and short reels.',
      action: () => navigate('/bulletin'),
      badge: language === 'ar' ? 'شائع' : 'Trending'
    },
    {
      id: 'api_portal',
      icon: <Terminal className="w-5 h-5 text-accent" />,
      title: language === 'ar' ? 'بوابة المطورين والـ API' : 'Developer & API Portal',
      desc: language === 'ar' ? 'مفاتيح API، توجيه الروبوتات، والتحليلات البرمجية المستقلة.' : 'API keys, autonomous bots routing, and programmatic workflows.',
      action: () => navigate('/settings/developer'),
      badge: language === 'ar' ? 'للمطورين' : 'Devs'
    },
    {
      id: 'wallet_economy',
      icon: <CreditCard className="w-5 h-5 text-accent" />,
      title: language === 'ar' ? 'المحفظة والاشتراكات' : 'Wallet & Plans',
      desc: language === 'ar' ? 'نظام مالي مدقق بسجل غير قابل للتعديل لشحن النقاط والترقية.' : 'Audited ledger financial system for credits and tier upgrades.',
      action: () => navigate('/settings/wallet'),
      badge: language === 'ar' ? 'آمن' : 'Secure'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-[var(--text-primary)] font-sans pb-24 md:pb-12">
      {/* Native App Bar Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--surface-page)]/90 border-b border-[var(--border-main)] pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="h-9 px-3 flex items-center gap-1 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[var(--text-primary)] hover:text-accent transition-theme active:scale-95 cursor-pointer"
            >
              {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              <span className="text-xs font-bold">{dir === 'rtl' ? 'رجوع' : 'Back'}</span>
            </button>
            <div className="flex items-center gap-2">
              {logo ? (
                <img src={resolveImageUrl(logo, 'general')} alt={siteName} className="w-7 h-7 rounded-[6px] object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-[6px] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5 text-accent" />
                </div>
              )}
              <h1 className="text-sm font-bold tracking-wide uppercase">
                {language === 'ar' ? 'استوديو بيربليكستا' : 'Perplexta Studio'}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Banner Section */}
        <section className="p-5 sm:p-7 rounded-[var(--radius)] bg-gradient-to-br from-[var(--surface-card)] to-[var(--surface-subtle)] border border-[var(--border-main)] shadow-xs relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-accent-muted)] border border-[var(--border-accent)]/30 text-accent text-[11px] font-bold">
              <Sparkles size={12} />
              <span>{language === 'ar' ? 'بيئة الإنتاج والتحليل' : 'Production & Suite'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              {language === 'ar' ? 'منظومة الاستوديو والأدوات المتقدمة' : 'Sovereign Studio & Tooling System'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {language === 'ar' 
                ? 'استكشف مسارات العمل، محركات الذكاء الاصطناعي، وخدمات المجتمع والمطورين ضمن بنية أداء عالية السرعة.' 
                : 'Explore workflows, AI generation capabilities, community hubs, and developer integrations with ultra-low latency.'}
            </p>
          </div>
        </section>

        {/* Feature Navigation Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {studioFeatures.map((feat) => (
            <div 
              key={feat.id}
              onClick={feat.action}
              className="p-4 rounded-[var(--radius)] bg-[var(--surface-card)] border border-[var(--border-main)] hover:border-accent/50 active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between group shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-center group-hover:scale-105 transition-transform">
                    {feat.icon}
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-main)]">
                    {feat.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-accent transition-colors flex items-center gap-1">
                    {feat.title}
                    <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                    {feat.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Sovereign IP & Security Anchor */}
        <footer className="pt-4 border-t border-[var(--border-main)] space-y-4 text-center">
          <div className="p-4 rounded-[var(--radius)] border border-[var(--border-main)] bg-[var(--surface-card)] max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-center gap-2 text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                {language === 'ar' ? 'السيادة الرقمية وحماية البيانات' : 'Digital Sovereignty & Security'}
              </h4>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {language === 'ar'
                ? 'كافة المحركات وأنظمة الربط والتشفير محمية بنظام تشفير سيادي معزول لضمان خصوصية بيانات المستخدمين وأمان المعاملات.'
                : 'All engines, orchestration layers, and encryption routines are isolated to guarantee absolute data privacy and security.'}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

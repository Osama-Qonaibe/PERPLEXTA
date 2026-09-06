import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Compass, 
  Sliders, 
  Megaphone, 
  Zap, 
  BookOpen, 
  TrendingUp, 
  Layers, 
  RefreshCw, 
  Award, 
  CheckCircle, 
  Tag, 
  ChevronRight, 
  Activity,
  UserCheck
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { RecommendationWidget } from '../components/RecommendationWidget';
import { RecommendationPreferencesModal } from '../components/RecommendationPreferencesModal';
import { EngagementTrendsChart } from '../components/EngagementTrendsChart';

export const RecommendationsPage: React.FC = () => {
  const { language, dir, token, user, setIsAuthModalOpen } = useAppContext();
  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);
  const [userSummary, setUserSummary] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    if (token && user) {
      fetchUserSummary();
    }
  }, [token, user, refreshKey]);

  const fetchUserSummary = async () => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommendations?limit=4', { headers });
      const data = await res.json();
      if (data.success && data.user_summary) {
        setUserSummary(data.user_summary);
      }
    } catch (err) {
      console.error('[RecommendationsPage] Fetch summary error:', err);
    }
  };

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full p-8 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] text-center shadow-2xl relative overflow-hidden"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto mb-5 shadow-inner">
            <Sparkles size={32} />
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            {language === 'ar' ? 'محرك التوصيات المخصصة' : 'Personalized Recommendation Engine'}
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
            {language === 'ar' 
              ? 'ميزة التوصيات الذكية متاحة حصرياً للأعضاء المسجلين. سجّل الدخول للحصول على ترشيحات دقيقة ومخصصة بناءً على نشاطك واهتماماتك.'
              : 'The smart recommendation engine is exclusively available to logged-in members to deliver tailored recommendations based on your activity and preferences.'}
          </p>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-3.5 px-6 rounded-xl bg-accent text-white font-extrabold text-sm shadow-md hover:opacity-90 transition-theme flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck size={18} />
            <span>{language === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] pb-16">
      {/* Page Sticky Header */}
      <div className="sticky top-0 z-30 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 py-3.5 transition-theme">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-sm">
              <Compass size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                {language === 'ar' ? 'محرك الاكتشاف الذكي' : 'AI Discovery Hub'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  v2.0 Elite Engine
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {language === 'ar' 
                  ? 'ترشيح موجه بالذكاء الاصطناعي يتوافق مع أهدافك' 
                  : 'AI curation matching digital services and tools to your goals'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrefModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-theme cursor-pointer"
            >
              <Sliders size={14} />
              <span>{language === 'ar' ? 'ضبط التفضيلات' : 'Customize Preferences'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">
        {/* User Interaction & Vector Intelligence Banner */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-gray-500/10[0.04] via-[var(--bg-surface)] to-[var(--fg-accent)]/[0.04] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden shadow-sm">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
              <Activity size={22} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                {language === 'ar' ? 'ملف التوصيات المخصصة لـ ' : 'Recommendation Vector for '}
                <span className="text-accent">{user?.name || (language === 'ar' ? 'المستخدم' : 'Guest')}</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {language === 'ar'
                  ? 'يقوم المحرك بدمج تفاعلاتك السابقة، مشترياتك، والخدمات المحفوظة لحساب درجات التوافق بقدقة عالية.'
                  : 'Your vector synthesizes interactions, purchases, and saved services to calculate high-precision match scores.'}
              </p>

              {userSummary?.top_inferred_categories?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[10px] font-bold text-[var(--text-muted)]">
                    {language === 'ar' ? 'المجالات المستنتجة:' : 'Inferred Interests:'}
                  </span>
                  {userSummary.top_inferred_categories.map((cat: string, idx: number) => (
                    <span
                      key={`rec-cat-${cat}-${idx}`}
                      className="text-[10px] font-extrabold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md capitalize"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
              <p className="text-lg font-black text-accent">
                {userSummary?.avg_match_percentage ? `${userSummary.avg_match_percentage}%` : '88%'}
              </p>
              <p className="text-[10px] font-bold text-[var(--text-muted)]">
                {language === 'ar' ? 'دقة الترشيح' : 'Match Precision'}
              </p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
              <p className="text-lg font-black text-accent">
                {userSummary?.total_recommendations ? `${userSummary.total_recommendations}+` : '15+'}
              </p>
              <p className="text-[10px] font-bold text-[var(--text-muted)]">
                {language === 'ar' ? 'عنصر مرشح' : 'Active Recommendations'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 0: D3 Analytics & Engagement Trends */}
        <section className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <EngagementTrendsChart initialTimeframe="30d" />
        </section>

        {/* Section 1: Top Picks Unified Widget */}
        <section className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <RecommendationWidget
            variant="full"
            limit={8}
            onOpenPreferences={() => setIsPrefModalOpen(true)}
          />
        </section>

        {/* Section 2: Viralbook Posts & Ads */}
        <section className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-attention-muted)] border border-[var(--border-default)] flex items-center justify-center text-[var(--fg-attention)]">
                <Megaphone size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  {language === 'ar' ? 'منشورات وخدمات فايرال بوك (Viralbook)' : 'Viralbook Feeds & Recommended Listings'}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {language === 'ar' ? 'منشورات رائجة وعروض نشطة تحظى بتفاعل عالي على شبكة Viralbook' : 'Trending posts and active service offers on Viralbook with high engagement'}
                </p>
              </div>
            </div>
          </div>

          <RecommendationWidget
            variant="compact"
            filterType="bulletin"
            limit={4}
          />
        </section>

        {/* Section 4: AI Tools & Assistants */}
        <section className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  {language === 'ar' ? 'أدوات الذكاء الاصطناعي المقترحة لزيادة الإنتاجية' : 'Recommended AI Productivity Tools'}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {language === 'ar' ? 'مساعدات ذكاء اصطناعي لتسريع البرمجة، التحليل، والتسويق' : 'AI assistants customized for code auditing, strategy analysis, and design'}
                </p>
              </div>
            </div>
          </div>

          <RecommendationWidget
            variant="compact"
            filterType="tool"
            limit={4}
          />
        </section>
      </div>

      {/* Preferences Modal */}
      <RecommendationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        onSaved={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
};

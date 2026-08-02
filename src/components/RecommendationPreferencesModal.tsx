import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, X, Check, Save, RotateCcw, Sparkles, Tag, DollarSign, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface RecommendationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const CATEGORY_OPTIONS = [
  { id: 'development', name_en: 'Software Development & Scripts', name_ar: 'تطوير البرمجيات والسكربتات' },
  { id: 'design', name_en: 'UI/UX & Graphic Design', name_ar: 'التصميم والواجهات والتجربة' },
  { id: 'ai_tools', name_en: 'AI & Automation Tools', name_ar: 'أدوات الذكاء الاصطناعي والأتمتة' },
  { id: 'marketing', name_en: 'Digital Marketing & Growth', name_ar: 'التسويق الرقمي وإدارة الحملات' },
  { id: 'services', name_en: 'Professional Freelance Services', name_ar: 'الخدمات المهنية والمستقلة' },
  { id: 'real_estate', name_en: 'Listings & Opportunities', name_ar: 'العقارات والفرص التجارية' },
  { id: 'business', name_en: 'Business Plans & Strategy', name_ar: 'خطط الأعمال والإستراتيجيات' },
  { id: 'content', name_en: 'Articles, Research & Guides', name_ar: 'المقالات والبحوث والأدلة' },
];

export const RecommendationPreferencesModal: React.FC<RecommendationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { language, dir, token } = useAppContext();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchPreferences();
    }
  }, [isOpen, token]);

  const fetchPreferences = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/recommendations/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.preferences) {
        setSelectedCategories(data.preferences.preferred_categories || []);
        if (data.preferences.preferred_price_range?.max) {
          setMaxPrice(data.preferences.preferred_price_range.max);
        }
      }
    } catch (err) {
      console.error('[RecommendationPreferencesModal] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/recommendations/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          preferred_categories: selectedCategories,
          preferred_price_range: { min: 0, max: maxPrice }
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(language === 'ar' ? 'تم حفظ تفضيلات التوصيات بنجاح' : 'Preferences saved successfully');
        if (onSaved) onSaved();
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('[RecommendationPreferencesModal] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  {language === 'ar' ? 'تخصيص تفضيلات التوصيات الذكية' : 'Customize AI Recommendation Engine'}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {language === 'ar' ? 'حدّد المجالات والنطاق السعري لضبط المقترحات وفق اهتماماتك' : 'Select categories & budget limits to tune your recommendations'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-emerald-500">
              <RefreshCw size={24} className="animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Category Selector */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-2.5">
                  <Tag size={14} className="text-emerald-500" />
                  <span>{language === 'ar' ? 'مجالات الاهتمام المفضلّة' : 'Preferred Categories'}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                  {CATEGORY_OPTIONS.map(cat => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-theme text-start ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-sm'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)] hover:border-gray-400 dark:hover:border-gray-700'
                        }`}
                      >
                        <span className="truncate">{language === 'ar' ? cat.name_ar : cat.name_en}</span>
                        {isSelected && <Check size={14} className="shrink-0 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-500" />
                    <span>{language === 'ar' ? 'الحد الأقصى للميزانية' : 'Maximum Budget Limit'}</span>
                  </label>
                  <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    ${maxPrice} USD
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="10000"
                  step="50"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-semibold mt-1">
                  <span>$50 USD</span>
                  <span>$10,000+ USD</span>
                </div>
              </div>

              {/* Success Alert */}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 flex items-center gap-2">
                  <Check size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{language === 'ar' ? 'حفظ التفضيلات' : 'Save Preferences'}</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

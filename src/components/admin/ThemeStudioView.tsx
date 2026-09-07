import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Palette, Save, RotateCcw, Check, Sparkles, Sliders, Moon, Sun, Layers, MessageSquare, Box, Edit3 } from "lucide-react";

interface ThemeStudioViewProps {
  t: (key: string, replacements?: any) => string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  token: string | null;
  language: string;
}

const DEFAULT_LIGHT_TOKENS: Record<string, string> = {
  "--surface-page": "#faf9f5",
  "--surface-canvas": "#faf9f5",
  "--surface-card": "#efe9de",
  "--surface-raised": "#efe9de",
  "--surface-subtle": "#f5f0e8",
  "--surface-inset": "#ebe6df",
  "--bg-input": "#f5f0e8",
  "--fg-primary": "#141413",
  "--fg-secondary": "#3d3d3a",
  "--fg-muted": "#6c6a64",
  "--fg-accent": "#cc785c",
  "--bg-accent-emphasis": "#cc785c",
  "--fg-on-emphasis": "#ffffff",
  "--border-default": "#e6dfd8",
  "--border-outer-input": "#d1c7bd",
  "--border-inner-input": "#e0d6cc",
  "--border-accent": "#cc785c",
  "--border-focus": "#d1c7bd",
  "--accent": "#cc785c",
  "--accent-hover": "#a9583e",
  "--chat-bubble-user": "#cc785c",
  "--chat-bubble-assistant": "#efe9de",
  "--fg-success": "#5db872",
  "--fg-warning": "#e8a55a",
  "--fg-danger": "#c64545",
  "--fg-info": "#5db8a6"
};

const DEFAULT_DARK_TOKENS: Record<string, string> = {
  "--surface-page": "#181715",
  "--surface-canvas": "#181715",
  "--surface-card": "#1f1e1b",
  "--surface-raised": "#1f1e1b",
  "--surface-subtle": "#252320",
  "--surface-inset": "#2a2825",
  "--bg-input": "#252320",
  "--fg-primary": "#faf9f5",
  "--fg-secondary": "#a09d96",
  "--fg-muted": "#6c6a64",
  "--fg-accent": "#d4957f",
  "--bg-accent-emphasis": "#cc785c",
  "--fg-on-emphasis": "#ffffff",
  "--border-default": "rgba(250, 249, 245, 0.10)",
  "--border-outer-input": "rgba(250, 249, 245, 0.15)",
  "--border-inner-input": "rgba(250, 249, 245, 0.08)",
  "--border-accent": "#d4957f",
  "--border-focus": "rgba(250, 249, 245, 0.15)",
  "--accent": "#cc785c",
  "--accent-hover": "#a9583e",
  "--chat-bubble-user": "#cc785c",
  "--chat-bubble-assistant": "#1f1e1b",
  "--fg-success": "#5db872",
  "--fg-warning": "#e8a55a",
  "--fg-danger": "#e5735f",
  "--fg-info": "#5db8a6"
};

const TOKEN_LABELS: Record<string, { en: string; ar: string; category: string }> = {
  "--surface-page": { en: "Page Background", ar: "خلفية الصفحة الرئيسية العامة", category: "surfaces" },
  "--surface-card": { en: "Card & Modal Background", ar: "خلفية البطاقات والنوافذ واللوحات", category: "surfaces" },
  "--surface-subtle": { en: "Subtle Sections Background", ar: "خلفية الأقسام الفرعية والثانوية", category: "surfaces" },
  "--surface-inset": { en: "Inset Overlays", ar: "الطبقات الداخلية المتداخلة", category: "surfaces" },
  "--bg-input": { en: "Input & Textarea Background", ar: "خلفية حقول الإدخال والبحث", category: "inputs" },
  "--border-default": { en: "Default Borders & Dividers", ar: "الحدود والفواصل العادية", category: "borders" },
  "--border-outer-input": { en: "Outer Input & Container Border", ar: "الحدود الخارجية للحقول والعناصر", category: "borders" },
  "--border-inner-input": { en: "Inner Input & Container Border", ar: "الحدود الداخلية للحقول والعناصر", category: "borders" },
  "--border-accent": { en: "Focus & Active Accent Border", ar: "حدود التمييز عند التركيز", category: "borders" },
  "--border-focus": { en: "Input Focus & Active Border", ar: "حدود التركيز النشط لحقول الإدخال", category: "borders" },
  "--bg-accent-emphasis": { en: "Button Background (Primary)", ar: "خلفية الأزرار الرئيسية والإجراءات", category: "buttons" },
  "--fg-on-emphasis": { en: "Button Text Color", ar: "لون نص الأزرار الرئيسية", category: "buttons" },
  "--accent": { en: "Brand Accent & Active Color", ar: "لون التمييز والهوية البصرية", category: "buttons" },
  "--accent-hover": { en: "Button Hover State (عند التمرير)", ar: "لون الأزرار وعناصر التفاعل عند التمرير (Hover)", category: "buttons" },
  "--chat-bubble-user": { en: "Chat Bubble (User)", ar: "فقاعة رسائل المستخدم في الدردشة", category: "chat" },
  "--chat-bubble-assistant": { en: "Chat Bubble (Assistant)", ar: "فقاعة رسائل المساعد الذكي", category: "chat" },
  "--fg-primary": { en: "Primary Text Color", ar: "لون النصوص الأساسية", category: "typography" },
  "--fg-secondary": { en: "Secondary Text Color", ar: "لون النصوص الثانوية", category: "typography" },
  "--fg-muted": { en: "Muted & Helper Text", ar: "لون النصوص الهامشية والباهتة", category: "typography" },
  "--fg-success": { en: "Success State Color", ar: "لون العمليات الناجحة", category: "status" },
  "--fg-warning": { en: "Warning State Color", ar: "لون التحذيرات", category: "status" },
  "--fg-danger": { en: "Error & Danger Color", ar: "لون الأخطاء والعمليات الخطرة", category: "status" },
  "--fg-info": { en: "Info State Color", ar: "لون المعلومات والإشعارات", category: "status" }
};

export const ThemeStudioView: React.FC<ThemeStudioViewProps> = ({ t, showToast, token, language }) => {
  const isAr = language === 'ar';
  const [activeMode, setActiveMode] = useState<'light' | 'dark'>('dark');
  const [lightTokens, setLightTokens] = useState<Record<string, string>>(DEFAULT_LIGHT_TOKENS);
  const [darkTokens, setDarkTokens] = useState<Record<string, string>>(DEFAULT_DARK_TOKENS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomizations();
  }, [token]);

  const fetchCustomizations = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/theme-customizations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.customizations) {
          if (data.customizations.light && Object.keys(data.customizations.light).length > 0) {
            setLightTokens(prev => ({ ...prev, ...data.customizations.light }));
          }
          if (data.customizations.dark && Object.keys(data.customizations.dark).length > 0) {
            setDarkTokens(prev => ({ ...prev, ...data.customizations.dark }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch theme customizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenChange = (mode: 'light' | 'dark', key: string, value: string) => {
    if (mode === 'light') {
      setLightTokens(prev => ({ ...prev, [key]: value }));
    } else {
      setDarkTokens(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async (modeToSave?: 'light' | 'dark') => {
    if (!token) return;
    try {
      setSaving(true);
      const modes = modeToSave ? [modeToSave] : ['light', 'dark'] as const;
      
      for (const mode of modes) {
        const tokens = mode === 'light' ? lightTokens : darkTokens;
        const res = await fetch('/api/admin/theme-customizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ theme_mode: mode, tokens })
        });
        if (!res.ok) throw new Error(`Failed to save ${mode} theme`);
      }

      showToast(isAr ? 'تم حفظ وتطبيق الحدود الخارجية والداخلية وألوان التمرير (Hover) بنجاح في قاعدة البيانات!' : 'Outer/inner borders and hover states saved and applied strictly!', 'success');
      
      // Trigger theme re-application immediately
      window.dispatchEvent(new Event('perplexta_theme_updated'));
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل حفظ تخصيصات المظهر' : 'Failed to save theme'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (mode: 'light' | 'dark') => {
    if (mode === 'light') {
      setLightTokens(DEFAULT_LIGHT_TOKENS);
    } else {
      setDarkTokens(DEFAULT_DARK_TOKENS);
    }
    showToast(isAr ? `تمت استعادة وحفظ القيم الافتراضية للوضع ${mode === 'light' ? 'الفاتح' : 'الداكن'}` : `Reset and saved ${mode} theme to defaults`, 'success');
    await handleSave(mode);
  };

  const currentTokens = activeMode === 'light' ? lightTokens : darkTokens;

  const categories = [
    { id: 'surfaces', nameAr: 'خلفيات البطاقات والصفحات (Surfaces & Cards)', nameEn: 'Surfaces & Cards' },
    { id: 'inputs', nameAr: 'حقول الإدخال والبحث (Inputs & Textareas)', nameEn: 'Inputs & Forms' },
    { id: 'borders', nameAr: 'الحدود الخارجية والداخلية والفواصل (Outer & Inner Borders)', nameEn: 'Outer & Inner Borders' },
    { id: 'buttons', nameAr: 'الأزرار وألوان التمرير عند التحويم (Buttons & Hover States)', nameEn: 'Buttons & Hover States' },
    { id: 'chat', nameAr: 'صفحة الدردشة والرسائل (Chat & Bubbles)', nameEn: 'Chat & Bubbles' },
    { id: 'typography', nameAr: 'الخطوط والنصوص (Typography)', nameEn: 'Typography' },
    { id: 'status', nameAr: 'حالات النظام والنجاح (Status & Alerts)', nameEn: 'Status & Alerts' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--surface-card)] border border-[var(--border-main)] p-6 rounded-[var(--radius-lg)] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Palette className="text-accent" size={24} />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {isAr ? 'استوديو التحكم المتقدم بالحدود والأزرار والتمرير (Advanced Theme Studio)' : 'Advanced Borders, Buttons & Hover Studio'}
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {isAr
              ? 'تحكم منفصل للحدود الخارجية والداخلية للحقول والبطاقات، وتخصيص ألوان الأزرار عند التمرير (Hover)، مع حفظ صارم في قاعدة البيانات.'
              : 'Separate control for outer and inner borders, button hover states, and sovereign database persistence.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleReset(activeMode)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-all font-bold text-sm"
          >
            <RotateCcw size={16} />
            {isAr ? 'استعادة الافتراضي' : 'Reset Defaults'}
          </button>
          
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 transition-all font-bold text-sm shadow-md disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
            {isAr ? 'حفظ وتطبيق فوري على الموقع' : 'Save & Apply Globally'}
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 bg-[var(--surface-subtle)] p-1.5 rounded-[var(--radius-md)] w-fit border border-[var(--border-main)]">
        <button
          onClick={() => setActiveMode('dark')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] font-bold text-sm transition-all ${
            activeMode === 'dark'
              ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-accent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Moon size={16} className="text-accent" />
          {isAr ? 'وضع الثيم الداكن (Dark Theme)' : 'Dark Theme Tokens'}
        </button>
        <button
          onClick={() => setActiveMode('light')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] font-bold text-sm transition-all ${
            activeMode === 'light'
              ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-accent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sun size={16} className="text-amber-500" />
          {isAr ? 'وضع الثيم الفاتح (Light Theme)' : 'Light Theme Tokens'}
        </button>
      </div>

      {/* Categories & Token Grid */}
      {loading ? (
        <div className="p-12 text-center text-[var(--text-muted)]">
          {isAr ? 'جاري تحميل تخصيصات المظهر من قاعدة البيانات...' : 'Loading theme customizations...'}
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(cat => {
            const catTokens = Object.keys(TOKEN_LABELS).filter(k => TOKEN_LABELS[k].category === cat.id);
            if (catTokens.length === 0) return null;

            return (
              <div key={cat.id} className="bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-main)]">
                  <Sliders size={18} className="text-accent" />
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {isAr ? cat.nameAr : cat.nameEn}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catTokens.map(tokenKey => {
                    const labelInfo = TOKEN_LABELS[tokenKey] || { en: tokenKey, ar: tokenKey };
                    const val = currentTokens[tokenKey] || '';

                    return (
                      <div key={tokenKey} className="bg-[var(--surface-subtle)] border border-[var(--border-main)] rounded-[var(--radius-md)] p-4 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-sm text-[var(--text-primary)]">
                              {isAr ? labelInfo.ar : labelInfo.en}
                            </span>
                            <span className="text-[11px] font-mono bg-[var(--surface-inset)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">
                              {tokenKey}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border-main)] shadow-sm shrink-0">
                            <input
                              type="color"
                              value={val.startsWith('#') ? val : '#181715'}
                              onChange={(e) => handleTokenChange(activeMode, tokenKey, e.target.value)}
                              className="absolute -inset-2 w-16 h-16 cursor-pointer border-0 p-0"
                            />
                          </div>

                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleTokenChange(activeMode, tokenKey, e.target.value)}
                            placeholder="#000000 or rgba(...)"
                            className="w-full bg-[var(--surface-page)] border border-[var(--border-main)] text-[var(--text-primary)] px-3 py-2 rounded-[var(--radius-sm)] text-xs font-mono focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

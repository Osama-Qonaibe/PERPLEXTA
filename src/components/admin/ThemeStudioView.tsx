import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palette,
  Save,
  RotateCcw,
  Moon,
  Sun,
  Settings,
  Download,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import {
  useThemeStudio,
  LiveThemePreview,
  TokenColorPicker,
  TokenSliderInput,
  ThemePresetsSelector,
  ThemeExportImportModal,
  TokenSearchBar,
  ThemeAuditModal,
  TOKEN_CATEGORIES_METADATA,
} from './theme';

interface ThemeStudioViewProps {
  t: (key: string, replacements?: any) => string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  token: string | null;
  language: string;
}

export const ThemeStudioView: React.FC<ThemeStudioViewProps> = ({
  t,
  showToast,
  token,
  language,
}) => {
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const {
    activeMode,
    setActiveMode,
    lightTokens,
    darkTokens,
    currentTokens,
    currentDefaultTokens,
    loading,
    saving,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    activePresetId,
    filteredDefinitions,
    handleTokenChange,
    handleSelectPreset,
    handleImportTokens,
    handleSave,
    handleReset,
  } = useThemeStudio(token, showToast, language);

  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);

  return (
    <div className="space-y-6 pb-16" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Sovereign Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--surface-card)] border border-[var(--border-main)] p-6 rounded-[var(--radius-lg)] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] flex items-center justify-center shadow-sm">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {isAr
                  ? 'استوديو حوكمة نظام التصميم والمظهر (Perplexta Design System & Theme Governance)'
                  : 'Perplexta Sovereign Design System & Theme Studio'}
              </h2>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                ENGINE V2.0 • GRANULAR TOKENS • WCAG COMPLIANT
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            {isAr
              ? 'التحكم المركزي التام في كافة رموز التصميم (Tokens)، الألوان، الخطوط، حدود العناصر، والانحناءات مع معاينة حية فورية ومزامنة سيادية مع قاعدة البيانات.'
              : 'Absolute sovereign governance over all color tokens, typography scales, interactive states, and elevation geometry with zero-latency live sandbox preview.'}
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/admin/settings')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-all font-bold text-xs cursor-pointer"
            title={isAr ? 'العودة لإعدادات النظام' : 'Return to Settings'}
          >
            <Settings size={14} />
            <span>{isAr ? 'الإعدادات' : 'Settings'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] border text-xs font-bold transition-all cursor-pointer ${
              showLivePreview
                ? 'border-accent text-accent bg-accent/10'
                : 'border-[var(--border-main)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {showLivePreview ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{isAr ? 'المعاينة الحية' : 'Live Preview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-bold transition-all cursor-pointer"
          >
            <ShieldCheck size={14} />
            <span>{isAr ? 'فحص الامتثال (Audit)' : 'Governance Audit'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-inset)] text-xs font-bold transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>{isAr ? 'تصدير / استيراد' : 'Import / Export'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleReset(activeMode)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-inset)] text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>{isAr ? 'استعادة الافتراضي' : 'Reset'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90 transition-all font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{isAr ? 'تعميم وحفظ دائم' : 'Commit & Deploy'}</span>
          </button>
        </div>
      </div>

      {/* Curated Theme Presets Selector */}
      <ThemePresetsSelector
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
        language={language}
      />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-[var(--surface-subtle)] p-1.5 rounded-[var(--radius-md)] border border-[var(--border-main)]">
          <button
            type="button"
            onClick={() => setActiveMode('dark')}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] font-bold text-xs transition-all cursor-pointer ${
              activeMode === 'dark'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Moon size={15} className="text-accent" />
            <span>{isAr ? 'الوضع الداكن (Dark Palette)' : 'Dark Palette'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('light')}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] font-bold text-xs transition-all cursor-pointer ${
              activeMode === 'light'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sun size={15} className="text-amber-500" />
            <span>{isAr ? 'الوضع الفاتح (Light Palette)' : 'Light Palette'}</span>
          </button>
        </div>

        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span>
            {isAr
              ? 'التعديلات تُطبق لحظياً على واجهة الموقع للمعاينة الحية'
              : 'Live real-time token injection active in viewport'}
          </span>
        </div>
      </div>

      {/* Interactive Sandbox Preview (Collapsible) */}
      {showLivePreview && (
        <LiveThemePreview
          tokens={currentTokens}
          mode={activeMode}
          language={language}
        />
      )}

      {/* Token Search & Category Filter */}
      <TokenSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        totalTokensCount={currentTokens ? Object.keys(currentTokens).length : 0}
        filteredCount={filteredDefinitions.length}
        language={language}
      />

      {/* Token Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-[var(--text-muted)] bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)]">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">
            {isAr ? 'جاري تحميل رموز ومصفوفة التصميم...' : 'Resolving design tokens from core registry...'}
          </p>
        </div>
      ) : filteredDefinitions.length === 0 ? (
        <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)]">
          <p className="text-xs">
            {isAr
              ? 'لم يتم العثور على أي رمز يطابق كلمة البحث.'
              : 'No tokens matched your search query or category filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDefinitions.map((def) => {
            const val = currentTokens[def.key] ?? '';
            const defVal = currentDefaultTokens[def.key] ?? '';

            if (def.type === 'size' || (def.options && def.options.length > 0)) {
              return (
                <TokenSliderInput
                  key={def.key}
                  definition={def}
                  value={val}
                  defaultValue={defVal}
                  onChange={(newVal) => handleTokenChange(activeMode, def.key, newVal)}
                  language={language}
                  showToast={showToast}
                />
              );
            }

            return (
              <TokenColorPicker
                key={def.key}
                definition={def}
                value={val}
                defaultValue={defVal}
                onChange={(newVal) => handleTokenChange(activeMode, def.key, newVal)}
                language={language}
                showToast={showToast}
              />
            );
          })}
        </div>
      )}

      {/* Export / Import Modal */}
      <ThemeExportImportModal
        isOpen={showExportImportModal}
        onClose={() => setShowExportImportModal(false)}
        lightTokens={lightTokens}
        darkTokens={darkTokens}
        activeMode={activeMode}
        onImportTokens={handleImportTokens}
        language={language}
        showToast={showToast}
      />

      {/* Design System Governance Audit Modal */}
      <ThemeAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        lightTokens={lightTokens}
        darkTokens={darkTokens}
        language={language}
      />
    </div>
  );
};

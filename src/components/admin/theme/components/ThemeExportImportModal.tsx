import React, { useState } from 'react';
import { X, Download, Upload, Copy, Check, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeTokensMap } from '../types';

interface ThemeExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lightTokens: ThemeTokensMap;
  darkTokens: ThemeTokensMap;
  activeMode: 'light' | 'dark';
  onImportTokens: (mode: 'light' | 'dark', tokens: ThemeTokensMap) => void;
  language: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ThemeExportImportModal: React.FC<ThemeExportImportModalProps> = ({
  isOpen,
  onClose,
  lightTokens,
  darkTokens,
  activeMode,
  onImportTokens,
  language,
  showToast,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'export_json' | 'export_css' | 'import_json'>('export_json');
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentTokens = activeMode === 'light' ? lightTokens : darkTokens;

  // Generate clean CSS Block
  const cssVariablesBlock = `:root[data-theme="${activeMode}"] {\n` +
    Object.entries(currentTokens)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n') +
    '\n}';

  const fullJsonExport = JSON.stringify(
    {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      theme: {
        light: lightTokens,
        dark: darkTokens,
      },
    },
    null,
    2
  );

  const modeJsonExport = JSON.stringify(currentTokens, null, 2);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(isAr ? 'تم النسخ إلى الحافظة بنجاح' : 'Copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([fullJsonExport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perplexta-theme-tokens-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(isAr ? 'تم تحميل ملف التخصيصات بنجاح' : 'Theme JSON downloaded successfully', 'success');
  };

  const handleProcessImport = () => {
    setImportError(null);
    try {
      if (!importJsonText.trim()) {
        setImportError(isAr ? 'يرجى لصق بيانات JSON' : 'Please paste JSON data');
        return;
      }
      const parsed = JSON.parse(importJsonText);

      // Check if full format or single mode map
      if (parsed.theme && (parsed.theme.light || parsed.theme.dark)) {
        if (parsed.theme.light) onImportTokens('light', parsed.theme.light);
        if (parsed.theme.dark) onImportTokens('dark', parsed.theme.dark);
        showToast(isAr ? 'تم استيراد كلا النمطين الفاتح والداكن بنجاح!' : 'Successfully imported full light and dark palettes!', 'success');
        onClose();
      } else if (typeof parsed === 'object') {
        // Single mode token map
        onImportTokens(activeMode, parsed);
        showToast(isAr ? `تم استيراد الرموز بنجاح للوضع ${activeMode === 'light' ? 'الفاتح' : 'الداكن'}!` : `Successfully imported tokens for ${activeMode} mode!`, 'success');
        onClose();
      } else {
        throw new Error(isAr ? 'تنسيق الملف غير صالح' : 'Invalid token schema structure');
      }
    } catch (err: any) {
      setImportError(err.message || (isAr ? 'خطأ في معالجة JSON' : 'Invalid JSON format'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-main)]">
          <div className="flex items-center gap-2.5">
            <FileCode className="text-accent" size={20} />
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              {isAr ? 'تصدير واستيراد رموز التصميم (Token Import/Export)' : 'Design Tokens Export & Import'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 p-3 bg-[var(--surface-subtle)] border-b border-[var(--border-main)]">
          <button
            type="button"
            onClick={() => setActiveTab('export_json')}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all ${
              activeTab === 'export_json'
                ? 'bg-[var(--surface-card)] text-accent shadow-xs border border-[var(--border-main)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isAr ? 'تصدير JSON كامل' : 'Full JSON Export'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export_css')}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all ${
              activeTab === 'export_css'
                ? 'bg-[var(--surface-card)] text-accent shadow-xs border border-[var(--border-main)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isAr ? 'تصدير كود CSS Variables' : 'CSS Variables (:root)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import_json')}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all ${
              activeTab === 'import_json'
                ? 'bg-[var(--surface-card)] text-accent shadow-xs border border-[var(--border-main)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isAr ? 'استيراد تخصيصات (Import)' : 'Import Tokens'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'export_json' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                {isAr
                  ? 'يمكنك تنزيل ملف التخصيصات كاملاً أو نسخه لاستخدامه في بيئات أخرى أو نقله بين الخوادم.'
                  : 'Download or copy the complete token state including both Light and Dark specifications.'}
              </p>
              <textarea
                readOnly
                value={fullJsonExport}
                className="w-full h-64 bg-[var(--surface-page)] border border-[var(--border-main)] rounded-[var(--radius-md)] p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(fullJsonExport)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-inset)] text-xs font-bold text-[var(--text-primary)] transition-all"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{isAr ? 'نسخ JSON' : 'Copy JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] text-xs font-bold hover:opacity-90 shadow-xs transition-all"
                >
                  <Download size={14} />
                  <span>{isAr ? 'تنزيل ملف .json' : 'Download .json'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'export_css' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                {isAr
                  ? 'كود متغيرات CSS الجاهز للصق المباشر في ملف stylesheet أو figma tokens.'
                  : 'Ready-to-use CSS custom properties for direct usage in global stylesheet or design handoffs.'}
              </p>
              <textarea
                readOnly
                value={cssVariablesBlock}
                className="w-full h-64 bg-[var(--surface-page)] border border-[var(--border-main)] rounded-[var(--radius-md)] p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none resize-none"
              />
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleCopy(cssVariablesBlock)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] text-xs font-bold hover:opacity-90 shadow-xs transition-all"
                >
                  {copied ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                  <span>{isAr ? 'نسخ كود CSS' : 'Copy CSS Variables'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import_json' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                {isAr
                  ? 'الصق كود JSON الخاص بالرموز أدناه. يدعم الهيكل الكامل (light + dark) أو خريطة الرموز المنفردة.'
                  : 'Paste your tokens JSON below. Supports either full schema ({ theme: { light, dark } }) or a single dictionary.'}
              </p>
              {importError && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
              <textarea
                placeholder='{\n  "--surface-page": "#181715",\n  "--accent": "#cc785c"\n}'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full h-64 bg-[var(--surface-page)] border border-[var(--border-main)] rounded-[var(--radius-md)] p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-accent resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] text-xs font-bold hover:opacity-90 shadow-xs transition-all cursor-pointer"
                >
                  <Upload size={14} />
                  <span>{isAr ? 'تطبيق واستيراد الرموز' : 'Parse & Apply Tokens'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

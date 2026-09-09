import { useState, useEffect, useCallback } from 'react';
import { ThemeMode, TokenCategory, ThemeTokensMap, ThemePreset } from '../types';
import { DEFAULT_LIGHT_TOKENS, DEFAULT_DARK_TOKENS } from '../tokens/defaultTokens';
import { TOKEN_REGISTRY } from '../tokens/registry';

export const useThemeStudio = (
  token: string | null,
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void,
  language: string
) => {
  const isAr = language === 'ar';
  const [activeMode, setActiveMode] = useState<'light' | 'dark'>('dark');
  const [lightTokens, setLightTokens] = useState<ThemeTokensMap>(DEFAULT_LIGHT_TOKENS);
  const [darkTokens, setDarkTokens] = useState<ThemeTokensMap>(DEFAULT_DARK_TOKENS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | undefined>('perplexta_warm');

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TokenCategory | 'all'>('all');

  // Fetch from database on mount or token change
  useEffect(() => {
    fetchCustomizations();
  }, [token]);

  const fetchCustomizations = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/admin/theme-customizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.customizations) {
          if (data.customizations.light && Object.keys(data.customizations.light).length > 0) {
            setLightTokens((prev) => ({ ...prev, ...data.customizations.light }));
          }
          if (data.customizations.dark && Object.keys(data.customizations.dark).length > 0) {
            setDarkTokens((prev) => ({ ...prev, ...data.customizations.dark }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch theme customizations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Live apply token changes to DOM during editing
  const applyTokensToDOM = useCallback((mode: 'light' | 'dark', tokens: ThemeTokensMap) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const currentThemeAttr = root.getAttribute('data-theme') || (root.classList.contains('dark') ? 'dark' : 'light');
    if (currentThemeAttr === mode) {
      Object.entries(tokens).forEach(([key, val]) => {
        if (val) root.style.setProperty(key, val);
      });
    }
  }, []);

  const handleTokenChange = (mode: 'light' | 'dark', key: string, value: string) => {
    if (mode === 'light') {
      setLightTokens((prev) => {
        const next = { ...prev, [key]: value };
        applyTokensToDOM('light', next);
        return next;
      });
    } else {
      setDarkTokens((prev) => {
        const next = { ...prev, [key]: value };
        applyTokensToDOM('dark', next);
        return next;
      });
    }
  };

  const handleSelectPreset = (preset: ThemePreset) => {
    setActivePresetId(preset.id);
    setLightTokens({ ...preset.tokens.light });
    setDarkTokens({ ...preset.tokens.dark });
    applyTokensToDOM(activeMode, activeMode === 'light' ? preset.tokens.light : preset.tokens.dark);
    showToast(
      isAr
        ? `تم تطبيق القالب: ${preset.nameAr} بنجاح!`
        : `Applied preset: ${preset.nameEn}! Remember to save to persist permanently.`,
      'info'
    );
  };

  const handleImportTokens = (mode: 'light' | 'dark', imported: ThemeTokensMap) => {
    if (mode === 'light') {
      setLightTokens((prev) => {
        const next = { ...prev, ...imported };
        applyTokensToDOM('light', next);
        return next;
      });
    } else {
      setDarkTokens((prev) => {
        const next = { ...prev, ...imported };
        applyTokensToDOM('dark', next);
        return next;
      });
    }
  };

  const handleSave = async (modeToSave?: 'light' | 'dark') => {
    if (!token) return;
    try {
      setSaving(true);
      const modes = modeToSave ? [modeToSave] : (['light', 'dark'] as const);

      for (const mode of modes) {
        const tokensToSave = mode === 'light' ? lightTokens : darkTokens;
        const res = await fetch('/api/admin/theme-customizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ theme_mode: mode, tokens: tokensToSave }),
        });
        if (!res.ok) throw new Error(`Failed to save ${mode} theme`);
      }

      showToast(
        isAr
          ? 'تم حفظ وتعميم كافة رموز التصميم في قاعدة البيانات بنجاح!'
          : 'All design tokens securely committed and deployed globally!',
        'success'
      );

      // Trigger global event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('perplexta_theme_updated'));
      }
    } catch (err: any) {
      showToast(err.message || (isAr ? 'فشل حفظ تخصيصات المظهر' : 'Failed to save theme'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (mode: 'light' | 'dark') => {
    if (mode === 'light') {
      setLightTokens(DEFAULT_LIGHT_TOKENS);
      applyTokensToDOM('light', DEFAULT_LIGHT_TOKENS);
    } else {
      setDarkTokens(DEFAULT_DARK_TOKENS);
      applyTokensToDOM('dark', DEFAULT_DARK_TOKENS);
    }
    showToast(
      isAr
        ? `تمت استعادة القيم الافتراضية للوضع ${mode === 'light' ? 'الفاتح' : 'الداكن'}`
        : `Reset ${mode} theme to system defaults`,
      'success'
    );
  };

  // Filtered tokens
  const currentTokens = activeMode === 'light' ? lightTokens : darkTokens;
  const currentDefaultTokens = activeMode === 'light' ? DEFAULT_LIGHT_TOKENS : DEFAULT_DARK_TOKENS;

  const filteredDefinitions = TOKEN_REGISTRY.filter((def) => {
    // Category match
    if (selectedCategory !== 'all' && def.category !== selectedCategory) {
      return false;
    }
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchKey = def.key.toLowerCase().includes(q);
      const matchEn = def.labelEn.toLowerCase().includes(q);
      const matchAr = def.labelAr.toLowerCase().includes(q);
      const matchDesc = def.descriptionEn.toLowerCase().includes(q) || def.descriptionAr.toLowerCase().includes(q);
      return matchKey || matchEn || matchAr || matchDesc;
    }
    return true;
  });

  return {
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
  };
};

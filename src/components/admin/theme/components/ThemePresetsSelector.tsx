import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { ThemePreset } from '../types';
import { THEME_PRESETS } from '../tokens/presets';

interface ThemePresetsSelectorProps {
  onSelectPreset: (preset: ThemePreset) => void;
  activePresetId?: string;
  language: string;
}

export const ThemePresetsSelector: React.FC<ThemePresetsSelectorProps> = ({
  onSelectPreset,
  activePresetId,
  language,
}) => {
  const isAr = language === 'ar';

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {isAr ? 'القوالب اللونية الجاهزة (Theme Presets)' : 'Curated Design Presets'}
          </h3>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {isAr ? 'تطبيق شامل بضغطة زر' : '1-Click Universal Application'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {THEME_PRESETS.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`p-3.5 rounded-[var(--radius-md)] border text-start cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-accent bg-[var(--surface-subtle)] ring-2 ring-accent/20 shadow-sm'
                  : 'border-[var(--border-main)] bg-[var(--surface-page)] hover:border-accent/40 hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <div>
                {/* 4-Color Swatch Bar */}
                <div className="flex items-center h-5 w-full rounded overflow-hidden mb-2.5 border border-black/10 shadow-xs">
                  <div className="h-full flex-1" style={{ backgroundColor: preset.previewColors.surface }} />
                  <div className="h-full flex-1" style={{ backgroundColor: preset.previewColors.card }} />
                  <div className="h-full flex-1" style={{ backgroundColor: preset.previewColors.accent }} />
                  <div className="h-full flex-1" style={{ backgroundColor: preset.previewColors.text }} />
                </div>

                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">
                    {isAr ? preset.nameAr : preset.nameEn}
                  </h4>
                  {isSelected && <Check size={14} className="text-accent shrink-0" />}
                </div>

                <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                  {isAr ? preset.descriptionAr : preset.descriptionEn}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-main)]/60 text-[10px] text-[var(--text-muted)]">
                <span>v{preset.version}</span>
                <span className="font-medium text-accent hover:underline">
                  {isAr ? 'تطبيق القالب' : 'Apply Preset'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { TokenCategory } from '../types';
import { TOKEN_CATEGORIES_METADATA } from '../tokens/registry';

interface TokenSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: TokenCategory | 'all';
  onSelectCategory: (cat: TokenCategory | 'all') => void;
  totalTokensCount: number;
  filteredCount: number;
  language: string;
}

export const TokenSearchBar: React.FC<TokenSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  totalTokensCount,
  filteredCount,
  language,
}) => {
  const isAr = language === 'ar';

  const categories: (TokenCategory | 'all')[] = [
    'all',
    'surfaces',
    'typography',
    'brand_accent',
    'borders_dividers',
    'buttons_controls',
    'inputs_forms',
    'admin_layout',
    'chat_messages',
    'status_alerts',
    'geometry_elevation',
  ];

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-main)] rounded-[var(--radius-lg)] p-4 shadow-sm space-y-3">
      {/* Search Input and Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute top-3 start-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder={
              isAr
                ? 'ابحث عن متغير، مثل: --surface-card أو الأزرار أو الحدود...'
                : 'Search tokens by key (e.g. --accent), label, or description...'
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full ps-10 pe-9 py-2 bg-[var(--surface-page)] border border-[var(--border-main)] rounded-[var(--radius-md)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute top-2.5 end-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono shrink-0">
          <span className="font-bold text-accent">{filteredCount}</span>
          <span>/</span>
          <span>{totalTokensCount} {isAr ? 'رمز تصميم' : 'tokens'}</span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const label =
            cat === 'all'
              ? isAr
                ? 'جميع الأقسام'
                : 'All Categories'
              : isAr
              ? TOKEN_CATEGORIES_METADATA[cat]?.nameAr || cat
              : TOKEN_CATEGORIES_METADATA[cat]?.nameEn || cat;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] shadow-xs'
                  : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-inset)] text-[var(--text-secondary)] border border-[var(--border-main)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

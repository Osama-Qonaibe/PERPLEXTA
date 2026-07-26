import React from 'react';

export interface HighlightTextProps {
  text: string | null | undefined;
  query?: string | string[];
  className?: string;
  highlightClassName?: string;
  idPrefix?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold px-1 py-0.5 rounded-[3px] border border-emerald-500/20 drop-shadow-[0_0_6px_rgba(16,185,129,0.35)] transition-all inline-block',
  idPrefix = 'hl',
}) => {
  if (!text) return null;

  let queryTerms: string[] = [];
  if (Array.isArray(query)) {
    queryTerms = query.map(q => (q ? q.trim() : '')).filter(Boolean);
  } else if (typeof query === 'string' && query.trim()) {
    queryTerms = [query.trim()];
  }

  if (queryTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const stopWords = new Set([
    'the', 'and', 'a', 'an', 'or', 'to', 'for', 'in', 'of', 'on', 'with', 'is', 'at', 'by', 'from', 'this', 'that', 'these', 'those', 'it', 'its', 'be', 'are', 'was', 'were',
    'من', 'إلى', 'عن', 'على', 'في', 'ب', 'ل', 'ك', 'و', 'أو', 'ثم', 'مع', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'فيما', 'حيث', 'ما', 'هل', 'كيف'
  ]);

  const searchTerms: string[] = [];

  queryTerms.forEach(rawTerm => {
    // Clean phrase
    const cleanPhrase = rawTerm.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanPhrase.length >= 2) {
      searchTerms.push(cleanPhrase);
    }

    // Individual keywords
    const keywords = cleanPhrase
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2 && !stopWords.has(w.toLowerCase()));

    searchTerms.push(...keywords);
  });

  const uniqueTerms = Array.from(new Set(searchTerms)).filter(Boolean);

  if (uniqueTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Sort by length descending to match longer phrases first
  const sortedTerms = uniqueTerms
    .map(term => term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);

  try {
    const pattern = `(${sortedTerms.join('|')})`;
    const isAr = /[\u0600-\u06FF]/.test(queryTerms.join(' '));
    const regex = new RegExp(pattern, isAr ? 'gi' : 'gi');
    const parts = text.split(regex);
    const testRegex = new RegExp(`^(${sortedTerms.join('|')})$`, 'i');

    return (
      <span className={className}>
        {parts.map((part, i) => {
          if (testRegex.test(part)) {
            return (
              <mark
                key={i}
                id={`${idPrefix}-match-${i}`}
                className={highlightClassName}
              >
                {part}
              </mark>
            );
          }
          return part;
        })}
      </span>
    );
  } catch (e) {
    return <span className={className}>{text}</span>;
  }
};

export default HighlightText;

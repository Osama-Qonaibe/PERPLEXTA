import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dir?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  dir = 'ltr'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={wrapperRef} dir={dir}>
      <div
        className={`w-full h-10 px-3 rounded-md border flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="truncate text-[11px] font-bold">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className="opacity-50" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[var(--border-main)] flex items-center gap-2">
             <Search size={14} className="opacity-50 text-[var(--text-primary)]" />
             <input
               type="text"
               className="w-full bg-transparent outline-none text-[11px] text-[var(--text-primary)] font-bold"
               placeholder="Search..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               autoFocus
               onClick={(e) => e.stopPropagation()}
             />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <div 
              className={`px-3 py-2 text-[11px] cursor-pointer hover:bg-[var(--surface-subtle)] ${!value ? 'bg-[var(--surface-inset)] font-bold' : ''}`}
              onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
            >
              {placeholder}
            </div>
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`px-3 py-2 text-[11px] font-bold cursor-pointer hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] ${value === option.value ? 'bg-[var(--surface-inset)] text-accent' : ''}`}
                onClick={() => { onChange(option.value); setIsOpen(false); setSearchTerm(''); }}
              >
                {option.label}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-[11px] font-bold opacity-50 text-center">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

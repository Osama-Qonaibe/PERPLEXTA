import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  dropdownPosition?: 'auto' | 'top' | 'bottom';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  dir = 'ltr',
  dropdownPosition = 'auto'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const calculatePosition = useCallback(() => {
    if (dropdownPosition === 'top') {
      setOpenUpward(true);
      return;
    }
    if (dropdownPosition === 'bottom') {
      setOpenUpward(false);
      return;
    }
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 240px below and more room above, open upwards
      if (spaceBelow < 250 && spaceAbove > 180) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [dropdownPosition]);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      const handleScrollOrResize = () => calculatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Strip empty-value options from options array to avoid duplicating the placeholder item
  const validOptions = options.filter(option => option.value !== '');

  const filteredOptions = validOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = validOptions.find(o => o.value === value);

  return (
    <div 
      className={`relative ${isOpen ? 'z-[100]' : 'z-10'} ${className}`} 
      ref={wrapperRef} 
      dir={dir}
      data-dropdown-open={isOpen ? "true" : "false"}
    >
      <div
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
        className={`w-full h-10 px-3 rounded-md border flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          isOpen
            ? 'border-accent ring-1 ring-accent/40 bg-[var(--bg-primary)] shadow-sm'
            : 'bg-[var(--bg-primary)] border-[var(--border-main)] hover:border-accent/40'
        } text-[var(--text-primary)]`}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) calculatePosition();
            setIsOpen(!isOpen);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) {
              if (!isOpen) calculatePosition();
              setIsOpen(!isOpen);
            }
          } else if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
          }
        }}
      >
        <span className="truncate text-[11px] font-bold text-start flex-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={14} 
          className={`opacity-60 transition-transform duration-200 shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-accent opacity-100' : ''
          }`} 
        />
      </div>

      {isOpen && (
        <div 
          className={`absolute z-[100] w-full min-w-[220px] ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } bg-[var(--surface-card)] border border-[var(--border-main)] rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100`}
          style={{
            boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-main)'
          }}
        >
          <div className="p-2 border-b border-[var(--border-main)] flex items-center gap-2 bg-[var(--surface-subtle)]/60">
             <Search size={14} className="opacity-50 text-[var(--text-primary)] shrink-0" />
             <input
               ref={inputRef}
               type="text"
               className="w-full bg-transparent outline-none text-[11px] text-[var(--text-primary)] font-bold placeholder:text-gray-400 placeholder:font-normal"
               placeholder="Search..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               onClick={(e) => e.stopPropagation()}
             />
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border-main)]/20 custom-scrollbar">
            <div 
              className={`px-3 py-2 text-[11px] cursor-pointer hover:bg-[var(--surface-subtle)] transition-colors ${
                !value ? 'bg-[var(--surface-inset)] font-bold text-accent' : 'text-[var(--text-secondary)]'
              }`}
              onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
            >
              {placeholder}
            </div>
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`px-3 py-2 text-[11px] font-bold cursor-pointer hover:bg-[var(--surface-subtle)] transition-colors ${
                  value === option.value ? 'bg-[var(--surface-inset)] text-accent' : 'text-[var(--text-primary)]'
                }`}
                onClick={() => { onChange(option.value); setIsOpen(false); setSearchTerm(''); }}
              >
                {option.label}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-3 text-[11px] font-medium text-gray-400 text-center">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


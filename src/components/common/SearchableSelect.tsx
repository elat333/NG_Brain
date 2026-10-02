import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  avatarUrl?: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | undefined | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  isClearable?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  required?: boolean;
  name?: string;
  id?: string;
  emptyMessage?: string;
}

// Normalize string for case- and accent-insensitive matching
const normalizeStr = (str: string): string => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder,
  disabled = false,
  isClearable = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  required = false,
  name,
  id,
  emptyMessage = 'No se encontraron resultados'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Sync display text when value changes and not actively typing
  useEffect(() => {
    if (!isTyping) {
      setQueryText(selectedOption ? selectedOption.label : '');
    }
  }, [selectedOption, isTyping]);

  // Filter options based on active typing query
  const filteredOptions = useMemo(() => {
    if (!isTyping || !queryText.trim()) return options;
    const term = normalizeStr(queryText);
    return options.filter((opt) => {
      const matchLabel = normalizeStr(opt.label).includes(term);
      const matchSublabel = opt.sublabel ? normalizeStr(opt.sublabel).includes(term) : false;
      const matchBadge = opt.badge ? normalizeStr(opt.badge).includes(term) : false;
      return matchLabel || matchSublabel || matchBadge;
    });
  }, [options, isTyping, queryText]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    if (isOpen) {
      if (selectedOption) {
        const idx = filteredOptions.findIndex(o => String(o.value) === String(selectedOption.value));
        setHighlightedIndex(idx >= 0 ? idx : 0);
      } else {
        setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
      }
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, filteredOptions, selectedOption]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-combobox-item]');
      const target = items[highlightedIndex] as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setQueryText(selectedOption ? selectedOption.label : '');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, selectedOption]);

  const handleSelectOption = (opt: SearchableSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setQueryText(opt.label);
    setIsTyping(false);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQueryText(val);
    setIsTyping(true);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    // If there is an existing selection, select the text so user can easily overwrite
    if (selectedOption && !isTyping) {
      setTimeout(() => inputRef.current?.select(), 10);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQueryText('');
    setIsTyping(false);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelectOption(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setIsTyping(false);
      setQueryText(selectedOption ? selectedOption.label : '');
      inputRef.current?.blur();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setIsTyping(false);
      setQueryText(selectedOption ? selectedOption.label : '');
    }
  };

  const effectivePlaceholder = searchPlaceholder || placeholder;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-left font-sans ${className}`}
    >
      {/* Hidden input for HTML form validation */}
      {name && (
        <input
          type="hidden"
          name={name}
          id={id}
          value={value || ''}
          required={required}
        />
      )}

      {/* Main Combobox Input Container */}
      <div
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            if (!isOpen) setIsOpen(true);
          }
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs md:text-sm font-medium rounded-xl border transition-all cursor-text outline-none ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'bg-white text-slate-900 border-indigo-500 ring-2 ring-indigo-500/10 shadow-xs'
            : 'bg-white hover:bg-slate-50/70 text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Avatar / Icon of selected item (when not typing a search query) */}
          {!isTyping && selectedOption && (
            <>
              {selectedOption.icon && (
                <span className="shrink-0 text-slate-400">{selectedOption.icon}</span>
              )}
              {selectedOption.avatarUrl && (
                <img
                  src={selectedOption.avatarUrl}
                  alt={selectedOption.label}
                  className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                />
              )}
            </>
          )}

          {/* Inline Search Input */}
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={queryText}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            className={`w-full bg-transparent border-none outline-none p-0 text-xs md:text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal truncate ${
              disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-800'
            }`}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Badge of selected item (if exists and not typing) */}
          {!isTyping && selectedOption?.badge && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                selectedOption.badgeColor || 'bg-slate-100 text-slate-600'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Action icons: Clear and Chevron */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isClearable && (value || queryText) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Limpiar"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                } else {
                  inputRef.current?.focus();
                  setIsOpen(true);
                }
              }
            }}
            className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-indigo-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Direct Dropdown Results List (No redundant search bar inside) */}
      {isOpen && (
        <div
          ref={listRef}
          className={`absolute z-50 mt-1.5 w-full min-w-[220px] max-h-60 overflow-y-auto custom-scrollbar bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 text-xs text-slate-700 animate-in fade-in-50 zoom-in-95 duration-100 ${menuClassName}`}
          role="listbox"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={`opt_${opt.value || idx}`}
                  data-combobox-item
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectOption(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer select-none ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed bg-transparent'
                      : isHighlighted || isSelected
                      ? 'bg-indigo-50 text-indigo-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {opt.icon && (
                      <span
                        className={`shrink-0 ${
                          isSelected ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      >
                        {opt.icon}
                      </span>
                    )}
                    {opt.avatarUrl && (
                      <img
                        src={opt.avatarUrl}
                        alt={opt.label}
                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 ${
                              opt.badgeColor || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-indigo-600 shrink-0 ml-1" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-6 px-3 text-center text-slate-400 text-xs font-medium">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

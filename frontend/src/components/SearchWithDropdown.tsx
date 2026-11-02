import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, List } from 'lucide-react';

interface SearchableDropdownProps {
  options?: any[];
  value?: string | any;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  returnFullObject?: boolean;
  disabled?: boolean;
  hideSearchByDefault?: boolean;
}

export default function SearchableDropdown({
  options = [],
  value = '',
  onChange,
  label = "Field",
  placeholder = undefined,
  returnFullObject = false,
  disabled = false,
  hideSearchByDefault = false,
}: SearchableDropdownProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentValue, setCurrentValue] = useState(value || '');
  const [showSearch, setShowSearch] = useState(!hideSearchByDefault);

  const [typingTimer, setTypingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update internal state when external value changes
  useEffect(() => {
    setCurrentValue(value || '');
  }, [value]);

  const filteredOptions = options.filter(option => {
    if (!option || !option.label) return false;

    const labelMatch = option.label.toString().toLowerCase()
      .includes(searchTerm.toLowerCase());
    const categoryMatch = option.category &&
      option.category.toString().toLowerCase()
        .includes(searchTerm.toLowerCase());

    return labelMatch || categoryMatch;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If hidden by default, hide it again on outside click if empty? 
        // Or keep it open if user opened it? Let's just user explicit closing or keep it open.
        // Actually, if we want to mimic "Search Template" Modal behavior, we might want to hide it.
        // But for now, let's leave 'showSearch' state alone unless explicit toggle.
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
    };
  }, [typingTimer]);

  const handleSelect = (option: any) => {
    if (typingTimer) {
      clearTimeout(typingTimer);
    }


    if (returnFullObject) {
      onChange({
        id: option.id || null,
        text: option.label,
        isFromDatabase: !!option.id
      });
    } else {
      onChange(option.label);
    }
    setSearchTerm('');
    setIsOpen(false);
    setCurrentValue(option.label);
    if(hideSearchByDefault) setShowSearch(false); // Hide search after selection
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCurrentValue(newValue);


    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    const timer = setTimeout(() => {
  
      if (returnFullObject) {
        onChange({
          id: null,
          text: newValue,
          isFromDatabase: false
        });
      } else {
        onChange(newValue);
      }
    }, 1500);

    setTypingTimer(timer);
  };

  const handleClearText = () => {
    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    setCurrentValue('');

    if (returnFullObject) {
      onChange({
        id: null,
        text: '',
        isFromDatabase: false
      });
    } else {
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(filteredOptions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Search Input Area - Conditional Rendering */}
      {showSearch && (
        <div className="relative mb-3 transition-all duration-200 ease-in-out">
          

          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={`Search ${label?.toLowerCase()}...`}
            className="w-full pl-10 pr-20 h-10 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          />

          {/* Clear search button */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={`absolute inset-y-0 right-10 flex items-center pr-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'
                }`}
              disabled={disabled}          >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Toggle dropdown button / Hide Search Button */}
          <button
            onClick={() => {
                if(hideSearchByDefault) setShowSearch(false);
                else (!disabled && setIsOpen(!isOpen))
            }}
            disabled={disabled}
            className={`absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600 !bg-transparent border-none`}
            title={hideSearchByDefault ? "Close Search" : "Toggle Dropdown"}
          >
           {hideSearchByDefault ? <X className="h-5 w-5" /> : (isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />)}
          </button>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && showSearch && (
        <div className="absolute z-50 w-full mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {filteredOptions.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.id || `option_${index}`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2 cursor-pointer transition-colors text-sm border-b border-gray-100 last:border-none ${selectedIndex === index
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.category && (
                    <div className="text-xs text-gray-500">{option.category}</div>
                  )}
                  
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm text-center">
              No results found
            </div>
          )}
        </div>
      )}

      {/* Editable textarea */}
      <div className="relative group">
        <textarea
          value={currentValue}
          onChange={handleTextAreaChange}
          disabled={disabled}
          placeholder={placeholder || `Select from dropdown or type your own ${label?.toLowerCase()}...`}
          rows={3}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-shadow hover:shadow-md resize-y min-h-[100px] ${disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100'
            : 'bg-white'
            }`}
        />
        
        {/* Helper Toolbar Inside Textarea (Top Right) */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
            {/* Toggle Search Button (Only show if hidden by default and strict search mode off) */}
            {hideSearchByDefault && !showSearch && (
                <button
                    onClick={() => {
                        setShowSearch(true);
                        setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Search Templates"
                >
                    <List className="h-4 w-4" />
                </button>
            )}

            {currentValue && (
            <button
                onClick={handleClearText}
                className={`p-1 ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors'
                }`}
                disabled={disabled}          >
                <X className="h-4 w-4" />
            </button>
            )}
        </div>
      </div>
    </div>
  );
}
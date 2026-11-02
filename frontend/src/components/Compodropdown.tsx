import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface Option {
    id?: string | number | null;
    label: string;
    category?: string;
    [key: string]: any;
}

interface ComponentProps {
    options?: Option[];
    value?: any;
    onChange: (value: any) => void;
    placeholder?: string;
    label?: string;
    returnFullObject?: boolean;
    disabled?: boolean;
}

export default function SearchableComponents({
    options = [],
    value = '', // This should be the text value or full object
    onChange,
    placeholder = "Search or select...",
    returnFullObject = false,
    disabled = false
}: ComponentProps) {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get display value
    const getDisplayValue = () => {
        if (returnFullObject && value && typeof value === 'object') {
            return value.text || value.label || '';
        }
        return value || '';
    };

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
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: Option) => {
        if (returnFullObject) {
            // Return full object with id and text
            onChange({
                id: option.id || null,
                text: option.label,
                isFromDatabase: !!option.id
            });
        } else {
            // Just return text
            onChange(option.label);
        }
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        setIsOpen(true);
        setSelectedIndex(-1);
    };

    const handleClear = () => {
        if (returnFullObject) {
            onChange({
                id: null,
                text: '',
                isFromDatabase: false
            });
        } else {
            onChange('');
        }
        setSearchTerm('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true);
            return;
        }

        if (isOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                handleSelect(filteredOptions[selectedIndex]);
            } else if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
    };

    const displayValue = getDisplayValue();

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Main Input Field */}
            <div className="relative">

                <input
                    ref={inputRef}
                    type="text"
                    disabled={disabled}
                    value={isOpen ? searchTerm : displayValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`w-full pl-10 pr-20 h-10 text-sm font-semibold rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-md hover:shadow-lg transition-all ${disabled
                        ? 'opacity-50 cursor-not-allowed text-gray-300'
                        : 'text-gray-400 hover:text-gray-600 cursor-pointer'
                        }`}
                />

                {/* Clear button */}
                {displayValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className={`absolute inset-y-0 right-10 flex items-center pr-2 ${disabled
                            ? 'opacity-50 cursor-not-allowed text-gray-300'
                            : 'text-gray-400 hover:text-gray-600 cursor-pointer'
                            }`}
                        disabled={disabled}
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                {/* Toggle dropdown button */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-gray-800 transition-colors ${disabled
                        ? 'opacity-50 cursor-not-allowed text-gray-300'
                        : 'text-gray-400 hover:text-gray-600 cursor-pointer'
                        }`}
                    disabled={disabled}
                >
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-300 overflow-hidden ${disabled
                    ? 'opacity-50 cursor-not-allowed text-gray-300'
                    : 'text-gray-400 hover:text-gray-600 cursor-pointer'
                    }`}>
                    {filteredOptions.length > 0 ? (
                        <ul className="max-h-60 overflow-y-auto">
                            {filteredOptions.map((option, index) => (
                                <li
                                    key={option.id || `option_${index}`}
                                    onClick={() => handleSelect(option)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-none ${selectedIndex === index
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'hover:bg-indigo-50 text-gray-800'
                                        }`}
                                >
                                    <div className="font-semibold">{option.label}</div>
                                    {option.category && (
                                        <div className="text-xs text-gray-500">{option.category}</div>
                                    )}

                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-8 text-gray-500 text-sm text-center">
                            {searchTerm ? 'No results found' : 'No options available'}
                        </div>
                    )}
                </div>
            )}


        </div>
    );
}
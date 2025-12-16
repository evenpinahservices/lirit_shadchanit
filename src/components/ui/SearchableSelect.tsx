"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";

export interface Option {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select option...",
    className,
    disabled = false
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Derive selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Input value state - strictly for display/filtering
    // We initialize it with the selected label if present, or empty string.
    // However, user interaction (typing) updates this independent of 'value' prop temporarily.
    const [inputValue, setInputValue] = React.useState(selectedOption?.label || "");

    // Sync input with external value changes
    React.useEffect(() => {
        setInputValue(selectedOption?.label || "");
    }, [value, selectedOption]);

    // Handle click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                // On close, reset input to match selected value (if any), or clear if invalid?
                // For a strict select, we reset.
                setInputValue(selectedOption?.label || "");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [selectedOption]);

    // Filter options based on current input
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleSelect = (option: Option) => {
        onChange(option.value);
        setInputValue(option.label);
        setIsOpen(false);
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    className={cn(
                        "flex w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-950 dark:border-gray-700",
                        className
                    )}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                        // If cleared, notify parent?
                        if (e.target.value === "") {
                            onChange("");
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    disabled={disabled}
                />
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
            </div>

            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg max-h-60 flex flex-col overflow-y-auto transform origin-top animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1">
                        {filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className={cn(
                                    "flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-red-50 hover:text-red-900 dark:hover:bg-red-900/20 dark:hover:text-red-100",
                                    value === option.value && "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100 font-medium"
                                )}
                                onClick={() => handleSelect(option)}
                            >
                                {option.label}
                                {value === option.value && (
                                    <Check className="h-4 w-4" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {isOpen && filteredOptions.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground animate-in fade-in zoom-in-95 duration-100">
                    No results found.
                </div>
            )}
        </div>
    );
}

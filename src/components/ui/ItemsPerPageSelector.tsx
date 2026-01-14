"use client";

import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ItemsPerPageSelectorProps {
    value: number | "all";
    onChange: (value: number | "all") => void;
    totalItems: number;
    className?: string;
}

export function ItemsPerPageSelector({ value, onChange, totalItems, className = "" }: ItemsPerPageSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<"top" | "bottom">("top");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const options: (number | "all")[] = [5, 10, 50, 100, "all"];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Calculate position when opening
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                const spaceAbove = rect.top;
                const spaceBelow = window.innerHeight - rect.bottom;
                const dropdownHeight = 200; // Approximate dropdown height
                
                // Open upward if near bottom of viewport, downward otherwise
                setPosition(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "top" : "bottom");
            }
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const displayValue = value === "all" ? "All" : value.toString();

    return (
        <div className={`relative ${className}`} ref={dropdownRef} style={{ zIndex: 10000 }}>
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
                <span>Show: {displayValue}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div 
                    className={`absolute left-0 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl z-[9999] ${
                        position === "top" ? "bottom-full mb-1" : "top-full mt-1"
                    }`}
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                >
                    {options.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onChange(option);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-md last:rounded-b-md ${
                                value === option
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium"
                                    : "text-gray-700 dark:text-gray-300"
                            }`}
                        >
                            {option === "all" ? "All" : option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

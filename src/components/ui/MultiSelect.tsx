import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface MultiSelectProps {
    options: string[];
    optionLabels?: string[]; // Optional labels for display (same order as options)
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
    direction?: "top" | "bottom";
    style?: React.CSSProperties;
}

export function MultiSelect({
    options,
    optionLabels,
    selected,
    onChange,
    placeholder = "Select options...",
    className,
    direction = "bottom",
    style,
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Get display label for a value
    const getLabel = (value: string) => {
        if (!optionLabels) return value;
        const index = options.indexOf(value);
        return index >= 0 && optionLabels[index] ? optionLabels[index] : value;
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter((item) => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const removeOption = (option: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter((item) => item !== option));
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div
                className="min-h-[38px] w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer flex flex-wrap gap-1 bg-white dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700"
                style={style}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected.length === 0 && (
                    <span className="text-gray-500">{placeholder}</span>
                )}
                {selected.map((option) => (
                    <span
                        key={option}
                        className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-md text-xs flex items-center gap-1"
                    >
                        {getLabel(option)}
                        <button
                            type="button"
                            onClick={(e) => removeOption(option, e)}
                            className="hover:text-indigo-900 dark:hover:text-indigo-100 font-bold"
                        >
                            &times;
                        </button>
                    </span>
                ))}
            </div>
            {isOpen && (
                <div className={cn(
                    "absolute z-10 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto",
                    direction === "top" ? "bottom-full mb-1" : "mt-1"
                )}>
                    <div className="sticky top-0 right-0 z-20 flex justify-end p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            title="Close"
                        >
                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                        </button>
                    </div>
                    {options.map((option, index) => (
                        <div
                            key={option}
                            className={cn(
                                "px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100",
                                selected.includes(option) && "bg-indigo-50 dark:bg-indigo-950"
                            )}
                            onClick={() => toggleOption(option)}
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(option)}
                                readOnly
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 pointer-events-none"
                            />
                            {optionLabels && optionLabels[index] ? optionLabels[index] : option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

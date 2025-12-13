import * as React from "react";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    className,
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

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
                className="min-h-[38px] w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer flex flex-wrap gap-1 bg-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected.length === 0 && (
                    <span className="text-gray-500">{placeholder}</span>
                )}
                {selected.map((option) => (
                    <span
                        key={option}
                        className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-xs flex items-center gap-1"
                    >
                        {option}
                        <button
                            type="button"
                            onClick={(e) => removeOption(option, e)}
                            className="hover:text-indigo-900 font-bold"
                        >
                            &times;
                        </button>
                    </span>
                ))}
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {options.map((option) => (
                        <div
                            key={option}
                            className={cn(
                                "px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-900",
                                selected.includes(option) && "bg-indigo-50"
                            )}
                            onClick={() => toggleOption(option)}
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(option)}
                                readOnly
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 pointer-events-none"
                            />
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

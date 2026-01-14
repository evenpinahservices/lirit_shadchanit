"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { convertHebrewYearToLetters, parseHebrewYearToNumber } from "@/lib/utils";

interface DateCarouselProps {
    mode: "Gregorian" | "Hebrew" | "Year";
    value: string;
    onChange: (value: string) => void;
}

const HEBREW_MONTHS = [
    "תשרי", "חשון", "כסלו", "טבת", "שבט", "אדר", "אדר א", "אדר ב", "ניסן", "אייר", "סיון", "תמוז", "אב", "אלול"
];

const GREGORIAN_MONTHS = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];

// Hebrew letters for days 1-30 (using actual Hebrew letters)
const HEBREW_DAYS = [
    "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
    "יא", "יב", "יג", "יד", "טו", "טז", "יז", "יח", "יט", "כ",
    "כא", "כב", "כג", "כד", "כה", "כו", "כז", "כח", "כט", "ל"
];

export function DateCarousel({ mode, value, onChange }: DateCarouselProps) {
    // Generate ranges
    const currentYear = new Date().getFullYear();
    const minAge = 18;
    const maxAge = 60;

    // Gregorian Years
    const gregYearEnd = currentYear - minAge;
    const gregYearStart = currentYear - maxAge;
    const gregYears = Array.from({ length: gregYearEnd - gregYearStart + 1 }, (_, i) => gregYearEnd - i);

    // Hebrew Years (Approximate: Gregorian + 3760)
    // 2025 is ~5785.
    // So current hebrew year approx 5785.
    const currentHebrewYear = currentYear + 3760;
    const hebYearEnd = currentHebrewYear - minAge;
    const hebYearStart = currentHebrewYear - maxAge;
    const hebYears = Array.from({ length: hebYearEnd - hebYearStart + 1 }, (_, i) => hebYearEnd - i);


    // Local state for parts
    const [day, setDay] = useState<string>("");
    const [month, setMonth] = useState<string>("");
    const [year, setYear] = useState<string>("");

    // Parse initial value
    useEffect(() => {
        if (!value) return;

        if (mode === "Year") {
            setYear(value);
        } else if (mode === "Gregorian") {
            // Expect YYYY-MM-DD
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setYear(d.getFullYear().toString());
                // Month is 0-indexed in JS Date, but we want 1-12 or name
                // Let's store month index 1-12 internally or name?
                // Standard date input uses YYYY-MM-DD.
                // Our props input 'value' is likely YYYY-MM-DD string.
                setMonth((d.getMonth() + 1).toString());
                setDay(d.getDate().toString());
            }
        } else if (mode === "Hebrew") {
            // Expect "Hebrew: <Day> <Month> <Year>"
            const parts = value.replace("Hebrew: ", "").split(" ");
            if (parts.length === 3) {
                setDay(parts[0]);
                setMonth(parts[1]);
                // Year could be in Hebrew letters or numeric - convert numeric to Hebrew letters
                const yearPart = parts[2];
                const numericYear = parseInt(yearPart);
                if (!isNaN(numericYear) && numericYear >= 1000) {
                    // Convert numeric year to Hebrew letters
                    setYear(convertHebrewYearToLetters(numericYear));
                } else {
                    // Already in Hebrew letters, use as is
                    setYear(yearPart);
                }
            }
        }
    }, [value, mode]);

    // Update parent when parts change
    const update = (d: string, m: string, y: string) => {
        if (mode === "Year") {
            onChange(y);
        } else if (mode === "Gregorian") {
            // Pad day/month
            const paddedMonth = m.padStart(2, '0');
            const paddedDay = d.padStart(2, '0');
            onChange(`${y}-${paddedMonth}-${paddedDay}`);
        } else if (mode === "Hebrew") {
            onChange(`Hebrew: ${d} ${m} ${y}`);
        }
    };

    const handleChange = (type: "day" | "month" | "year", val: string) => {
        if (type === "day") {
            setDay(val);
            update(val, month, year);
        } else if (type === "month") {
            setMonth(val);
            update(day, val, year);
        } else if (type === "year") {
            setYear(val);
            update(day, month, val);
        }
    };

    const Select = ({ value, onChange, options, placeholder, className }: any) => {
        const isRTL = mode === "Hebrew";
        return (
            <div className={`relative ${className || ""}`}>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    dir={isRTL ? "rtl" : "ltr"}
                    className={`w-full appearance-none bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${isRTL ? "pr-3 pl-8 text-right" : "pl-3 pr-8"}`}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className={`pointer-events-none absolute inset-y-0 flex items-center px-2 text-gray-500 ${isRTL ? "left-0" : "right-0"}`}>
                    <ChevronDown className="h-4 w-4" />
                </div>
            </div>
        );
    };

    if (mode === "Year") {
        return (
            <Select
                value={year}
                onChange={(val: string) => handleChange("year", val)}
                options={gregYears.map(y => ({ value: y.toString(), label: y.toString() }))}
                placeholder="Year"
            />
        );
    }

    if (mode === "Hebrew") {
        return (
            <div className="grid grid-cols-3 gap-2" dir="rtl">
                <Select
                    value={day}
                    onChange={(val: string) => handleChange("day", val)}
                    options={HEBREW_DAYS.map((d, i) => ({ value: d, label: d }))}
                    placeholder="יום"
                    className="text-right"
                />
                <Select
                    value={month}
                    onChange={(val: string) => handleChange("month", val)}
                    options={HEBREW_MONTHS.map(m => ({ value: m, label: m }))}
                    placeholder="חודש"
                    className="text-right"
                />
                <Select
                    value={year}
                    onChange={(val: string) => handleChange("year", val)}
                    options={hebYears.map(y => {
                        const hebrewYearLetters = convertHebrewYearToLetters(y);
                        return { value: hebrewYearLetters, label: hebrewYearLetters };
                    })}
                    placeholder="שנה"
                    className="text-right"
                />
            </div>
        );
    }

    // Gregorian
    return (
        <div className="grid grid-cols-3 gap-2">
            <Select
                value={day}
                onChange={(val: string) => handleChange("day", val)}
                options={Array.from({ length: 31 }, (_, i) => i + 1).map(d => ({ value: d.toString(), label: d.toString() }))}
                placeholder="Day"
            />
            <Select
                value={month} // Expects "1", "2" etc
                onChange={(val: string) => handleChange("month", val)}
                options={GREGORIAN_MONTHS.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                placeholder="Month"
            />
            <Select
                value={year}
                onChange={(val: string) => handleChange("year", val)}
                options={gregYears.map(y => ({ value: y.toString(), label: y.toString() }))}
                placeholder="Year"
            />
        </div>
    );
}

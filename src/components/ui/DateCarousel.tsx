"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface DateCarouselProps {
    mode: "Gregorian" | "Hebrew" | "Year";
    value: string;
    onChange: (value: string) => void;
}

// Hebrew months in Hebrew letters
const HEBREW_MONTHS = [
    "תשרי", "חשון", "כסלו", "טבת", "שבט", "אדר", "אדר א", "אדר ב", "ניסן", "אייר", "סיון", "תמוז", "אב", "אלול"
];

const GREGORIAN_MONTHS = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];

// Hebrew letters for days 1-30 (in actual Hebrew letters)
const HEBREW_DAYS = [
    "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
    "יא", "יב", "יג", "יד", "טו", "טז", "יז", "יח", "יט", "כ",
    "כא", "כב", "כג", "כד", "כה", "כו", "כז", "כח", "כט", "ל"
];

// Mapping for backward compatibility: English transliterations to Hebrew letters
const ENGLISH_TO_HEBREW_DAYS: { [key: string]: string } = {
    "Aleph": "א", "Bet": "ב", "Gimmel": "ג", "Dalet": "ד", "Hey": "ה",
    "Vav": "ו", "Zayin": "ז", "Chet": "ח", "Tet": "ט", "Yud": "י",
    "Yud-Aleph": "יא", "Yud-Bet": "יב", "Yud-Gimmel": "יג", "Yud-Dalet": "יד",
    "Tet-Vav": "טו", "Tet-Zayin": "טז", "Yud-Zayin": "יז", "Yud-Chet": "יח", "Yud-Tet": "יט",
    "Caf": "כ", "Caf-Aleph": "כא", "Caf-Bet": "כב", "Caf-Gimmel": "כג", "Caf-Dalet": "כד",
    "Caf-Hey": "כה", "Caf-Vav": "כו", "Caf-Zayin": "כז", "Caf-Chet": "כח", "Caf-Tet": "כט",
    "Lamed": "ל"
};

const ENGLISH_TO_HEBREW_MONTHS: { [key: string]: string } = {
    "Tishrei": "תשרי", "Cheshvan": "חשון", "Kislev": "כסלו", "Tevet": "טבת",
    "Shevat": "שבט", "Adar": "אדר", "Adar I": "אדר א", "Adar II": "אדר ב",
    "Nisan": "ניסן", "Iyar": "אייר", "Sivan": "סיון", "Tamuz": "תמוז",
    "Av": "אב", "Elul": "אלול"
};

// Convert numeric year to Hebrew numerals
// Hebrew years use letters with gershayim (״) before the last letter
// Display WITHOUT the thousands prefix (ה') - just show the year like תשפ"ה
function convertToHebrewYear(year: number): string {
    const onesMap: { [key: number]: string } = {
        1: "א", 2: "ב", 3: "ג", 4: "ד", 5: "ה", 6: "ו", 7: "ז", 8: "ח", 9: "ט"
    };
    const tensMap: { [key: number]: string } = {
        1: "י", 2: "כ", 3: "ל", 4: "מ", 5: "נ", 6: "ס", 7: "ע", 8: "פ", 9: "צ"
    };
    const hundredsMap: { [key: number]: string } = {
        1: "ק", 2: "ר", 3: "ש", 4: "ת"
    };

    const yearStr = year.toString();
    
    if (yearStr.length === 4) {
        // Skip the thousands digit - just use the last 3 digits for display
        const remainder = parseInt(yearStr.substring(1)); // Last 3 digits
        
        if (remainder === 0) {
            return year.toString();
        }
        
        let remainderStr = "";
        const hundreds = Math.floor(remainder / 100);
        const tens = Math.floor((remainder % 100) / 10);
        const ones = remainder % 10;
        
        // Hundreds (400-900)
        if (hundreds > 0) {
            if (hundreds <= 4) {
                remainderStr += hundredsMap[hundreds];
            } else if (hundreds === 5) {
                remainderStr += "תק"; // 400 + 100
            } else if (hundreds === 6) {
                remainderStr += "תר"; // 400 + 200
            } else if (hundreds === 7) {
                remainderStr += "תש"; // 400 + 300
            } else if (hundreds === 8) {
                remainderStr += "תת"; // 400 + 400
            } else if (hundreds === 9) {
                remainderStr += "תתק"; // 400 + 400 + 100
            }
        }
        
        // Tens and ones
        if (tens > 0) {
            remainderStr += tensMap[tens];
        }
        if (ones > 0) {
            remainderStr += onesMap[ones];
        }
        
        // Add gershayim (״) before the last letter
        if (remainderStr.length > 1) {
            remainderStr = remainderStr.slice(0, -1) + "״" + remainderStr.slice(-1);
        } else if (remainderStr.length === 1) {
            remainderStr += "׳";
        }
        
        return remainderStr;
    }
    
    return year.toString();
}

// Convert Hebrew numerals back to numeric year
function parseHebrewYear(hebrewYear: string): number {
    const onesMap: { [key: string]: number } = {
        "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9
    };
    const tensMap: { [key: string]: number } = {
        "י": 10, "כ": 20, "ך": 20, "ל": 30, "מ": 40, "ם": 40, "נ": 50, "ן": 50, 
        "ס": 60, "ע": 70, "פ": 80, "ף": 80, "צ": 90, "ץ": 90
    };
    const hundredsMap: { [key: string]: number } = {
        "ק": 100, "ר": 200, "ש": 300, "ת": 400
    };
    
    // Remove gershayim and geresh
    const cleaned = hebrewYear.replace(/[״׳"']/g, "");
    
    let total = 0;
    for (const char of cleaned) {
        if (onesMap[char]) total += onesMap[char];
        else if (tensMap[char]) total += tensMap[char];
        else if (hundredsMap[char]) total += hundredsMap[char];
    }
    
    // Add 5000 for the current millennium (Hebrew years 5xxx)
    if (total < 1000) {
        total += 5000;
    }
    
    return total;
}

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
            if (parts.length >= 3) {
                // Convert English transliterations to Hebrew if needed (for backward compatibility)
                let dayValue = parts[0];
                if (ENGLISH_TO_HEBREW_DAYS[dayValue]) {
                    dayValue = ENGLISH_TO_HEBREW_DAYS[dayValue];
                }
                
                let monthValue = parts[1];
                if (ENGLISH_TO_HEBREW_MONTHS[monthValue]) {
                    monthValue = ENGLISH_TO_HEBREW_MONTHS[monthValue];
                }
                
                // Year: try to parse as numeric first (for backward compatibility)
                // If it's Hebrew numerals, convert back to numeric
                const yearPart = parts[2];
                const numericYear = parseInt(yearPart);
                let yearValue: string;
                
                if (!isNaN(numericYear) && numericYear > 1000) {
                    // Already numeric
                    yearValue = numericYear.toString();
                } else {
                    // Try to parse Hebrew numerals
                    const parsedYear = parseHebrewYear(yearPart);
                    yearValue = parsedYear.toString();
                }
                
                setDay(dayValue);
                setMonth(monthValue);
                setYear(yearValue);
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
            // Convert numeric year to Hebrew numerals if it's numeric
            let yearValue = y;
            const numericYear = parseInt(y);
            if (!isNaN(numericYear)) {
                yearValue = convertToHebrewYear(numericYear);
            }
            onChange(`Hebrew: ${d} ${m} ${yearValue}`);
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

    const Select = ({ value, onChange, options, placeholder, className }: any) => (
        <div className={`relative ${className}`}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
                <option value="" disabled>{placeholder}</option>
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <ChevronDown className="h-4 w-4" />
            </div>
        </div>
    );

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
            <div className="grid grid-cols-3 gap-2">
                <Select
                    value={day}
                    onChange={(val: string) => handleChange("day", val)}
                    options={HEBREW_DAYS.map((d) => ({ value: d, label: d }))}
                    placeholder="Day"
                />
                <Select
                    value={month}
                    onChange={(val: string) => handleChange("month", val)}
                    options={HEBREW_MONTHS.map(m => ({ value: m, label: m }))}
                    placeholder="Month"
                />
                <Select
                    value={year}
                    onChange={(val: string) => handleChange("year", val)}
                    options={hebYears.map(y => {
                        const numericYear = parseInt(y.toString());
                        const hebrewYear = convertToHebrewYear(numericYear);
                        return { value: y.toString(), label: hebrewYear };
                    })}
                    placeholder="Year"
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

import { useState, useEffect, useRef } from "react";
import { UseFormSetValue, UseFormWatch, UseFormTrigger } from "react-hook-form";
import { convertHebrewYearToLetters, parseHebrewYearToNumber, ageToYear } from "@/lib/utils";

export function useDateHandling(
    initialDob: string | undefined,
    setValue: UseFormSetValue<any>,
    watch: UseFormWatch<any>,
    trigger: UseFormTrigger<any>
) {
    const [dateMode, setDateMode] = useState<"Gregorian" | "Hebrew" | "Year">("Gregorian");
    const [lastGregorianDate, setLastGregorianDate] = useState<string>("");
    const currentDob = watch("dob");
    const [age, setAge] = useState<number | "">("");
    // Prevents the DOB→age sync from overwriting while the user is actively typing an age
    const isUpdatingFromAgeRef = useRef(false);

    // Initialize date mode based on existing dob
    useEffect(() => {
        if (initialDob) {
            if (/^\d{4}$/.test(initialDob)) {
                setDateMode("Year");
            } else if (initialDob.includes("Hebrew:")) {
                setDateMode("Hebrew");
            } else {
                setDateMode("Gregorian");
                setLastGregorianDate(initialDob);
            }
        }
    }, [initialDob]);

    // Store Gregorian date when it changes (if in Gregorian mode)
    useEffect(() => {
        if (dateMode === "Gregorian" && currentDob && !currentDob.includes("Hebrew:") && !/^\d{4}$/.test(currentDob)) {
            setLastGregorianDate(currentDob);
        }
    }, [currentDob, dateMode]);

    const convertDateFormat = (currentDob: string, fromMode: "Gregorian" | "Hebrew" | "Year", toMode: "Gregorian" | "Hebrew" | "Year"): string => {
        if (!currentDob || currentDob.trim() === "") {
            return "";
        }

        if (fromMode === "Year") {
            const year = parseInt(currentDob);
            if (isNaN(year)) return "";

            if (toMode === "Year") return currentDob;
            if (toMode === "Gregorian") {
                if (lastGregorianDate) {
                    const storedDate = new Date(lastGregorianDate);
                    if (!isNaN(storedDate.getTime())) {
                        const month = (storedDate.getMonth() + 1).toString().padStart(2, '0');
                        const day = storedDate.getDate().toString().padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                }
                return `${year}-01-01`;
            }
            if (toMode === "Hebrew") {
                const hebrewYear = year + 3760;
                const hebrewYearLetters = convertHebrewYearToLetters(hebrewYear);
                return `Hebrew: א תשרי ${hebrewYearLetters}`;
            }
        }

        if (fromMode === "Gregorian") {
            if (toMode === "Gregorian") return currentDob;

            const date = new Date(currentDob);
            if (isNaN(date.getTime())) return "";

            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();

            if (toMode === "Year") {
                return year.toString();
            }
            if (toMode === "Hebrew") {
                const hebrewYear = year + 3760;
                const hebrewYearLetters = convertHebrewYearToLetters(hebrewYear);
                const hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
                    "יא", "יב", "יג", "יד", "טו", "טז", "יז", "יח", "יט", "כ",
                    "כא", "כב", "כג", "כד", "כה", "כו", "כז", "כח", "כט", "ל"];
                const hebrewMonths = ["תשרי", "חשון", "כסלו", "טבת", "שבט", "אדר",
                    "אדר א", "אדר ב", "ניסן", "אייר", "סיון", "תמוז", "אב", "אלול"];

                const hebrewDay = hebrewDays[Math.min(day - 1, 29)] || "א";
                const monthIndex = month <= 12 ? (month + 5) % 12 : 0;
                const hebrewMonth = hebrewMonths[monthIndex] || "תשרי";

                return `Hebrew: ${hebrewDay} ${hebrewMonth} ${hebrewYearLetters}`;
            }
        }

        if (fromMode === "Hebrew") {
            if (toMode === "Hebrew") return currentDob;

            const parts = currentDob.replace("Hebrew: ", "").split(" ");
            if (parts.length < 3) return "";

            const hebrewYearStr = parts[2];
            let numericYear = parseInt(hebrewYearStr);

            if (isNaN(numericYear) || numericYear < 1000) {
                numericYear = parseHebrewYearToNumber(hebrewYearStr);
            }

            const gregorianYear = numericYear - 3760;

            if (toMode === "Year") {
                return gregorianYear.toString();
            }
            if (toMode === "Gregorian") {
                const hebrewDay = parts[0];
                const hebrewMonth = parts[1];

                const hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
                    "יא", "יב", "יג", "יד", "טו", "טז", "יז", "יח", "יט", "כ",
                    "כא", "כב", "כג", "כד", "כה", "כו", "כז", "כח", "כט", "ל"];
                const hebrewMonths = ["תשרי", "חשון", "כסלו", "טבת", "שבט", "אדר",
                    "אדר א", "אדר ב", "ניסן", "אייר", "סיון", "תמוז", "אב", "אלול"];

                let dayNum = hebrewDays.indexOf(hebrewDay) + 1;
                if (dayNum < 1 || dayNum > 31) dayNum = 1;

                let monthNum = hebrewMonths.indexOf(hebrewMonth);
                monthNum = monthNum >= 0 ? ((monthNum + 7) % 12) + 1 : 1;

                const paddedMonth = monthNum.toString().padStart(2, '0');
                const paddedDay = dayNum.toString().padStart(2, '0');

                return `${gregorianYear}-${paddedMonth}-${paddedDay}`;
            }
        }

        return currentDob;
    };

    const calculateAgeFromDob = (dob: string): number | "" => {
        if (!dob || dob.trim() === "") return "";

        if (/^\d{4}$/.test(dob)) {
            const year = parseInt(dob);
            if (isNaN(year) || year > 2100) return ""; // guard against Hebrew years stored as 4-digit number
            return new Date().getFullYear() - year;
        }

        if (dob.includes("Hebrew:")) {
            const parts = dob.trim().split(" ");
            const hebrewYearStr = parts[parts.length - 1];
            let numericYear = parseInt(hebrewYearStr);

            if (isNaN(numericYear) || numericYear < 1000) {
                numericYear = parseHebrewYearToNumber(hebrewYearStr);
            }

            if (isNaN(numericYear) || numericYear < 1000) return "";

            const gregorianYear = numericYear - 3760;
            return new Date().getFullYear() - gregorianYear;
        }

        // Full date (YYYY-MM-DD)
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return "";

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const calculateDobFromAge = (age: number | "", currentDob: string): string => {
        if (age === "" || typeof age !== "number") return currentDob || "";
        if (isNaN(age) || age < 18 || age > 80) return currentDob || "";

        const birthYear = ageToYear(age);

        if (dateMode === "Year") {
            return birthYear.toString();
        } else if (dateMode === "Hebrew") {
            const hebrewYear = birthYear + 3760;
            const hebrewYearLetters = convertHebrewYearToLetters(hebrewYear);
            if (currentDob && currentDob.includes("Hebrew:")) {
                const parts = currentDob.replace("Hebrew: ", "").split(" ");
                if (parts.length >= 2) {
                    return `Hebrew: ${parts[0]} ${parts[1]} ${hebrewYearLetters}`;
                }
            }
            return `Hebrew: א תשרי ${hebrewYearLetters}`;
        } else {
            if (currentDob && !currentDob.includes("Hebrew:") && !/^\d{4}$/.test(currentDob)) {
                const date = new Date(currentDob);
                if (!isNaN(date.getTime())) {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    return `${birthYear}-${month}-${day}`;
                }
            }
            return `${birthYear}-01-01`;
        }
    };

    // Sync DOB → Age (single source of truth: DOB drives age display)
    useEffect(() => {
        if (isUpdatingFromAgeRef.current) return;
        const calculatedAge = calculateAgeFromDob(currentDob || "");
        if (calculatedAge !== age) {
            setAge(calculatedAge);
        }
    }, [currentDob, dateMode]);

    // Initialize age from initial DOB
    useEffect(() => {
        if (initialDob) {
            setAge(calculateAgeFromDob(initialDob));
        }
    }, [initialDob]);

    const handleAgeChange = (inputValue: string) => {
        if (inputValue === "") {
            setAge("");
            return;
        }

        const parsedAge = parseInt(inputValue);
        if (!isNaN(parsedAge)) {
            setAge(parsedAge);

            if (parsedAge >= 18 && parsedAge <= 80) {
                isUpdatingFromAgeRef.current = true;
                const newDob = calculateDobFromAge(parsedAge, currentDob || "");
                if (newDob) {
                    setValue("dob", newDob);
                    trigger("dob");
                }
                setTimeout(() => {
                    isUpdatingFromAgeRef.current = false;
                }, 100);
            }
        } else {
            setAge("");
        }
    };

    const handleAgeBlur = (inputValue: string) => {
        if (inputValue === "") return;

        const parsedAge = parseInt(inputValue);
        if (isNaN(parsedAge)) return;

        const clampedAge = Math.min(Math.max(parsedAge, 18), 80);
        if (clampedAge !== parsedAge) {
            setAge(clampedAge);
        }

        isUpdatingFromAgeRef.current = true;
        const newDob = calculateDobFromAge(clampedAge, currentDob || "");
        if (newDob) {
            setValue("dob", newDob);
            trigger("dob");
        }
        setTimeout(() => {
            isUpdatingFromAgeRef.current = false;
        }, 100);
    };

    return {
        dateMode,
        setDateMode,
        age,
        setAge,
        convertDateFormat,
        calculateAgeFromDob,
        calculateDobFromAge,
        handleAgeChange,
        handleAgeBlur,
        isUpdatingFromAgeRef,
        // kept for API compatibility — no longer used internally
        isUpdatingFromDobRef: { current: false },
    };
}

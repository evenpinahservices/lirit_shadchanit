import { useState, useEffect, useRef } from "react";
import { UseFormSetValue, UseFormWatch, UseFormTrigger } from "react-hook-form";
import { convertHebrewYearToLetters, parseHebrewYearToNumber } from "@/lib/utils";

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
    const isUpdatingFromAgeRef = useRef(false);
    const isUpdatingFromDobRef = useRef(false);
    
    // Initialize date mode based on existing dob
    useEffect(() => {
        if (initialDob) {
            if (/^\d{4}$/.test(initialDob)) {
                setDateMode("Year");
            } else if (initialDob.includes("Hebrew:")) {
                setDateMode("Hebrew");
            } else {
                setDateMode("Gregorian");
                if (!initialDob.includes("Hebrew:")) {
                    setLastGregorianDate(initialDob);
                }
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
            if (isNaN(year)) return "";
            return new Date().getFullYear() - year;
        }
        
        if (dob.includes("Hebrew:")) {
            const parts = dob.trim().split(" ");
            const hebrewYearStr = parts[parts.length - 1];
            let numericYear = parseInt(hebrewYearStr);
            
            if (isNaN(numericYear) || numericYear < 1000) {
                numericYear = parseHebrewYearToNumber(hebrewYearStr);
            }
            
            const gregorianYear = numericYear - 3760;
            return new Date().getFullYear() - gregorianYear;
        }
        
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return "";
        
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const calculateDobFromAge = (age: number | "", currentDob: string): string => {
        if (age === "" || typeof age !== "number") return currentDob || "";
        if (isNaN(age) || age < 18 || age > 60) return currentDob || "";
        
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - age;
        
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

    // Sync DOB -> Age
    useEffect(() => {
        if (isUpdatingFromAgeRef.current) return;
        
        const calculatedAge = calculateAgeFromDob(currentDob || "");
        if (calculatedAge !== age) {
            isUpdatingFromDobRef.current = true;
            setAge(calculatedAge);
            setTimeout(() => {
                isUpdatingFromDobRef.current = false;
            }, 0);
        }
    }, [currentDob, dateMode]);

    // Initialize age from initial DOB
    useEffect(() => {
        if (initialDob) {
            const calculatedAge = calculateAgeFromDob(initialDob);
            setAge(calculatedAge);
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
            
            const MIN_AGE = 18;
            const MAX_AGE = 60;
            if (parsedAge >= MIN_AGE && parsedAge <= MAX_AGE) {
                if (!isUpdatingFromDobRef.current) {
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
            }
        } else {
            setAge("");
        }
    };

    const handleAgeBlur = (inputValue: string) => {
        if (inputValue === "") return;
        
        const parsedAge = parseInt(inputValue);
        if (isNaN(parsedAge)) return;
        
        const MIN_AGE = 18;
        const MAX_AGE = 60;
        let clampedAge = parsedAge;
        
        if (parsedAge < MIN_AGE) {
            clampedAge = MIN_AGE;
        } else if (parsedAge > MAX_AGE) {
            clampedAge = MAX_AGE;
        }
        
        if (clampedAge !== parsedAge) {
            setAge(clampedAge);
        }
        
        if (!isUpdatingFromDobRef.current) {
            isUpdatingFromAgeRef.current = true;
            const newDob = calculateDobFromAge(clampedAge, currentDob || "");
            if (newDob) {
                setValue("dob", newDob);
                trigger("dob");
            }
            setTimeout(() => {
                isUpdatingFromAgeRef.current = false;
            }, 100);
        }
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
        isUpdatingFromDobRef,
    };
}

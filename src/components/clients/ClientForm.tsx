"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Client, ClientSchema } from "@/lib/mockData";
import { useClients } from "@/context/ClientContext";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, UploadCloud, X, FileJson } from "lucide-react";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { useUploadWithProgress } from "@/hooks/useUploadWithProgress";
import Image from "next/image";
import { cn, detectClientLanguage } from "@/lib/utils";
import { AutomaticMatchingModal } from "./AutomaticMatchingModal";
import { AutoFillModal } from "./AutoFillModal";
import { JsonFillModal } from "./JsonFillModal";
import { findMatches } from "@/lib/matchingUtils";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { DateCarousel } from "@/components/ui/DateCarousel";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { FormLanguage, translations, t, getOptions, isRTL } from "@/lib/translations";

const formSchema = ClientSchema;

interface ClientFormProps {
    client?: Client;
    isEditing?: boolean;
    onCancel?: () => void;
    language?: FormLanguage;
}

// Step definitions for the wizard (keys for translation lookup)
const STEP_KEYS = [
    { titleKey: "basicInfo", fields: ["fullName", "email", "phone", "dob", "gender", "location"] },
    { titleKey: "appearance", fields: ["height", "eyeColor", "hairColor", "photoUrl"] },
    { titleKey: "background", fields: ["ethnicity", "tribalStatus", "maritalStatus", "languages", "familyBackground", "education", "occupation"] },
    { titleKey: "religiousDetails", fields: ["religiousAffiliation", "learningStatus", "headCovering", "smoking"] },
    { titleKey: "personal", fields: ["hobbies", "personality", "medicalHistory", "medicalHistoryDetails"] },
    { titleKey: "preferences", fields: ["ageGapPreference", "willingToRelocate", "preferredEthnicities", "preferredHashkafos", "preferredLearningStatus", "preferredHeadCovering"] },
    { titleKey: "admin", fields: ["references", "notes"] },
];

export function ClientForm({ client, isEditing = false, onCancel, language = "en" }: ClientFormProps) {
    // Detect language from client data or use provided language
    const detectedLang = client ? detectClientLanguage(client) : language;
    
    const defaultValues: any = client ? {
        ...client,
        religiousAffiliation: Array.isArray(client.religiousAffiliation) ? client.religiousAffiliation[0] : client.religiousAffiliation,
        ethnicity: client.ethnicity,
        learningStatus: client.learningStatus,
        maritalStatus: client.maritalStatus,
        languages: client.languages,
        hobbies: Array.isArray(client.hobbies) ? client.hobbies.join(", ") : (client.hobbies || ""),
        formLanguage: detectedLang,
        // Ensure other array fields that map to single inputs are handled if necessary
    } : {
        fullName: "",
        email: "",
        phone: "",
        dob: "",
        gender: "Male",
        location: "",
        height: 170,
        eyeColor: "Brown",
        hairColor: "Dark",
        maritalStatus: "Single",
        children: 0,
        religiousAffiliation: [], // Changed to array
        learningStatus: "Full Time", // Changed generic default
        ethnicity: "Ashkenazi",
        education: "",
        occupation: "",
        languages: [],
        hobbies: "",
        personality: "",
        // lookingFor removed
        ageGapPreference: [], // Changed to array
        willingToRelocate: "No",
        medicalHistory: "No",
        smoking: "No",
        references: "",
        notes: "",
        resumeRawText: "",
        active: true,
        photoUrl: "",
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        formLanguage: language,
    };

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        watch,
        setValue,
        trigger,
        reset,
    } = useForm<z.input<typeof formSchema>, any, z.output<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });
    
    // Watch formLanguage to update language dynamically
    const formLanguageFromForm = watch("formLanguage");
    
    // Determine the effective language - use detected language or form value
    const lang = formLanguageFromForm || detectedLang;
    const rtl = isRTL(lang);
    
    // Force formLanguage sync when client changes (e.g., when editing)
    useEffect(() => {
        if (client && formLanguageFromForm !== detectedLang) {
            setValue("formLanguage", detectedLang, { shouldDirty: false });
        }
    }, [client, detectedLang, formLanguageFromForm, setValue]);
    
    // Memoize translated step titles
    const STEPS = useMemo(() => STEP_KEYS.map(step => ({
        ...step,
        title: t(lang, `steps.${step.titleKey}`)
    })), [lang]);

    // Helper to get option arrays with value/label
    const opts = (key: keyof typeof translations.en.options) => getOptions(lang, key);

    const { addClient, updateClient, clients } = useClients();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSubmitReady, setIsSubmitReady] = useState(false);
    const [fieldConfidences, setFieldConfidences] = useState<Record<string, number>>({});
    
    // Upload progress tracking
    const profileUpload = useUploadWithProgress();
    const galleryUpload = useUploadWithProgress();
    const [currentUploadFile, setCurrentUploadFile] = useState<File | null>(null);
    const [galleryUploadFile, setGalleryUploadFile] = useState<File | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<"profile" | { type: "gallery"; index: number } | null>(null);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matchResults, setMatchResults] = useState<Client[]>([]);
    const [showAutoFillModal, setShowAutoFillModal] = useState(false);
    const [showJsonFillModal, setShowJsonFillModal] = useState(false);

    const [createdClient, setCreatedClient] = useState<Client | null>(null);

    // Date Logic - Flexible DOB
    const [dateMode, setDateMode] = useState<"Gregorian" | "Hebrew" | "Year">("Gregorian");
    const [lastGregorianDate, setLastGregorianDate] = useState<string>(""); // Store last known Gregorian date
    const currentDob = watch("dob");
    
    // Scroll detection for conditional gradient fade
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);
    
    // Initialize date mode based on existing dob
    useEffect(() => {
        if (client?.dob) {
            if (/^\d{4}$/.test(client.dob)) {
                setDateMode("Year");
            } else if (client.dob.includes("Hebrew:")) {
                setDateMode("Hebrew");
            } else {
                setDateMode("Gregorian");
                // Store the Gregorian date when initializing
                if (!client.dob.includes("Hebrew:")) {
                    setLastGregorianDate(client.dob);
                }
            }
        }
    }, [client]);
    
    // Check for scroll overflow to show/hide gradient fade
    useEffect(() => {
        const checkOverflow = () => {
            const container = scrollContainerRef.current;
            if (container) {
                // Only check if content is scrollable (more content than visible area)
                const hasScrollableContent = container.scrollHeight > container.clientHeight + 20;
                setHasOverflow(hasScrollableContent);
            }
        };
        
        // Initial check with slight delay to ensure DOM is ready
        const timeoutId = setTimeout(checkOverflow, 100);
        
        const container = scrollContainerRef.current;
        if (container) {
            // Also check on resize
            window.addEventListener('resize', checkOverflow);
        }
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkOverflow);
        };
    }, [currentStep]); // Re-check when step changes
    
    // Store Gregorian date when it changes (if in Gregorian mode)
    useEffect(() => {
        if (dateMode === "Gregorian" && currentDob && !currentDob.includes("Hebrew:") && !/^\d{4}$/.test(currentDob)) {
            setLastGregorianDate(currentDob);
        }
    }, [currentDob, dateMode]);

    // Helper function to parse Hebrew numerals to number
    const parseHebrewYearToNumber = (hebrewYear: string): number => {
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
    };

    // Helper function to convert between date formats
    const convertDateFormat = (currentDob: string, fromMode: "Gregorian" | "Hebrew" | "Year", toMode: "Gregorian" | "Hebrew" | "Year"): string => {
        if (!currentDob || currentDob.trim() === "") {
            return "";
        }

        // Year mode - just extract year
        if (fromMode === "Year") {
            const year = parseInt(currentDob);
            if (isNaN(year)) return "";
            
            if (toMode === "Year") return currentDob;
            if (toMode === "Gregorian") {
                // Try to restore the original Gregorian date if we have it stored
                if (lastGregorianDate) {
                    const storedDate = new Date(lastGregorianDate);
                    if (!isNaN(storedDate.getTime())) {
                        // Use the stored month/day with the current year
                        const month = (storedDate.getMonth() + 1).toString().padStart(2, '0');
                        const day = storedDate.getDate().toString().padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                }
                // Fallback: Use January 1st as default
                return `${year}-01-01`;
            }
            if (toMode === "Hebrew") {
                // Convert to Hebrew year (approximate)
                const hebrewYear = year + 3760;
                return `Hebrew: א תשרי ${hebrewYear}`;
            }
        }

        // Gregorian mode
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
                // Approximate conversion: Gregorian + 3760
                const hebrewYear = year + 3760;
                // Approximate Hebrew day and month (simplified - just use same numbers)
                const hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
                    "יא", "יב", "יג", "יד", "טו", "טז", "יז", "יח", "יט", "כ",
                    "כא", "כב", "כג", "כד", "כה", "כו", "כז", "כח", "כט", "ל"];
                const hebrewMonths = ["תשרי", "חשון", "כסלו", "טבת", "שבט", "אדר", 
                    "אדר א", "אדר ב", "ניסן", "אייר", "סיון", "תמוז", "אב", "אלול"];
                
                const hebrewDay = hebrewDays[Math.min(day - 1, 29)] || "א";
                // Map Gregorian month to approximate Hebrew month
                const monthIndex = month <= 12 ? (month + 5) % 12 : 0;
                const hebrewMonth = hebrewMonths[monthIndex] || "תשרי";
                
                return `Hebrew: ${hebrewDay} ${hebrewMonth} ${hebrewYear}`;
            }
        }

        // Hebrew mode
        if (fromMode === "Hebrew") {
            if (toMode === "Hebrew") return currentDob;
            
            // Parse Hebrew date: "Hebrew: Day Month Year"
            const parts = currentDob.replace("Hebrew: ", "").split(" ");
            if (parts.length < 3) return "";
            
            // Extract year (could be Hebrew numerals or numeric)
            const hebrewYearStr = parts[2];
            let numericYear = parseInt(hebrewYearStr);
            
            if (isNaN(numericYear) || numericYear < 1000) {
                // Parse Hebrew numerals
                numericYear = parseHebrewYearToNumber(hebrewYearStr);
            }
            
            // Convert Hebrew year to Gregorian (approximate)
            const gregorianYear = numericYear - 3760;
            
            if (toMode === "Year") {
                return gregorianYear.toString();
            }
            if (toMode === "Gregorian") {
                // Try to map Hebrew day/month back to Gregorian (simplified)
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
                // Convert Hebrew month index to Gregorian month (approximate)
                monthNum = monthNum >= 0 ? ((monthNum + 7) % 12) + 1 : 1;
                
                const paddedMonth = monthNum.toString().padStart(2, '0');
                const paddedDay = dayNum.toString().padStart(2, '0');
                
                return `${gregorianYear}-${paddedMonth}-${paddedDay}`;
            }
        }

        return currentDob;
    };





    // Reset submit ready state when stepping back or forward, but trigger it for the last step
    useEffect(() => {
        if (currentStep === STEPS.length - 1) {
            setIsSubmitReady(false);
            const timer = setTimeout(() => {
                setIsSubmitReady(true);
            }, 500); // 500ms delay to prevent double-tap submission
            return () => clearTimeout(timer);
        } else {
            setIsSubmitReady(false);
        }
    }, [currentStep]);

    const onSubmit = async (values: z.output<typeof formSchema>) => {
        try {
            // Always include the form language
            const valuesWithLang = { ...values, formLanguage: lang };
            
            if (isEditing && client) {
                await updateClient(client.id, valuesWithLang);
                router.push("/clients");
            } else {
                const newClient = await addClient(valuesWithLang);
                // Calculate matches for the new client against existing clients
                const matches = findMatches(newClient, clients);
                setCreatedClient(newClient);
                setMatchResults(matches);
                setShowMatchModal(true);
                // Don't redirect yet
            }
        } catch (error: any) {
            console.error("Failed to submit client:", error);
            alert("Failed to save client: " + (error.message || error));
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError(null);
        setCurrentUploadFile(file);

        try {
            const result = await profileUpload.uploadWithProgress(file);
            
            if (result.url) {
                const newPhotoUrl = result.url;
                setValue("photoUrl", newPhotoUrl);
                setUploadError(null);
                trigger("photoUrl");
                
                // Auto-save: If editing, save immediately to database
                if (isEditing && client) {
                    try {
                        await updateClient(client.id, { photoUrl: newPhotoUrl });
                    } catch (err) {
                        console.error("Failed to auto-save photo:", err);
                    }
                }
            } else {
                const errorMsg = result.error || "Failed to upload image.";
                setUploadError(errorMsg);
                console.error("Upload error:", errorMsg);
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
            setUploadError("Failed to upload image. Please try again.");
        } finally {
            setCurrentUploadFile(null);
        }
        // Reset the input so the same file can be selected again if needed
        e.target.value = "";
    };

    const handleDeletePhoto = () => {
        setDeleteTarget("profile");
        setDeleteConfirmOpen(true);
    };

    const confirmDeletePhoto = async () => {
        if (deleteTarget === "profile") {
            setValue("photoUrl", "");
            trigger("photoUrl");
            
            // Auto-save: If editing, save immediately to database
            if (isEditing && client) {
                try {
                    await updateClient(client.id, { photoUrl: "" });
                } catch (err) {
                    console.error("Failed to auto-save photo deletion:", err);
                }
            }
        } else if (deleteTarget && deleteTarget.type === "gallery") {
            const current = watch("galleryImages") || [];
            const updated = current.filter((_, i) => i !== deleteTarget.index);
            setValue("galleryImages", updated);
            trigger("galleryImages");
            
            // Auto-save: If editing, save immediately to database
            if (isEditing && client) {
                try {
                    await updateClient(client.id, { galleryImages: updated });
                } catch (err) {
                    console.error("Failed to auto-save gallery deletion:", err);
                }
            }
        }
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
    };

    const nextStep = async () => {
        const fields = STEPS[currentStep].fields as any[];
        const isValid = await trigger(fields);

        if (isValid) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAutoPopulate = () => {
        const randomStr = Math.random().toString(36).substring(7);
        const randomSelection = (options: string[]) => options[Math.floor(Math.random() * options.length)] as any;
        const randomMultiSelection = (options: string[], max = 3) => {
            // Filter out "I don't mind" for multi-selects to test specific values, or include it randomly
            const validOptions = options.filter(o => o !== "I don't mind");
            const shuffled = [...validOptions].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.floor(Math.random() * max) + 1) as any;
        };

        // Get option values from translations (always use English values for data storage)
        const genderOptions = opts("gender").map(o => o.value);
        const eyeColorOptions = opts("eyeColor").map(o => o.value);
        const hairColorOptions = opts("hairColor").map(o => o.value);
        const maritalStatusOptions = opts("maritalStatus").map(o => o.value);
        const religiousAffiliationOptions = opts("religiousAffiliation").map(o => o.value);
        const ethnicityOptions = opts("ethnicity").map(o => o.value);
        const tribalStatusOptions = opts("tribalStatus").map(o => o.value);
        const languagesOptions = opts("languages").map(o => o.value);
        const learningStatusOptions = opts("learningStatus").map(o => o.value);
        const headCoveringOptions = opts("headCovering").map(o => o.value);
        const smokingOptions = opts("smoking").map(o => o.value);
        const ageGapOptions = opts("ageGapPreference").map(o => o.value);
        const willingToRelocateOptions = opts("willingToRelocate").map(o => o.value);

        // Check if form is in Hebrew mode
        const isHebrew = lang === "he";

        // Hebrew names for testing
        const hebrewMaleNames = ["דוד כהן", "משה לוי", "יוסף פרידמן", "אברהם שפירא", "יצחק גולדשטיין"];
        const hebrewFemaleNames = ["שרה כהן", "רבקה לוי", "רחל פרידמן", "לאה שפירא", "חנה גולדשטיין"];
        const hebrewLocations = ["ירושלים", "בני ברק", "תל אביב", "בית שמש", "פתח תקווה", "רעננה", "מודיעין"];
        const hebrewOccupations = ["מורה", "מתכנת", "רואה חשבון", "סטודנט", "אחות", "עורך דין", "רופא"];
        const hebrewEducation = ["תיכון", "ישיבה", "סמינר", "תואר ראשון", "תואר שני", "דוקטורט"];
        const hebrewHobbies = ["קריאה, ספורט, מוזיקה", "טיולים, בישול, נסיעות", "אומנות, כתיבה, צילום", "לימוד תורה, שחמט, היסטוריה"];

        // Set name based on gender (we'll set gender first)
        const selectedGender = randomSelection(genderOptions);
        setValue("gender", selectedGender);
        
        if (isHebrew) {
            setValue("fullName", selectedGender === "Male" ? randomSelection(hebrewMaleNames) : randomSelection(hebrewFemaleNames));
            setValue("location", randomSelection(hebrewLocations));
            setValue("occupation", randomSelection(hebrewOccupations));
            setValue("education", randomSelection(hebrewEducation));
            setValue("familyBackground", "משפחה חמה ותומכת. הורים נשואים, אחים ואחיות.");
            setValue("personality", "אדם חם, אכפתי ונעים הליכות. אוהב לעזור לאחרים.");
            setValue("hobbies", randomSelection(hebrewHobbies));
            setValue("references", "הרב כהן: 050-1234567\nגב׳ לוי: 052-7654321");
            setValue("notes", "הערות פנימיות: נוצר באמצעות מילוי אוטומטי.");
        } else {
            setValue("fullName", `Test Client ${randomStr}`);
            setValue("location", randomSelection(["Jerusalem", "Tel Aviv", "Haifa", "Beit Shemesh", "Petach Tikva", "Raanana", "Modiin"]));
            setValue("occupation", randomSelection(["Developer", "Teacher", "Accountant", "Student", "Nurse", "Lawyer", "Doctor", "Sales"]));
            setValue("education", randomSelection(["High School", "Yeshiva", "Seminary", "Degree", "Masters", "PhD"]));
            setValue("familyBackground", "Standard family background description with some details about parents and siblings.");
            setValue("personality", "Auto-generated personality description: Kind, outgoing, and thoughtful.");
            setValue("hobbies", randomSelection(["Reading, Sports, Music", "Hiking, Cooking, Traveling", "Art, Writing, Photography", "Learning Torah, Chess, History"]));
            setValue("references", "Rabbi Cohen: 050-1234567\nMrs. Levy: 052-7654321");
            setValue("notes", "Internal notes: Created via Dev Fill button.");
        }

        setValue("email", `test${randomStr}@example.com`);
        setValue("phone", `050-${Math.floor(Math.random() * 9000000 + 1000000)}`);
        // Random DOB between 18 and 40 years ago
        const age = Math.floor(Math.random() * (40 - 18 + 1) + 18);
        const dob = new Date(new Date().setFullYear(new Date().getFullYear() - age)).toISOString().split('T')[0];
        setValue("dob", dob);

        setValue("height", 150 + Math.floor(Math.random() * 40)); // 150-190cm
        setValue("eyeColor", randomSelection(eyeColorOptions));
        setValue("hairColor", randomSelection(hairColorOptions));

        setValue("maritalStatus", randomSelection(maritalStatusOptions));
        setValue("active", true);
        setValue("children", Math.floor(Math.random() * 4));

        setValue("religiousAffiliation", randomMultiSelection(religiousAffiliationOptions));
        setValue("ethnicity", randomSelection(ethnicityOptions));
        setValue("tribalStatus", randomSelection(tribalStatusOptions));

        setValue("languages", randomMultiSelection(languagesOptions));
        setValue("learningStatus", randomSelection(learningStatusOptions));

        setValue("headCovering", randomSelection(headCoveringOptions));
        setValue("smoking", randomSelection(smokingOptions));

        const hasMedical = Math.random() > 0.8 ? "Yes" : "No";
        setValue("medicalHistory", hasMedical);
        setValue("medicalHistoryDetails", hasMedical === "Yes" ? (isHebrew ? "אלרגיות עונתיות קלות" : "Minor seasonal allergies") : "");

        setValue("ageGapPreference", randomMultiSelection(ageGapOptions));
        setValue("willingToRelocate", randomSelection(willingToRelocateOptions));

        setValue("preferredEthnicities", randomMultiSelection(["I don't mind", ...ethnicityOptions]));
        setValue("preferredHashkafos", randomMultiSelection(["I don't mind", ...religiousAffiliationOptions]));
        setValue("preferredLearningStatus", randomMultiSelection(["I don't mind", ...learningStatusOptions]));
        setValue("preferredHeadCovering", randomMultiSelection(["I don't mind", ...headCoveringOptions]));
    };

    const watchedPhotoUrl = watch("photoUrl");
    const watchedMedical = watch("medicalHistory");
    const watchedGender = watch("gender");

    // Helper function to get color based on confidence (red, orange, yellow)
    const getConfidenceColor = (confidence: number | undefined): string => {
        if (confidence === undefined || confidence === null) {
            return ""; // No color if no confidence data
        }
        // Clamp confidence between 0 and 1
        const clamped = Math.max(0, Math.min(1, confidence));
        
        let color: string;
        // Red: < 0.3
        if (clamped < 0.3) {
            color = "#ef4444"; // red-500
        }
        // Orange: 0.3 to 0.7
        else if (clamped >= 0.3 && clamped < 0.7) {
            color = "#f97316"; // orange-500
        }
        // Yellow: 0.7 to < 1.0
        else if (clamped >= 0.7 && clamped < 1.0) {
            color = "#eab308"; // yellow-500
        }
        // Perfect confidence (1.0) - green
        else {
            color = "#22c55e"; // green-500
        }
        
        // Debug logging
        console.log(`Confidence: ${clamped.toFixed(2)}, Color: ${color}`);
        
        return color;
    };

    // Helper function to get field border style based on confidence
    const getFieldStyle = (fieldName: string): React.CSSProperties => {
        const confidence = fieldConfidences[fieldName];
        if (confidence === undefined || confidence === null) {
            return {};
        }
        const borderColor = getConfidenceColor(confidence);
        if (!borderColor) return {};
        
        // Return style object - inline styles override Tailwind classes
        return {
            border: `2px solid ${borderColor}`,
            borderColor: borderColor,
            borderWidth: '2px',
            borderStyle: 'solid'
        };
    };

    // Auto-fill handlers (for image-based auto-fill)
    const handleAutoFill = (data: any) => {
        console.log("handleAutoFill called with data:", data);
        
        const confidences: Record<string, number> = {};
        
        // Helper function to extract value and confidence from nested structure
        const extractValueAndConfidence = (fieldData: any): { value: any; confidence?: number } => {
            // If it's already a simple value (string, number, boolean, array), return it
            if (fieldData === null || fieldData === undefined) {
                return { value: null };
            }
            
            // Check if it's the nested structure { value, confidence, sourceQuote }
            if (typeof fieldData === "object" && !Array.isArray(fieldData) && "value" in fieldData) {
                return {
                    value: fieldData.value,
                    confidence: typeof fieldData.confidence === "number" ? fieldData.confidence : undefined
                };
            }
            
            // If it's a nested object (like fatherDetails), recursively extract
            if (typeof fieldData === "object" && !Array.isArray(fieldData)) {
                const extracted: any = {};
                let minConfidence: number | undefined = undefined;
                Object.keys(fieldData).forEach((nestedKey) => {
                    // Skip helper fields
                    if (nestedKey.startsWith("_")) {
                        return;
                    }
                    // Skip metadata fields but track confidence
                    if (nestedKey === "confidence") {
                        minConfidence = typeof fieldData.confidence === "number" ? fieldData.confidence : undefined;
                        return;
                    }
                    if (nestedKey === "sourceQuote") {
                        return;
                    }
                    const result = extractValueAndConfidence(fieldData[nestedKey]);
                    extracted[nestedKey] = result.value;
                    if (result.confidence !== undefined) {
                        minConfidence = minConfidence === undefined 
                            ? result.confidence 
                            : Math.min(minConfidence, result.confidence);
                    }
                });
                // Return null if object is empty after extraction
                return {
                    value: Object.keys(extracted).length > 0 ? extracted : null,
                    confidence: minConfidence
                };
            }
            
            // Return as-is for arrays and primitives
            return { value: fieldData };
        };
        
        // Helper function to extract value from nested structure (for backward compatibility)
        const extractValue = (fieldData: any): any => {
            return extractValueAndConfidence(fieldData).value;
        };

        let fieldsSet = 0;
        let fieldsSkipped = 0;
        const errors: string[] = [];

        // Process all fields
        Object.keys(data).forEach((key) => {
            // Skip helper fields and metadata
            if (key.startsWith("_") || key === "ai_analysis") {
                fieldsSkipped++;
                return;
            }

            const fieldData = data[key];
            
            // Skip null, undefined, or empty strings
            if (fieldData === null || fieldData === undefined || fieldData === "") {
                fieldsSkipped++;
                return;
            }

            try {
                // Extract the actual value and confidence (handles nested structure)
                const { value, confidence } = extractValueAndConfidence(fieldData);
                
                // Store confidence for color coding
                if (confidence !== undefined) {
                    confidences[key] = confidence;
                }
                
                // Special handling for headCovering: default to "Flexible" if not mentioned
                if (key === "headCovering" && (value === null || value === undefined || value === "")) {
                    setValue("headCovering", "Flexible");
                    confidences["headCovering"] = 0.0; // Low confidence since it's a default
                    fieldsSet++;
                    trigger("headCovering");
                    return;
                }
                
                // Only set if we have a valid value
                if (value !== null && value !== undefined && value !== "") {
                    // Handle arrays - ensure they're arrays
                    if (Array.isArray(value)) {
                        setValue(key as any, value);
                        fieldsSet++;
                    }
                    // Handle special cases for nested objects
                    else if (typeof value === "object" && !Array.isArray(value) && (key === "fatherDetails" || key === "motherDetails")) {
                        // For fatherDetails/motherDetails, set nested fields if they exist in the schema
                        if (value.name) {
                            setValue(`${key}.name` as any, value.name);
                        }
                        if (value.occupation) {
                            setValue(`${key}.occupation` as any, value.occupation);
                        }
                        fieldsSet++;
                    }
                    // Handle all other fields (strings, numbers, booleans)
                    else if (typeof value !== "object") {
                        setValue(key as any, value);
                        fieldsSet++;
                    }
                    // Skip complex nested objects that aren't fatherDetails/motherDetails
                    else {
                        console.warn(`Skipping complex nested object for field ${key}:`, value);
                        fieldsSkipped++;
                    }
                    trigger(key as any);
                } else {
                    fieldsSkipped++;
                }
            } catch (error: any) {
                const errorMsg = `Failed to set field ${key}: ${error?.message || error}`;
                console.warn(errorMsg);
                errors.push(errorMsg);
            }
        });

        // Store confidence scores for color coding
        setFieldConfidences(confidences);
        
        console.log(`Form fill complete: ${fieldsSet} fields set, ${fieldsSkipped} fields skipped`);
        if (errors.length > 0) {
            console.warn("Errors during form fill:", errors);
        }
        
        // Show user-friendly message
        if (fieldsSet > 0) {
            console.log(`Successfully populated ${fieldsSet} form field(s)`);
        } else {
            console.warn("No fields were populated. Check the JSON structure.");
        }
    };

    const handleAddToGallery = async (urls: string[]) => {
        const current = watch("galleryImages") || [];
        const updated = [...current, ...urls];
        setValue("galleryImages", updated);
        trigger("galleryImages");
        
        // Auto-save if editing
        if (isEditing && client) {
            try {
                await updateClient(client.id, { galleryImages: updated });
            } catch (err) {
                console.error("Failed to auto-save gallery images:", err);
            }
        }
    };

    const handleSetProfilePhoto = async (url: string) => {
        setValue("photoUrl", url);
        trigger("photoUrl");
        
        // Auto-save if editing
        if (isEditing && client) {
            try {
                await updateClient(client.id, { photoUrl: url });
            } catch (err) {
                console.error("Failed to auto-save profile photo:", err);
            }
        }
    };



    return (
        <>
            <div className={cn(
                "fixed inset-x-0 bottom-0 top-[4rem] z-40 bg-white dark:bg-gray-950 flex flex-col md:relative md:inset-auto md:top-auto md:w-[80%] md:mx-auto md:flex-1 md:h-full md:overflow-hidden md:bg-transparent md:flex",
                rtl && "rtl"
            )} dir={rtl ? "rtl" : "ltr"}>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    onKeyDown={(e) => {
                        // Prevent implicit submission on Enter, allow inside textareas
                        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                            e.preventDefault();
                        }
                    }}
                    className="flex flex-col h-full md:h-full md:overflow-hidden relative"
                >
                    {/* Wizard Header - Sticky on Mobile */}
                    <div className="shrink-0 bg-white dark:bg-gray-950 p-4 border-b z-30">
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold">{STEPS[currentStep].title}</h2>
                                {!isEditing && (
                                    <>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAutoFillModal(true)} 
                                            className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 hover:bg-green-200 flex items-center gap-1"
                                        >
                                            <UploadCloud className="h-3 w-3" />
                                            {t(lang, "buttons.autoFill")}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowJsonFillModal(true)} 
                                            className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 hover:bg-purple-200 flex items-center gap-1"
                                            title="Fill form with JSON file (for testing)"
                                        >
                                            <FileJson className="h-3 w-3" />
                                            JSON Fill
                                        </button>
                                    </>
                                )}
                                <button type="button" onClick={handleAutoPopulate} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-200">{t(lang, "buttons.devFill")}</button>
                            </div>
                            <span className="text-sm text-gray-500">
                                {t(lang, "messages.step")} {currentStep + 1} {t(lang, "messages.of")} {STEPS.length}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-800">
                            <div
                                className={cn("bg-red-600 h-2 rounded-full transition-all duration-300", rtl && "float-right")}
                                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Steps Content - Scrollable on Mobile and Desktop with EXTRA padding for validation errors */}
                    <div 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-gray-950 p-6 space-y-6 custom-scrollbar pb-48 md:pb-28"
                    >

                        {/* STEP 0: BASIC INFO */}
                        {currentStep === 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.fullName")}</label>
                                        <input {...register("fullName")} style={getFieldStyle("fullName")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.fullName")} dir={rtl ? "rtl" : "ltr"} />
                                        {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName?.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.email")}</label>
                                        <input {...register("email")} style={getFieldStyle("email")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.email")} dir="ltr" />
                                        {errors.email && <p className="text-red-500 text-xs">{errors.email?.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.phone")}</label>
                                        <input {...register("phone")} style={getFieldStyle("phone")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.phone")} dir="ltr" />
                                        {errors.phone && <p className="text-red-500 text-xs">{errors.phone?.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">{t(lang, "labels.dob")}</label>
                                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const converted = convertDateFormat(currentDob || "", dateMode, "Gregorian");
                                                        setDateMode("Gregorian");
                                                        setValue("dob", converted);
                                                    }}
                                                    className={`px-2 py-1 rounded-sm transition-colors ${dateMode === "Gregorian" ? "bg-white dark:bg-gray-600 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                                >
                                                    {t(lang, "dateMode.gregorian")}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Store the current Gregorian date before switching to Year Only
                                                        if (dateMode === "Gregorian" && currentDob && !currentDob.includes("Hebrew:") && !/^\d{4}$/.test(currentDob)) {
                                                            setLastGregorianDate(currentDob);
                                                        }
                                                        const converted = convertDateFormat(currentDob || "", dateMode, "Year");
                                                        setDateMode("Year");
                                                        setValue("dob", converted || new Date().getFullYear().toString());
                                                    }}
                                                    className={`px-2 py-1 rounded-sm transition-colors ${dateMode === "Year" ? "bg-white dark:bg-gray-600 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                                >
                                                    {t(lang, "dateMode.yearOnly")}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const converted = convertDateFormat(currentDob || "", dateMode, "Hebrew");
                                                        setDateMode("Hebrew");
                                                        setValue("dob", converted || `Hebrew: א תשרי ${new Date().getFullYear() + 3760}`);
                                                    }}
                                                    className={`px-2 py-1 rounded-sm transition-colors ${dateMode === "Hebrew" ? "bg-white dark:bg-gray-600 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                                >
                                                    {t(lang, "dateMode.hebrew")}
                                                </button>
                                            </div>
                                        </div>

                                        <Controller
                                            name="dob"
                                            control={control}
                                            defaultValue=""
                                            render={({ field }) => (
                                                <DateCarousel
                                                    mode={dateMode}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        {errors.dob && <p className="text-red-500 text-xs">{errors.dob?.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.gender")}</label>
                                        <select {...register("gender")} style={getFieldStyle("gender")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("gender").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.location")}</label>
                                        <input {...register("location")} style={getFieldStyle("location")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.location")} dir={rtl ? "rtl" : "ltr"} />
                                        {errors.location && <p className="text-red-500 text-xs">{errors.location?.message}</p>}
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* STEP 1: APPEARANCE */}
                        {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4">
                                    <label className="text-sm font-medium block">{t(lang, "labels.profilePhoto")}</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 overflow-visible border">
                                            {watchedPhotoUrl ? (
                                                <>
                                                    <div className="relative w-full h-full rounded-full overflow-hidden">
                                                        <Image src={watchedPhotoUrl || ""} alt="Preview" fill className="object-cover" sizes="96px" />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleDeletePhoto}
                                                        className={cn("absolute -top-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors shadow-lg z-10 flex items-center justify-center", rtl ? "-left-1" : "-right-1")}
                                                        title={t(lang, "buttons.delete")}
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">{t(lang, "messages.noImage")}</div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="relative inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 w-full mb-2 disabled:opacity-50 disabled:cursor-not-allowed" style={{ pointerEvents: profileUpload.isUploading ? 'none' : 'auto' }}>
                                                {profileUpload.isUploading ? (
                                                    <CircularProgress 
                                                        progress={profileUpload.progress} 
                                                        size={20} 
                                                        strokeWidth={2.5}
                                                        showPercentage={currentUploadFile ? profileUpload.isLargeFile(currentUploadFile) : false}
                                                        className={rtl ? "ml-2" : "mr-2"}
                                                    />
                                                ) : (
                                                    <UploadCloud className={cn("h-4 w-4", rtl ? "ml-2" : "mr-2")} />
                                                )}
                                                <span>
                                                    {profileUpload.isUploading 
                                                        ? "..." 
                                                        : t(lang, "buttons.uploadPhoto")}
                                                </span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={profileUpload.isUploading} />
                                            </label>
                                            <p className="text-xs text-gray-500">{t(lang, "messages.uploadLimit")}</p>
                                            {uploadError && (
                                                <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.height")}</label>
                                        <input type="number" {...register("height", { valueAsNumber: true })} style={getFieldStyle("height")} className="w-full p-2 border rounded-md dark:bg-gray-900" dir="ltr" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.eyeColor")}</label>
                                        <select {...register("eyeColor")} style={getFieldStyle("eyeColor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("eyeColor").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.hairColor")}</label>
                                        <select {...register("hairColor")} style={getFieldStyle("hairColor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("hairColor").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <label className="text-sm font-medium block">{t(lang, "labels.galleryImages")}</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(watch("galleryImages") || []).map((img: string, idx: number) => (
                                            <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-gray-100 border">
                                                <Image src={img} alt="" fill className="object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeleteTarget({ type: "gallery", index: idx });
                                                        setDeleteConfirmOpen(true);
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex flex-col">
                                            <label className="relative flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer bg-gray-50 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed" style={{ pointerEvents: galleryUpload.isUploading ? 'none' : 'auto' }}>
                                                {galleryUpload.isUploading ? (
                                                    <>
                                                        <CircularProgress 
                                                            progress={galleryUpload.progress} 
                                                            size={28} 
                                                            strokeWidth={3}
                                                            showPercentage={galleryUploadFile ? galleryUpload.isLargeFile(galleryUploadFile) : false}
                                                        />
                                                        <span className="text-xs text-gray-500 mt-1">Uploading...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UploadCloud className="h-6 w-6 text-gray-400" />
                                                        <span className="text-xs text-gray-500 mt-1">{t(lang, "buttons.add")}</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    multiple
                                                    disabled={galleryUpload.isUploading}
                                                    onChange={async (e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        if (files.length === 0) return;

                                                        setUploadError(null);

                                                        // Upload one by one
                                                        const uploadedUrls: string[] = [];
                                                        for (const file of files) {
                                                            setGalleryUploadFile(file);
                                                            try {
                                                                const result = await galleryUpload.uploadWithProgress(file);
                                                                if (result.url) {
                                                                    uploadedUrls.push(result.url);
                                                                    setUploadError(null); // Clear errors on success
                                                                } else {
                                                                    const errorMsg = result.error || "Failed to upload image.";
                                                                    setUploadError(errorMsg);
                                                                    console.error("Upload error:", errorMsg);
                                                                    break; // Stop uploading remaining files if one fails
                                                                }
                                                            } catch (err: any) {
                                                                console.error("Upload failed", err);
                                                                const errorMsg = err?.message || "Failed to upload image. Please try again.";
                                                                setUploadError(errorMsg);
                                                                break;
                                                            }
                                                        }

                                                        // Update gallery images with all uploaded URLs
                                                        if (uploadedUrls.length > 0) {
                                                            const current = watch("galleryImages") || [];
                                                            const updated = [...current, ...uploadedUrls];
                                                            setValue("galleryImages", updated);
                                                            trigger("galleryImages");
                                                            
                                                            // Auto-save: If editing, save immediately to database
                                                            if (isEditing && client) {
                                                                try {
                                                                    await updateClient(client.id, { galleryImages: updated });
                                                                } catch (err) {
                                                                    console.error("Failed to auto-save gallery images:", err);
                                                                }
                                                            }
                                                        }
                                                        
                                                        setGalleryUploadFile(null);
                                                        galleryUpload.reset();
                                                        // Reset the input so the same files can be selected again if needed
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </label>
                                            {uploadError && (
                                                <p className="text-xs text-red-500 mt-1 text-center">{uploadError}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        )}

                        {/* STEP 2: BACKGROUND */}
                        {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.ethnicity")}</label>
                                    <select {...register("ethnicity")} style={getFieldStyle("ethnicity")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        {opts("ethnicity").map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.tribalStatus")}</label>
                                    <select {...register("tribalStatus")} style={getFieldStyle("tribalStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        <option value="">{t(lang, "messages.selectOption")}</option>
                                        {opts("tribalStatus").map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.maritalStatus")}</label>
                                    <select {...register("maritalStatus")} style={getFieldStyle("maritalStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        {opts("maritalStatus").map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.occupation")}</label>
                                    <input {...register("occupation")} style={getFieldStyle("occupation")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.occupation")} dir={rtl ? "rtl" : "ltr"} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.languages")}</label>
                                    <Controller
                                        name="languages"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <MultiSelect
                                                options={opts("languages").map(o => o.value)}
                                                optionLabels={opts("languages").map(o => o.label)}
                                                selected={Array.isArray(field.value) ? field.value : []}
                                                onChange={field.onChange}
                                                placeholder={t(lang, "placeholders.selectLanguages")}
                                                style={getFieldStyle("languages")}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.familyBackground")}</label>
                                    <textarea {...register("familyBackground")} style={getFieldStyle("familyBackground")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" placeholder={t(lang, "placeholders.familyBackground")} dir={rtl ? "rtl" : "ltr"} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.education")}</label>
                                    <input {...register("education")} style={getFieldStyle("education")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.education")} dir={rtl ? "rtl" : "ltr"} />
                                </div>
                            </div>
                        )}

                        {/* STEP 3: RELIGIOUS DETAILS */}
                        {currentStep === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.religiousAffiliation")}</label>
                                    <Controller
                                        name="religiousAffiliation"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <MultiSelect
                                                options={opts("religiousAffiliation").map(o => o.value)}
                                                optionLabels={opts("religiousAffiliation").map(o => o.label)}
                                                selected={Array.isArray(field.value) ? field.value : (field.value ? [field.value] : [])}
                                                onChange={field.onChange}
                                                placeholder={t(lang, "placeholders.selectAffiliations")}
                                                style={getFieldStyle("religiousAffiliation")}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.learningStatus")}</label>
                                    <select {...register("learningStatus")} style={getFieldStyle("learningStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        {opts("learningStatus").map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.headCovering")}</label>
                                    <select {...register("headCovering")} style={getFieldStyle("headCovering")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        {opts("headCovering").map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.smoking")}</label>
                                    <select {...register("smoking")} style={getFieldStyle("smoking")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        {opts("smoking").map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: PERSONAL */}
                        {currentStep === 4 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.personality")}</label>
                                    <textarea {...register("personality")} style={getFieldStyle("personality")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" placeholder={t(lang, "placeholders.personality")} dir={rtl ? "rtl" : "ltr"} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.hobbies")}</label>
                                    <textarea 
                                        {...register("hobbies")} 
                                        style={getFieldStyle("hobbies")}
                                        className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" 
                                        placeholder={t(lang, "placeholders.hobbies")} 
                                        dir={rtl ? "rtl" : "ltr"}
                                    />
                                </div>
                                <div className="space-y-4 border-t pt-4">
                                    <label className="text-sm font-medium block">{t(lang, "labels.medicalHistory")}</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 border p-3 rounded-md w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <input type="radio" value="No" {...register("medicalHistory")} className="text-red-600 focus:ring-red-500" />
                                            <span>{opts("medicalHistory")[0].label}</span>
                                        </label>
                                        <label className="flex items-center gap-2 border p-3 rounded-md w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <input type="radio" value="Yes" {...register("medicalHistory")} className="text-red-600 focus:ring-red-500" />
                                            <span>{opts("medicalHistory")[1].label}</span>
                                        </label>
                                    </div>
                                    {watchedMedical === "Yes" && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-sm font-medium">{t(lang, "labels.medicalHistoryDetails")}</label>
                                            <textarea {...register("medicalHistoryDetails")} style={getFieldStyle("medicalHistoryDetails")} className="w-full p-2 border rounded-md dark:bg-gray-900" dir={rtl ? "rtl" : "ltr"} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 5: PREFERENCES */}
                        {currentStep === 5 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.ageGapPreference")}</label>
                                    <Controller
                                        name="ageGapPreference"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <MultiSelect
                                                options={opts("ageGapPreference").map(o => o.value)}
                                                optionLabels={opts("ageGapPreference").map(o => o.label)}
                                                selected={Array.isArray(field.value) ? field.value : [String(field.value)]}
                                                onChange={field.onChange}
                                                placeholder={t(lang, "placeholders.selectAgeGap")}
                                                style={getFieldStyle("ageGapPreference")}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.willingToRelocate")}</label>
                                    <select {...register("willingToRelocate")} style={getFieldStyle("willingToRelocate")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        {opts("willingToRelocate").map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferredEthnicities")}</label>
                                    <Controller
                                        name="preferredEthnicities"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <MultiSelect
                                                options={["I don't mind", ...opts("ethnicity").map(o => o.value)]}
                                                optionLabels={[lang === "he" ? "לא משנה לי" : "I don't mind", ...opts("ethnicity").map(o => o.label)]}
                                                selected={Array.isArray(field.value) ? field.value : []}
                                                onChange={field.onChange}
                                                placeholder={t(lang, "placeholders.selectEthnicities")}
                                                style={getFieldStyle("preferredEthnicities")}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferredHashkafos")}</label>
                                    <Controller
                                        name="preferredHashkafos"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <MultiSelect
                                                options={["I don't mind", ...opts("religiousAffiliation").map(o => o.value)]}
                                                optionLabels={[lang === "he" ? "לא משנה לי" : "I don't mind", ...opts("religiousAffiliation").map(o => o.label)]}
                                                selected={Array.isArray(field.value) ? field.value : []}
                                                onChange={field.onChange}
                                                placeholder={t(lang, "placeholders.selectHashkafos")}
                                                style={getFieldStyle("preferredHashkafos")}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferredLearningStatus")}</label>
                                    <Controller
                                        name="preferredLearningStatus"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <MultiSelect
                                                options={["I don't mind", ...opts("learningStatus").map(o => o.value)]}
                                                optionLabels={[lang === "he" ? "לא משנה לי" : "I don't mind", ...opts("learningStatus").map(o => o.label)]}
                                                selected={Array.isArray(field.value) ? field.value : []}
                                                onChange={field.onChange}
                                                placeholder={t(lang, "placeholders.selectLearningStatus")}
                                                style={getFieldStyle("preferredLearningStatus")}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferredHeadCovering")}</label>
                                    <Controller
                                        name="preferredHeadCovering"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <MultiSelect
                                                options={["I don't mind", ...opts("headCovering").map(o => o.value)]}
                                                optionLabels={[lang === "he" ? "לא משנה לי" : "I don't mind", ...opts("headCovering").map(o => o.label)]}
                                                selected={Array.isArray(field.value) ? field.value : []}
                                                onChange={field.onChange}
                                                placeholder={t(lang, "placeholders.selectHeadCovering")}
                                                style={getFieldStyle("preferredHeadCovering")}
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 6: ADMIN */}
                        {currentStep === 6 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.references")}</label>
                                    <textarea {...register("references")} style={getFieldStyle("references")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" dir={rtl ? "rtl" : "ltr"} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.notes")}</label>
                                    <textarea {...register("notes")} style={getFieldStyle("notes")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" dir={rtl ? "rtl" : "ltr"} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.resumeRawText")}</label>
                                    <textarea 
                                        {...register("resumeRawText")} 
                                        style={getFieldStyle("resumeRawText")}
                                        className="w-full p-2 border rounded-md h-32 dark:bg-gray-900 font-mono text-xs" 
                                        placeholder={t(lang, "placeholders.resumeRawText")}
                                        dir="auto"
                                    />
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer Navigation - Fixed at bottom on both mobile and desktop */}
                    <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 md:bottom-4 shrink-0 pt-4 px-4 pb-4 flex items-center justify-center gap-4">
                        {/* Gradient fade - only show when content overflows */}
                        {hasOverflow && (
                            <div className="pointer-events-none absolute -top-16 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-gray-950 dark:via-gray-950/80" />
                        )}
                        {/* Background for buttons */}
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white to-white/95 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/95 -z-10" />
                        <div className="flex gap-2 relative z-10">
                            {isEditing && onCancel && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                >
                                    {t(lang, "buttons.cancel")}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if (currentStep === 0) {
                                        router.push("/clients");
                                    } else {
                                        prevStep();
                                    }
                                }}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                            >
                                {rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                                {t(lang, "buttons.back")}
                            </button>
                        </div>

                        {currentStep < STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                {t(lang, "buttons.next")}
                                {rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!isSubmitReady}
                                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isSubmitReady ? 'bg-green-600 hover:bg-green-700' : 'bg-green-400 cursor-not-allowed'}`}
                            >
                                {isEditing ? t(lang, "buttons.update") : t(lang, "buttons.submit")}
                                <Check className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </form >
            </div >

            {createdClient && (
                <AutomaticMatchingModal
                    isOpen={showMatchModal}
                    onClose={() => router.push("/clients")}
                    onViewAll={() => router.push(`/matching?clientId=${createdClient.id}&view=results`)}
                    matches={matchResults}
                    newClient={createdClient}
                />
            )}

            <ConfirmationModal
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteTarget(null);
                }}
                onConfirm={confirmDeletePhoto}
                title={t(lang, "confirmation.deleteImageTitle")}
                message={deleteTarget === "profile" 
                    ? t(lang, "confirmation.deleteProfileMessage")
                    : t(lang, "confirmation.deleteGalleryMessage")}
                confirmText={t(lang, "buttons.delete")}
                cancelText={t(lang, "buttons.cancel")}
                isDangerous={true}
            />

            <AutoFillModal
                isOpen={showAutoFillModal}
                onClose={() => setShowAutoFillModal(false)}
                onFillForm={handleAutoFill}
                onAddToGallery={handleAddToGallery}
                onSetProfilePhoto={handleSetProfilePhoto}
            />

            <JsonFillModal
                isOpen={showJsonFillModal}
                onClose={() => setShowJsonFillModal(false)}
                onFillForm={handleAutoFill}
            />
        </>
    );
}

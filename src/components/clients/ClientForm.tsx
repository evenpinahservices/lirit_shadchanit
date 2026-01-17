"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Client, ClientSchema } from "@/lib/mockData";
import { useClients } from "@/context/ClientContext";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, UploadCloud, X, FileJson, CheckCircle2, Trash2 } from "lucide-react";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { useUploadWithProgress } from "@/hooks/useUploadWithProgress";
import Image from "next/image";
import { cn, detectClientLanguage, convertHebrewYearToLetters, parseHebrewYearToNumber } from "@/lib/utils";
import { AutomaticMatchingModal } from "./AutomaticMatchingModal";
import { AutoFillModal } from "./AutoFillModal";
import { JsonFillModal } from "./JsonFillModal";
import { findMatches } from "@/lib/matchingUtils";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { DateCarousel } from "@/components/ui/DateCarousel";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { FormLanguage, translations, t, getOptions, isRTL } from "@/lib/translations";
import { createPendingClient } from "@/actions/pendingClient";

const formSchema = ClientSchema;

// Tooltip component for showing source quotes with smart positioning
function FieldWithTooltip({ 
    children, 
    sourceQuote, 
    fieldName 
}: { 
    children: React.ReactNode; 
    sourceQuote: string | null | undefined; 
    fieldName: string;
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [position, setPosition] = useState<"top" | "bottom">("bottom");
    const fieldRef = useRef<HTMLDivElement>(null);
    
    // Only show tooltip if sourceQuote exists and is not empty
    if (!sourceQuote || (typeof sourceQuote === 'string' && sourceQuote.trim() === '') || sourceQuote === 'null') {
        return <>{children}</>;
    }
    
    const handleMouseEnter = () => {
        if (fieldRef.current) {
            const rect = fieldRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceAbove = rect.top;
            const spaceBelow = viewportHeight - rect.bottom;
            const tooltipHeight = 250; // Approximate tooltip height with padding
            
            // Always show below if field is within 300px from top of viewport
            if (rect.top < 300) {
                setPosition("bottom");
            } 
            // Or if not enough space above (less than tooltip height)
            else if (spaceAbove < tooltipHeight) {
                setPosition("bottom");
            } 
            // Or if there's more space below than above
            else if (spaceBelow > spaceAbove) {
                setPosition("bottom");
            } 
            // Otherwise show above
            else {
                setPosition("top");
            }
        }
        setShowTooltip(true);
    };
    
    return (
        <div 
            ref={fieldRef}
            className="relative w-full group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {children}
            {showTooltip && (
                <div 
                    className={`absolute z-50 w-80 max-w-[90vw] p-3 text-sm bg-white dark:bg-gray-100 text-gray-900 dark:text-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-400 pointer-events-none`}
                    style={position === "top" ? {
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    } : {
                        top: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="font-semibold mb-2 text-xs text-gray-600 dark:text-gray-700 uppercase tracking-wide">AI Source Quote:</div>
                    <div className="text-xs whitespace-pre-wrap wrap-break-word leading-relaxed text-gray-800 dark:text-gray-900">{sourceQuote}</div>
                    {position === "top" ? (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white dark:border-t-gray-100"></div>
                    ) : (
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-white dark:border-b-gray-100"></div>
                    )}
                </div>
            )}
        </div>
    );
}

interface ClientFormProps {
    client?: Client;
    isEditing?: boolean;
    onCancel?: () => void;
    language?: FormLanguage;
    onSubmitToPending?: (values: any) => Promise<void>; // Custom handler for pending submissions
    isExternalForm?: boolean; // If true, this is an external form (client submission)
    onApprove?: () => void; // Handler for approving (used in inbox review)
    onReject?: () => void; // Handler for rejecting (used in inbox review)
    isApproving?: boolean; // Loading state for approval
    isRejecting?: boolean; // Loading state for rejection
}

// Step definitions for the wizard (keys for translation lookup)
const STEP_KEYS = [
    { titleKey: "basicInfo", fields: ["fullName", "email", "phone", "dob", "gender", "location"] },
    { titleKey: "appearance", fields: ["height", "eyeColor", "hairColor", "photoUrl"] },
    { titleKey: "background", fields: ["ethnicity", "tribalStatus", "maritalStatus", "languages", "familyBackground", "education", "occupation"] },
    { titleKey: "religiousDetails", fields: ["religiousAffiliation", "learningStatus", "headCovering"] },
    { titleKey: "personal", fields: ["hobbies", "personality", "smoking", "medicalHistory", "medicalHistoryDetails"] },
    { titleKey: "preferences", fields: ["ageGapPreference", "willingToRelocate", "preferredEthnicities", "preferredHashkafos", "preferredLearningStatus", "preferredHeadCovering", "preferencesFreeText"] },
    { titleKey: "admin", fields: ["references", "notes"] },
];

export function ClientForm({ client, isEditing = false, onCancel, language = "en", onSubmitToPending, isExternalForm = false, onApprove, onReject, isApproving = false, isRejecting = false }: ClientFormProps) {
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
        preferencesFreeText: "",
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, detectedLang, formLanguageFromForm]);
    
    // Memoize translated step titles - include admin step for external forms (but only show references)
    const STEPS = useMemo(() => {
        const steps = STEP_KEYS.map(step => ({
            ...step,
            title: t(lang, `steps.${step.titleKey}`)
        }));
        // Keep all steps for both admin and external forms (external forms will show only references in step 6)
        return steps;
    }, [lang]);

    // Helper to get option arrays with value/label
    const opts = (key: keyof typeof translations.en.options) => getOptions(lang, key);

    const { addClient, updateClient, clients } = useClients();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSubmitReady, setIsSubmitReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldConfidences, setFieldConfidences] = useState<Record<string, number>>({});
    const [sourceQuotes, setSourceQuotes] = useState<Record<string, string | null>>({});
    
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
    const [isDraggingProfile, setIsDraggingProfile] = useState(false);
    const [isDraggingGallery, setIsDraggingGallery] = useState(false);

    const [createdClient, setCreatedClient] = useState<Client | null>(null);
    const [filledFromWhatsApp, setFilledFromWhatsApp] = useState(false);
    const [submitToPending, setSubmitToPending] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    // Date Logic - Flexible DOB
    const [dateMode, setDateMode] = useState<"Gregorian" | "Hebrew" | "Year">("Gregorian");
    const [lastGregorianDate, setLastGregorianDate] = useState<string>(""); // Store last known Gregorian date
    const currentDob = watch("dob");
    const [age, setAge] = useState<number | "">("");
    const isUpdatingFromAgeRef = useRef(false);
    const isUpdatingFromDobRef = useRef(false);
    
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
    }, [currentStep, showSummary]); // Re-check when step changes or summary is shown
    
    // Store Gregorian date when it changes (if in Gregorian mode)
    useEffect(() => {
        if (dateMode === "Gregorian" && currentDob && !currentDob.includes("Hebrew:") && !/^\d{4}$/.test(currentDob)) {
            setLastGregorianDate(currentDob);
        }
    }, [currentDob, dateMode]);


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
                const hebrewYearLetters = convertHebrewYearToLetters(hebrewYear);
                return `Hebrew: א תשרי ${hebrewYearLetters}`;
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
                const hebrewYearLetters = convertHebrewYearToLetters(hebrewYear);
                // Use Hebrew letters for day and month
                const hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
                    "יא", "יב", "יג", "יד", "טו", "טז", "יז", "יח", "יט", "כ",
                    "כא", "כב", "כג", "כד", "כה", "כו", "כז", "כח", "כט", "ל"];
                const hebrewMonths = ["תשרי", "חשון", "כסלו", "טבת", "שבט", "אדר", 
                    "אדר א", "אדר ב", "ניסן", "אייר", "סיון", "תמוז", "אב", "אלול"];
                
                const hebrewDay = hebrewDays[Math.min(day - 1, 29)] || "א";
                // Map Gregorian month to approximate Hebrew month
                const monthIndex = month <= 12 ? (month + 5) % 12 : 0;
                const hebrewMonth = hebrewMonths[monthIndex] || "תשרי";
                
                return `Hebrew: ${hebrewDay} ${hebrewMonth} ${hebrewYearLetters}`;
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

    // Calculate age from DOB
    const calculateAgeFromDob = (dob: string): number | "" => {
        if (!dob || dob.trim() === "") return "";
        
        // Handle Year Only (YYYY)
        if (/^\d{4}$/.test(dob)) {
            const year = parseInt(dob);
            if (isNaN(year)) return "";
            return new Date().getFullYear() - year;
        }
        
        // Handle Hebrew Date
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
        
        // Handle Standard Date (YYYY-MM-DD)
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return "";
        
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    // Calculate DOB from age (using current year)
    const calculateDobFromAge = (age: number | "", currentDob: string): string => {
        if (age === "" || typeof age !== "number") return currentDob || "";
        if (isNaN(age) || age < 18 || age > 60) return currentDob || "";
        
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - age;
        
        // Preserve the date mode and format
        if (dateMode === "Year") {
            return birthYear.toString();
        } else if (dateMode === "Hebrew") {
            const hebrewYear = birthYear + 3760;
            const hebrewYearLetters = convertHebrewYearToLetters(hebrewYear);
            // Try to preserve Hebrew day/month from current DOB if available
            if (currentDob && currentDob.includes("Hebrew:")) {
                const parts = currentDob.replace("Hebrew: ", "").split(" ");
                if (parts.length >= 2) {
                    // Preserve the Hebrew day and month letters
                    return `Hebrew: ${parts[0]} ${parts[1]} ${hebrewYearLetters}`;
                }
            }
            // Default to first day of Tishrei with Hebrew letters
            return `Hebrew: א תשרי ${hebrewYearLetters}`;
        } else {
            // Gregorian mode - try to preserve month/day from current DOB
            if (currentDob && !currentDob.includes("Hebrew:") && !/^\d{4}$/.test(currentDob)) {
                const date = new Date(currentDob);
                if (!isNaN(date.getTime())) {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    return `${birthYear}-${month}-${day}`;
                }
            }
            // Fallback: Use January 1st
            return `${birthYear}-01-01`;
        }
    };

    // Sync DOB -> Age
    useEffect(() => {
        if (isUpdatingFromAgeRef.current) return; // Don't update if age is being changed
        
        const calculatedAge = calculateAgeFromDob(currentDob || "");
        if (calculatedAge !== age) {
            isUpdatingFromDobRef.current = true;
            setAge(calculatedAge);
            // Reset flag after state update
            setTimeout(() => {
                isUpdatingFromDobRef.current = false;
            }, 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDob, dateMode]);

    // Initialize age from client DOB
    useEffect(() => {
        if (client?.dob) {
            const calculatedAge = calculateAgeFromDob(client.dob);
            setAge(calculatedAge);
        }
    }, [client]);





    // Reset submit ready state when stepping back or forward, but trigger it for the last step
    useEffect(() => {
        if (showSummary) {
            setIsSubmitReady(true); // Summary page is ready to submit
        } else if (isEditing) {
            // When editing, enable save button immediately (user can save from any step)
            setIsSubmitReady(true);
        } else if (currentStep === STEPS.length - 1) {
            // For external forms, don't enable submit yet - show summary button instead
            if (isExternalForm) {
                setIsSubmitReady(true); // Enable "Review Summary" button
            } else {
                // For creating new client, enable submit button after a short delay
                setIsSubmitReady(false);
                const timer = setTimeout(() => {
                    setIsSubmitReady(true);
                }, 500); // 500ms delay to prevent double-tap submission
                return () => clearTimeout(timer);
            }
        } else {
            setIsSubmitReady(false);
        }
    }, [currentStep, showSummary, isExternalForm, isEditing, STEPS.length]);

    // Scroll to top when summary is shown
    useEffect(() => {
        if (showSummary && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [showSummary]);

    const onSubmit = async (values: z.output<typeof formSchema>) => {
        // Prevent duplicate submissions
        if (isSubmitting) {
            console.warn("Submission already in progress, ignoring duplicate submit");
            return;
        }

        setIsSubmitting(true);
        try {
            // Always include the form language
            const valuesWithLang = { ...values, formLanguage: lang };
            
            // If custom pending submission handler is provided, use it
            if (onSubmitToPending) {
                await onSubmitToPending(valuesWithLang);
                return;
            }
            
            if (isEditing && client) {
                await updateClient(client.id, valuesWithLang);
                router.push("/clients");
            } else {
                // If form was filled from WhatsApp and submitToPending is checked, submit to pending
                if (filledFromWhatsApp && submitToPending) {
                    await createPendingClient({
                        ...valuesWithLang,
                        submittedAt: new Date().toISOString(),
                        source: "whatsapp",
                        sourceDescription: "Extracted from WhatsApp images",
                    });
                    router.push("/inbox");
                    return;
                }
                
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
        } finally {
            setIsSubmitting(false);
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

    const handleProfileImageDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingProfile(false);
        
        if (profileUpload.isUploading) return;
        
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith("image/")) {
            console.log("No valid image file in drop");
            return;
        }

        console.log("Dropped file:", file.name, file.type, file.size);
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
    };

    const handleGalleryImageDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingGallery(false);
        
        if (galleryUpload.isUploading) return;
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
        if (files.length === 0) {
            console.log("No valid image files in drop");
            return;
        }

        console.log("Dropped files:", files.map(f => ({ name: f.name, type: f.type, size: f.size })));
        setUploadError(null);

        // Upload one by one
        const uploadedUrls: string[] = [];
        for (const file of files) {
            setGalleryUploadFile(file);
            try {
                const result = await galleryUpload.uploadWithProgress(file);
                if (result.url) {
                    uploadedUrls.push(result.url);
                    setUploadError(null);
                } else {
                    const errorMsg = result.error || "Failed to upload image.";
                    setUploadError(errorMsg);
                    console.error("Upload error:", errorMsg);
                    break;
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
        setFilledFromWhatsApp(true); // Mark that form was filled from WhatsApp images
        setSubmitToPending(true); // Default to submitting to pending when filled from WhatsApp
        
        const confidences: Record<string, number> = {};
        
        // Helper function to extract value, confidence, and sourceQuote from nested structure
        const extractValueAndConfidence = (fieldData: any): { value: any; confidence?: number; sourceQuote?: string | null } => {
            // If it's already a simple value (string, number, boolean, array), return it
            if (fieldData === null || fieldData === undefined) {
                return { value: null };
            }
            
            // Check if it's the nested structure { value, confidence, sourceQuote }
            if (typeof fieldData === "object" && !Array.isArray(fieldData) && "value" in fieldData) {
                return {
                    value: fieldData.value,
                    confidence: typeof fieldData.confidence === "number" ? fieldData.confidence : undefined,
                    sourceQuote: fieldData.sourceQuote !== undefined ? fieldData.sourceQuote : null
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
            
            // Handle arrays - check if it's an array with nested structure
            if (Array.isArray(fieldData)) {
                // Check if array items have nested structure { value, confidence, sourceQuote }
                if (fieldData.length > 0 && typeof fieldData[0] === "object" && !Array.isArray(fieldData[0]) && "value" in fieldData[0]) {
                    // Extract values and collect sourceQuotes (use first non-null sourceQuote)
                    const values: any[] = [];
                    let sourceQuote: string | null = null;
                    for (const item of fieldData) {
                        if (item && typeof item === "object" && "value" in item) {
                            values.push(item.value);
                            // Use first non-null sourceQuote found
                            if (!sourceQuote && item.sourceQuote) {
                                sourceQuote = item.sourceQuote;
                            }
                        } else {
                            values.push(item);
                        }
                    }
                    return { value: values, sourceQuote: sourceQuote };
                }
                // Regular array - return as-is
                return { value: fieldData };
            }
            
            // Return as-is for primitives
            return { value: fieldData };
        };
        
        // Helper function to extract value from nested structure (for backward compatibility)
        const extractValue = (fieldData: any): any => {
            return extractValueAndConfidence(fieldData).value;
        };

        let fieldsSet = 0;
        let fieldsSkipped = 0;
        const errors: string[] = [];
        const newSourceQuotes: Record<string, string | null> = {};

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
                // Extract the actual value, confidence, and sourceQuote (handles nested structure)
                const { value, confidence, sourceQuote } = extractValueAndConfidence(fieldData);
                
                // Store confidence for color coding
                if (confidence !== undefined) {
                    confidences[key] = confidence;
                }
                
                // Collect sourceQuote for batch update
                if (sourceQuote !== undefined) {
                    newSourceQuotes[key] = sourceQuote;
                }
                
                // Special handling for age: convert to DOB
                if (key === "age") {
                    if (value !== null && value !== undefined && value !== "") {
                        const ageNum = typeof value === "number" ? value : parseInt(String(value));
                        if (!isNaN(ageNum) && ageNum >= 18 && ageNum <= 60) {
                            const currentDob = watch("dob") || "";
                            const newDob = calculateDobFromAge(ageNum, currentDob);
                            if (newDob) {
                                setValue("dob", newDob);
                                confidences["dob"] = confidence !== undefined ? confidence : 0.8;
                                if (sourceQuote) {
                                    newSourceQuotes["dob"] = sourceQuote;
                                }
                                trigger("dob");
                                fieldsSet++;
                            }
                        }
                    }
                    return; // Don't try to set "age" as a field since it's not in the schema
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
        
        // Batch update all sourceQuotes at once to avoid multiple re-renders
        if (Object.keys(newSourceQuotes).length > 0) {
            setSourceQuotes(prev => ({ ...prev, ...newSourceQuotes }));
        }
        
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
                "fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-950 flex flex-col md:relative md:inset-auto md:top-auto md:w-[80%] md:mx-auto md:flex-1 md:h-full md:overflow-hidden md:bg-transparent md:flex",
                // External forms have no navbar, so start from top-0
                isExternalForm ? "top-0" : "top-[4rem]",
                rtl && "rtl"
            )} dir={rtl ? "rtl" : "ltr"}>
                <form
                    onSubmit={handleSubmit((data) => {
                        // Additional guard: prevent submission if already submitting
                        if (isSubmitting) {
                            return;
                        }
                        onSubmit(data);
                    })}
                    onKeyDown={(e) => {
                        // Prevent implicit submission on Enter, allow inside textareas
                        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                            e.preventDefault();
                        }
                    }}
                    className="flex flex-col h-full overflow-hidden relative"
                >
                    {/* Wizard Header - Sticky on Mobile */}
                    <div className="shrink-0 bg-white dark:bg-gray-950 p-4 border-b z-30">
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold">
                                    {showSummary 
                                        ? (lang === "he" ? "סיכום המידע" : "Summary")
                                        : (isExternalForm && currentStep === 6 
                                            ? t(lang, "labels.references")
                                            : STEPS[currentStep].title
                                          )
                                    }
                                </h2>
                                {!isEditing && !isExternalForm && (
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
                            </div>
                            <span className="text-sm text-gray-500">
                                {showSummary 
                                    ? (lang === "he" ? "סקירה סופית" : "Final Review")
                                    : `${t(lang, "messages.step")} ${currentStep + 1} ${t(lang, "messages.of")} ${STEPS.length}`
                                }
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-800">
                            <div
                                className={cn("bg-red-600 h-2 rounded-full transition-all duration-300", rtl && "float-right")}
                                style={{ width: showSummary ? "100%" : `${((currentStep + 1) / STEPS.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Steps Content - Scrollable on Mobile and Desktop with EXTRA padding for validation errors */}
                    <div 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-gray-950 p-6 space-y-6 custom-scrollbar"
                        style={{
                            paddingBottom: isExternalForm 
                                ? 'calc(10rem + env(safe-area-inset-bottom))'  // Extra padding for better scrolling
                                : 'calc(9rem + env(safe-area-inset-bottom))'   // Extra padding for bottom nav + button bar
                        }}
                    >
                        {/* SUMMARY VIEW - For external forms */}
                        {showSummary && isExternalForm && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shrink-0">
                                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                        {lang === "he" ? "סיכום המידע" : "Review Your Information"}
                                    </h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        {lang === "he" 
                                            ? "אנא בדוק את כל הפרטים לפני השליחה. לאחר האישור, הטופס יישלח לבדיקה."
                                            : "Please review all your information before submitting. After confirmation, the form will be sent for review."}
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.basicInfo")}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">{t(lang, "labels.fullName")}:</span> {watch("fullName") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.email")}:</span> {watch("email") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.phone")}:</span> {watch("phone") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.dob")}:</span> {watch("dob") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.gender")}:</span> {watch("gender") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.location")}:</span> {watch("location") || "—"}</div>
                                        </div>
                                    </div>

                                    {/* Appearance */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.appearance")}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">{t(lang, "labels.height")}:</span> {watch("height") ? `${watch("height")} cm` : "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.eyeColor")}:</span> {watch("eyeColor") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.hairColor")}:</span> {watch("hairColor") || "—"}</div>
                                            {watch("photoUrl") && (
                                                <div className="mt-2">
                                                    <img src={watch("photoUrl")} alt="Profile" className="w-24 h-24 rounded-full object-cover border" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Background */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.background")}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">{t(lang, "labels.ethnicity")}:</span> {watch("ethnicity") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.maritalStatus")}:</span> {watch("maritalStatus") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.languages")}:</span> {(() => { const langs = watch("languages"); return Array.isArray(langs) ? langs.join(", ") || "—" : langs || "—"; })()}</div>
                                            <div><span className="font-medium">{t(lang, "labels.education")}:</span> {watch("education") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.occupation")}:</span> {watch("occupation") || "—"}</div>
                                        </div>
                                    </div>

                                    {/* Religious Details */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.religiousDetails")}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">{t(lang, "labels.religiousAffiliation")}:</span> {Array.isArray(watch("religiousAffiliation")) ? watch("religiousAffiliation").join(", ") || "—" : watch("religiousAffiliation") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.learningStatus")}:</span> {watch("learningStatus") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.headCovering")}:</span> {watch("headCovering") || "—"}</div>
                                        </div>
                                    </div>

                                    {/* Personal */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.personal")}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">{t(lang, "labels.hobbies")}:</span> {watch("hobbies") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.personality")}:</span> {watch("personality") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.smoking")}:</span> {watch("smoking") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.medicalHistory")}:</span> {watch("medicalHistory") ? (lang === "he" ? "כן" : "Yes") : (lang === "he" ? "לא" : "No")}</div>
                                        </div>
                                    </div>

                                    {/* Preferences */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.preferences")}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">{t(lang, "labels.ageGapPreference")}:</span> {Array.isArray(watch("ageGapPreference")) ? watch("ageGapPreference").join(", ") || "—" : watch("ageGapPreference") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.willingToRelocate")}:</span> {watch("willingToRelocate") || "—"}</div>
                                            <div><span className="font-medium">{t(lang, "labels.preferredEthnicities")}:</span> {Array.isArray(watch("preferredEthnicities")) ? watch("preferredEthnicities").join(", ") || "—" : watch("preferredEthnicities") || "—"}</div>
                                            {watch("preferencesFreeText") && (
                                                <div><span className="font-medium">{t(lang, "labels.preferencesFreeText")}:</span> {watch("preferencesFreeText") || "—"}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* References - For external forms */}
                                    {watch("references") && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "labels.references")}</h4>
                                            <div className="text-sm whitespace-pre-wrap">{watch("references") || "—"}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 0: BASIC INFO */}
                        {!showSummary && currentStep === 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.fullName")}</label>
                                        <FieldWithTooltip sourceQuote={sourceQuotes.fullName} fieldName="fullName">
                                            <input {...register("fullName")} style={getFieldStyle("fullName")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.fullName")} dir={rtl ? "rtl" : "ltr"} />
                                        </FieldWithTooltip>
                                        {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName?.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.email")}</label>
                                        <FieldWithTooltip sourceQuote={sourceQuotes.email} fieldName="email">
                                            <input {...register("email")} style={getFieldStyle("email")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.email")} dir="ltr" />
                                        </FieldWithTooltip>
                                        {errors.email && <p className="text-red-500 text-xs">{errors.email?.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.phone")}</label>
                                        <FieldWithTooltip sourceQuote={sourceQuotes.phone} fieldName="phone">
                                            <input {...register("phone")} style={getFieldStyle("phone")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.phone")} dir="ltr" />
                                        </FieldWithTooltip>
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
                                                        const currentYear = new Date().getFullYear();
                                                        const hebrewYear = currentYear + 3760;
                                                        const hebrewYearLetters = convertHebrewYearToLetters(hebrewYear);
                                                        setValue("dob", converted || `Hebrew: א תשרי ${hebrewYearLetters}`);
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
                                        <label className="text-sm font-medium">{lang === "he" ? "גיל" : "Age"}</label>
                                        <input
                                            type="number"
                                            min="18"
                                            max="60"
                                            value={age}
                                            onChange={(e) => {
                                                const inputValue = e.target.value;
                                                // Allow typing any value, including empty and values outside range
                                                if (inputValue === "") {
                                                    setAge("");
                                                    return;
                                                }
                                                
                                                const parsedAge = parseInt(inputValue);
                                                if (!isNaN(parsedAge)) {
                                                    setAge(parsedAge);
                                                    
                                                    // Update DOB for valid ages (within range)
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
                                            }}
                                            onBlur={(e) => {
                                                // Clamp values when user finishes typing
                                                const inputValue = e.target.value;
                                                if (inputValue === "") {
                                                    return;
                                                }
                                                
                                                const parsedAge = parseInt(inputValue);
                                                if (isNaN(parsedAge)) {
                                                    return;
                                                }
                                                
                                                const MIN_AGE = 18;
                                                const MAX_AGE = 60;
                                                let clampedAge = parsedAge;
                                                
                                                if (parsedAge < MIN_AGE) {
                                                    clampedAge = MIN_AGE;
                                                } else if (parsedAge > MAX_AGE) {
                                                    clampedAge = MAX_AGE;
                                                }
                                                
                                                // Only update if value was clamped
                                                if (clampedAge !== parsedAge) {
                                                    setAge(clampedAge);
                                                }
                                                
                                                // Update DOB with the (possibly clamped) age
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
                                            }}
                                            onKeyDown={(e) => {
                                                // Update DOB when Enter is pressed
                                                if (e.key === "Enter") {
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            className="w-full p-2 border rounded-md dark:bg-gray-900"
                                            placeholder={lang === "he" ? "גיל" : "Age"}
                                            dir={rtl ? "rtl" : "ltr"}
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400" dir={rtl ? "rtl" : "ltr"}>
                                            {lang === "he" ? "גיל מסונכרן אוטומטית עם תאריך הלידה (מינימום 18)" : "Age automatically syncs with date of birth (minimum 18)"}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.gender")}</label>
                                        <FieldWithTooltip sourceQuote={sourceQuotes.gender} fieldName="gender">
                                            <select {...register("gender")} style={getFieldStyle("gender")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                                {opts("gender").map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </FieldWithTooltip>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.location")}</label>
                                        <FieldWithTooltip sourceQuote={sourceQuotes.location} fieldName="location">
                                            <input {...register("location")} style={getFieldStyle("location")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.location")} dir={rtl ? "rtl" : "ltr"} />
                                        </FieldWithTooltip>
                                        {errors.location && <p className="text-red-500 text-xs">{errors.location?.message}</p>}
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* STEP 1: APPEARANCE */}
                        {!showSummary && currentStep === 1 && (
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
                                            <label 
                                                className={cn(
                                                    "relative inline-flex items-center justify-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 w-full mb-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                                                    isDraggingProfile ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300"
                                                )}
                                                style={{ pointerEvents: profileUpload.isUploading ? 'none' : 'auto' }}
                                                onDrop={handleProfileImageDrop}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!profileUpload.isUploading) {
                                                        setIsDraggingProfile(true);
                                                    }
                                                }}
                                                onDragEnter={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!profileUpload.isUploading) {
                                                        setIsDraggingProfile(true);
                                                    }
                                                }}
                                                onDragLeave={(e) => {
                                                    // Only set false if we're actually leaving the label element
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const x = e.clientX;
                                                    const y = e.clientY;
                                                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                                        setIsDraggingProfile(false);
                                                    }
                                                }}
                                            >
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
                                                        : isDraggingProfile
                                                        ? t(lang, "messages.dropImage") || "Drop image here"
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
                                        <FieldWithTooltip sourceQuote={sourceQuotes.height} fieldName="height">
                                            <input type="number" {...register("height", { valueAsNumber: true })} style={getFieldStyle("height")} className="w-full p-2 border rounded-md dark:bg-gray-900" dir="ltr" />
                                        </FieldWithTooltip>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.eyeColor")}</label>
                                        <FieldWithTooltip sourceQuote={sourceQuotes.eyeColor} fieldName="eyeColor">
                                            <select {...register("eyeColor")} style={getFieldStyle("eyeColor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                                {opts("eyeColor").map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </FieldWithTooltip>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t(lang, "labels.hairColor")}</label>
                                        <FieldWithTooltip sourceQuote={sourceQuotes.hairColor} fieldName="hairColor">
                                            <select {...register("hairColor")} style={getFieldStyle("hairColor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                                {opts("hairColor").map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </FieldWithTooltip>
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
                                            <label 
                                                className={cn(
                                                    "relative flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed cursor-pointer bg-gray-50 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                                                    isDraggingGallery 
                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                                                        : "border-gray-300 hover:border-gray-400"
                                                )}
                                                style={{ pointerEvents: galleryUpload.isUploading ? 'none' : 'auto' }}
                                                onDrop={handleGalleryImageDrop}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!galleryUpload.isUploading) {
                                                        setIsDraggingGallery(true);
                                                    }
                                                }}
                                                onDragEnter={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!galleryUpload.isUploading) {
                                                        setIsDraggingGallery(true);
                                                    }
                                                }}
                                                onDragLeave={(e) => {
                                                    // Only set false if we're actually leaving the label element
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const x = e.clientX;
                                                    const y = e.clientY;
                                                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                                        setIsDraggingGallery(false);
                                                    }
                                                }}
                                            >
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
                                                        <span className="text-xs text-gray-500 mt-1">
                                                            {isDraggingGallery 
                                                                ? t(lang, "messages.dropImage") || "Drop images here"
                                                                : t(lang, "buttons.add")}
                                                        </span>
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
                        {!showSummary && currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.ethnicity")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.ethnicity} fieldName="ethnicity">
                                        <select {...register("ethnicity")} style={getFieldStyle("ethnicity")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("ethnicity").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.tribalStatus")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.tribalStatus} fieldName="tribalStatus">
                                        <select {...register("tribalStatus")} style={getFieldStyle("tribalStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            <option value="">{t(lang, "messages.selectOption")}</option>
                                            {opts("tribalStatus").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.maritalStatus")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.maritalStatus} fieldName="maritalStatus">
                                        <select {...register("maritalStatus")} style={getFieldStyle("maritalStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("maritalStatus").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.occupation")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.occupation} fieldName="occupation">
                                        <input {...register("occupation")} style={getFieldStyle("occupation")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.occupation")} dir={rtl ? "rtl" : "ltr"} />
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.languages")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.languages} fieldName="languages">
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
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.familyBackground")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.familyBackground} fieldName="familyBackground">
                                        <textarea {...register("familyBackground")} style={getFieldStyle("familyBackground")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" placeholder={t(lang, "placeholders.familyBackground")} dir={rtl ? "rtl" : "ltr"} />
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.education")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.education} fieldName="education">
                                        <input {...register("education")} style={getFieldStyle("education")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder={t(lang, "placeholders.education")} dir={rtl ? "rtl" : "ltr"} />
                                    </FieldWithTooltip>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: RELIGIOUS DETAILS */}
                        {!showSummary && currentStep === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.religiousAffiliation")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.religiousAffiliation} fieldName="religiousAffiliation">
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
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.learningStatus")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.learningStatus} fieldName="learningStatus">
                                        <select {...register("learningStatus")} style={getFieldStyle("learningStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("learningStatus").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.headCovering")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.headCovering} fieldName="headCovering">
                                        <select {...register("headCovering")} style={getFieldStyle("headCovering")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("headCovering").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </FieldWithTooltip>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: PERSONAL */}
                        {!showSummary && currentStep === 4 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.personality")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.personality} fieldName="personality">
                                        <textarea {...register("personality")} style={getFieldStyle("personality")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" placeholder={t(lang, "placeholders.personality")} dir={rtl ? "rtl" : "ltr"} />
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.hobbies")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.hobbies} fieldName="hobbies">
                                        <textarea 
                                            {...register("hobbies")} 
                                            style={getFieldStyle("hobbies")}
                                            className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" 
                                            placeholder={t(lang, "placeholders.hobbies")} 
                                            dir={rtl ? "rtl" : "ltr"}
                                        />
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.smoking")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.smoking} fieldName="smoking">
                                        <select {...register("smoking")} style={getFieldStyle("smoking")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("smoking").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </FieldWithTooltip>
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
                                            <FieldWithTooltip sourceQuote={sourceQuotes.medicalHistoryDetails} fieldName="medicalHistoryDetails">
                                                <textarea {...register("medicalHistoryDetails")} style={getFieldStyle("medicalHistoryDetails")} className="w-full p-2 border rounded-md dark:bg-gray-900" dir={rtl ? "rtl" : "ltr"} />
                                            </FieldWithTooltip>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 5: PREFERENCES */}
                        {!showSummary && currentStep === 5 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.ageGapPreference")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.ageGapPreference} fieldName="ageGapPreference">
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
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.willingToRelocate")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.willingToRelocate} fieldName="willingToRelocate">
                                        <select {...register("willingToRelocate")} style={getFieldStyle("willingToRelocate")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                            {opts("willingToRelocate").map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferredEthnicities")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.preferredEthnicities} fieldName="preferredEthnicities">
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
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferredHashkafos")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.preferredHashkafos} fieldName="preferredHashkafos">
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
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferredLearningStatus")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.preferredLearningStatus} fieldName="preferredLearningStatus">
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
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferredHeadCovering")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.preferredHeadCovering} fieldName="preferredHeadCovering">
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
                                    </FieldWithTooltip>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.preferencesFreeText")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.preferencesFreeText} fieldName="preferencesFreeText">
                                        <textarea 
                                            {...register("preferencesFreeText")} 
                                            style={getFieldStyle("preferencesFreeText")} 
                                            className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" 
                                            placeholder={t(lang, "placeholders.preferencesFreeText")}
                                            dir={rtl ? "rtl" : "ltr"} 
                                        />
                                    </FieldWithTooltip>
                                </div>
                            </div>
                        )}

                        {/* STEP 6: ADMIN - Show references for external forms, all fields for admin */}
                        {!showSummary && currentStep === 6 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t(lang, "labels.references")}</label>
                                    <FieldWithTooltip sourceQuote={sourceQuotes.references} fieldName="references">
                                        <textarea {...register("references")} style={getFieldStyle("references")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" dir={rtl ? "rtl" : "ltr"} />
                                    </FieldWithTooltip>
                                </div>
                                {/* Notes and resumeRawText only for admin forms */}
                                {!isExternalForm && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t(lang, "labels.notes")}</label>
                                            <FieldWithTooltip sourceQuote={sourceQuotes.notes} fieldName="notes">
                                                <textarea {...register("notes")} style={getFieldStyle("notes")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" dir={rtl ? "rtl" : "ltr"} />
                                            </FieldWithTooltip>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t(lang, "labels.resumeRawText")}</label>
                                            <FieldWithTooltip sourceQuote={sourceQuotes.resumeRawText} fieldName="resumeRawText">
                                                <textarea 
                                                    {...register("resumeRawText")} 
                                                    style={getFieldStyle("resumeRawText")}
                                                    className="w-full p-2 border rounded-md h-32 dark:bg-gray-900 font-mono text-xs" 
                                                    placeholder={t(lang, "placeholders.resumeRawText")}
                                                    dir="auto"
                                                />
                                            </FieldWithTooltip>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Footer Navigation - Fixed at bottom on both mobile and desktop */}
                    <div className={cn(
                        "fixed left-0 right-0 z-50 md:bottom-4 shrink-0 pt-4 px-4 pb-4 flex items-center justify-center gap-4",
                        // External forms have no bottom nav, so position closer to bottom
                        isExternalForm 
                            ? "bottom-[calc(env(safe-area-inset-bottom))]"
                            : "bottom-[calc(4rem+env(safe-area-inset-bottom))]"
                    )}>
                        {/* Gradient fade - only show when content overflows */}
                        {hasOverflow && (
                            <div className="pointer-events-none absolute -top-16 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-gray-950 dark:via-gray-950/80" />
                        )}
                        {/* Background for buttons - extends to bottom of viewport */}
                        <div 
                            className="absolute top-0 left-0 right-0 bg-gradient-to-t from-white via-white to-white/95 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/95 -z-10"
                            style={{
                                bottom: isExternalForm 
                                    ? 'calc(-1rem - env(safe-area-inset-bottom))'
                                    : 'calc(-4rem - env(safe-area-inset-bottom))',
                            }}
                        />
                        <div 
                            className="absolute top-0 left-0 right-0 bg-gradient-to-t from-white via-white to-white/95 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/95 -z-10 hidden md:block"
                            style={{
                                bottom: '-1rem',
                            }}
                        />
                        <div className="flex gap-2 relative z-10">
                            {isEditing && onCancel && (
                                <>
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                    >
                                        {t(lang, "buttons.cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!isSubmitReady || isSubmitting}
                                        className={`flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isSubmitReady && !isSubmitting ? 'bg-green-600 hover:bg-green-700' : 'bg-green-400 cursor-not-allowed'}`}
                                    >
                                        {isSubmitting ? t(lang, "buttons.saving") : t(lang, "buttons.save")}
                                        {!isSubmitting && <Check className="h-4 w-4" />}
                                    </button>
                                </>
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
                            <>
                                {isExternalForm && !showSummary ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowSummary(true)}
                                        disabled={!isSubmitReady}
                                        className={`flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isSubmitReady ? 'bg-green-600 hover:bg-green-700' : 'bg-green-400 cursor-not-allowed'}`}
                                    >
                                        {lang === "he" ? "סקירת סיכום" : "Review Summary"}
                                        {rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                ) : (
                                    <>
                                        {filledFromWhatsApp && !isEditing && !isExternalForm && (
                                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={submitToPending}
                                                    onChange={(e) => setSubmitToPending(e.target.checked)}
                                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                                />
                                                <span>{lang === "he" ? "שלח לבדיקה" : "Submit for review"}</span>
                                            </label>
                                        )}
                                        {showSummary && (
                                            <button
                                                type="button"
                                                onClick={() => setShowSummary(false)}
                                                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                            >
                                                {rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                                                {lang === "he" ? "חזור לעריכה" : "Back to Edit"}
                                            </button>
                                        )}
                                        {/* Show approve/reject buttons if handlers provided (inbox review), otherwise show submit button */}
                                        {onApprove && onReject ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={onReject}
                                                    disabled={isRejecting || isApproving}
                                                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {isRejecting 
                                                        ? (lang === "he" ? "דוחה..." : "Rejecting...")
                                                        : (lang === "he" ? "דחה" : "Reject")
                                                    }
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={onApprove}
                                                    disabled={isApproving || isRejecting}
                                                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {isApproving 
                                                        ? (lang === "he" ? "מאשר..." : "Approving...")
                                                        : (lang === "he" ? "אשר והוסף למסד הנתונים" : "Approve & Add to Database")
                                                    }
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="submit"
                                                disabled={!isSubmitReady || isSubmitting}
                                                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isSubmitReady && !isSubmitting ? 'bg-green-600 hover:bg-green-700' : 'bg-green-400 cursor-not-allowed'}`}
                                            >
                                                {isSubmitting 
                                                    ? t(lang, "buttons.saving")
                                                    : (showSummary 
                                                        ? (lang === "he" ? "אישור ושליחה" : "Confirm & Submit")
                                                        : (isEditing ? t(lang, "buttons.update") : t(lang, "buttons.submit"))
                                                    )
                                                }
                                                {!isSubmitting && <Check className="h-4 w-4" />}
                                            </button>
                                        )}
                                    </>
                                )}
                            </>
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

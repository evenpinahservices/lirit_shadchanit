import { useState, useEffect } from "react";
import { Client } from "@/lib/mockData";
import Image from "next/image";
import { MapPin, Briefcase, Ruler, Heart, BookOpen, Globe, Users, FileText, User as UserIcon, UserCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, getTextDirection, detectClientLanguage, parseHebrewYearToNumber } from "@/lib/utils";
import { ImageGalleryModal } from "./ImageGalleryModal";
import { FormLanguage, t, valueToLabel, getOptions } from "@/lib/translations";

interface ClientProfileViewProps {
    client: Client;
    onEdit: () => void;
    onDelete: () => void;
}

type OptionKey = keyof typeof import("@/lib/translations").translations.en.options;

const Field = ({ label, value, lang, optionKey, isRtl }: {
    label: string;
    value: string | string[] | boolean | number | undefined;
    lang?: FormLanguage;
    optionKey?: OptionKey;
    isRtl?: boolean;
}) => {
    let displayValue: React.ReactNode = value ?? "—";
    let textDirection: "rtl" | "ltr" = isRtl ? "rtl" : "ltr";

    if (value === undefined || value === null || value === "") {
        displayValue = "—";
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            displayValue = "—";
        } else {
            if (optionKey && lang) {
                displayValue = value.map(v => valueToLabel(lang, optionKey, v)).join(", ");
            } else {
                displayValue = value.join(", ");
            }
            textDirection = isRtl ? "rtl" : (value.some(v => typeof v === "string" && getTextDirection(v) === "rtl") ? "rtl" : "ltr");
        }
    } else if (typeof value === "string") {
        if (optionKey && lang) {
            displayValue = valueToLabel(lang, optionKey, value);
        } else {
            displayValue = value;
        }
        textDirection = isRtl ? "rtl" : getTextDirection(value);
    } else if (typeof value === "boolean") {
        displayValue = value ? (lang === "he" ? "כן" : "Yes") : (lang === "he" ? "לא" : "No");
        textDirection = isRtl ? "rtl" : "ltr";
    } else if (typeof value === "number") {
        displayValue = value.toString();
        textDirection = isRtl ? "rtl" : "ltr";
    }

    return (
        <div className={cn("flex text-sm", isRtl ? "flex-row-reverse gap-2" : "gap-2")} dir={isRtl ? "rtl" : "ltr"}>
            {isRtl ? (
                <>
                    {/* In RTL: value first, then label */}
                    <span
                        className={cn("text-gray-900 dark:text-gray-100 flex-1", "text-right")}
                        dir={textDirection}
                    >
                        {displayValue}
                    </span>
                    <span className={cn("font-medium text-gray-700 dark:text-gray-300", "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                        {label}:
                    </span>
                </>
            ) : (
                <>
                    {/* In LTR: label first, then value */}
                    <span className={cn("font-medium text-gray-700 dark:text-gray-300", "text-left")} dir={isRtl ? "rtl" : "ltr"}>
                        {label}:
                    </span>
                    <span
                        className={cn("text-gray-900 dark:text-gray-100 flex-1", "text-left")}
                        dir={textDirection}
                    >
                        {displayValue}
                    </span>
                </>
            )}
        </div>
    );
};

export function ClientProfileView({ client, onEdit, onDelete }: ClientProfileViewProps) {
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Determine language from client formLanguage or detect from content
    const lang: FormLanguage = detectClientLanguage(client);
    const isRtl = lang === "he";
    
    // Initialize section index - for RTL, start at the last section (rightmost)
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

    // Check if mobile view
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Combine profile photo and gallery images
    const allImages = [
        ...(client.photoUrl ? [client.photoUrl] : []),
        ...(client.galleryImages || [])
    ].filter(Boolean);

    const calculateAge = (dob: string) => {
        if (!dob) return "N/A";

        // Handle Year Only (YYYY)
        if (/^\d{4}$/.test(dob)) {
            const year = parseInt(dob);
            if (isNaN(year)) return "N/A";
            // For year-only, assume birthday has passed (most conservative estimate)
            return new Date().getFullYear() - year;
        }

        // Handle Hebrew Date
        if (dob.includes("Hebrew:")) {
            // Extract year from "Hebrew: Day Month Year"
            const parts = dob.trim().split(" ");
            const hebrewYearStr = parts[parts.length - 1];
            let numericYear = parseInt(hebrewYearStr);
            
            // If parsing fails, try to parse Hebrew letters
            if (isNaN(numericYear) || numericYear < 1000) {
                numericYear = parseHebrewYearToNumber(hebrewYearStr);
            }
            
            // Approximate Gregorian year: Hebrew Year - 3760
            if (!isNaN(numericYear) && numericYear > 1000) {
                // For Hebrew dates without full conversion, assume birthday has passed
                return new Date().getFullYear() - (numericYear - 3760);
            }
            return "N/A";
        }

        // Handle Standard Date (YYYY-MM-DD) - calculate exact age
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return "N/A";
        
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const sections = [
        {
            title: t(lang, "steps.basicInfo"),
            icon: UserCircle,
            color: "text-red-600",
            content: (
                <div className={cn("space-y-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                    <Field label={t(lang, "labels.fullName")} value={client.fullName} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.email")} value={client.email} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.phone")} value={client.phone} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.dob")} value={client.dob} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.gender")} value={client.gender} lang={lang} optionKey="gender" isRtl={isRtl} />
                    <Field label={t(lang, "labels.location")} value={client.location} lang={lang} isRtl={isRtl} />
                </div>
            )
        },
        {
            title: t(lang, "steps.appearance"),
            icon: Ruler,
            color: "text-red-600",
            content: (
                <div className={cn("space-y-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                    <Field label={t(lang, "labels.height")} value={client.height ? (lang === "he" ? `${client.height} ס"מ` : `${client.height} cm`) : undefined} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.eyeColor")} value={client.eyeColor} lang={lang} optionKey="eyeColor" isRtl={isRtl} />
                    <Field label={t(lang, "labels.hairColor")} value={client.hairColor} lang={lang} optionKey="hairColor" isRtl={isRtl} />
                    {client.photoUrl && (
                        <div className={cn("mt-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                            <img src={client.photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-sm inline-block" />
                        </div>
                    )}
                    {allImages.length > 0 && (
                        <div className={cn("mt-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                            <button
                                onClick={() => setIsGalleryOpen(true)}
                                className={cn("text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200 font-medium hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:border-red-800 dark:text-red-400", isRtl && "text-right")}
                                dir={isRtl ? "rtl" : "ltr"}
                            >
                                {lang === "he" ? `צפה בקורות חיים (${allImages.length})` : `View Resume (${allImages.length})`}
                            </button>
                        </div>
                    )}
                </div>
            )
        },
        {
            title: t(lang, "steps.background"),
            icon: Globe,
            color: "text-red-600",
            content: (
                <div className={cn("space-y-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                    <Field label={t(lang, "labels.ethnicity")} value={client.ethnicity} lang={lang} optionKey="ethnicity" isRtl={isRtl} />
                    <Field label={t(lang, "labels.tribalStatus")} value={client.tribalStatus} lang={lang} optionKey="tribalStatus" isRtl={isRtl} />
                    <Field label={t(lang, "labels.maritalStatus")} value={client.maritalStatus} lang={lang} optionKey="maritalStatus" isRtl={isRtl} />
                    <Field label={lang === "he" ? "ילדים" : "Children"} value={client.children} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.languages")} value={client.languages} lang={lang} optionKey="languages" isRtl={isRtl} />
                    <Field label={t(lang, "labels.familyBackground")} value={client.familyBackground} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.education")} value={client.education} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.occupationTitle")} value={client.occupationTitle} lang={lang} isRtl={isRtl} />
                    {client.occupationDescription && (
                        <Field label={t(lang, "labels.occupationDescription")} value={client.occupationDescription} lang={lang} isRtl={isRtl} />
                    )}
                </div>
            )
        },
        {
            title: t(lang, "steps.religiousDetails"),
            icon: BookOpen,
            color: "text-red-600",
            content: (
                <div className={cn("space-y-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                    <Field label={t(lang, "labels.religiousAffiliation")} value={client.religiousAffiliation} lang={lang} optionKey="religiousAffiliation" isRtl={isRtl} />
                    <Field label={t(lang, "labels.learningStatus")} value={client.learningStatus} lang={lang} optionKey="learningStatus" isRtl={isRtl} />
                    <Field label={t(lang, "labels.headCovering")} value={client.headCovering} lang={lang} optionKey="headCovering" isRtl={isRtl} />
                    <Field label={t(lang, "labels.religiousDetailsFreeText")} value={client.religiousDetailsFreeText} lang={lang} isRtl={isRtl} />
                </div>
            )
        },
        {
            title: t(lang, "steps.personal"),
            icon: Heart,
            color: "text-red-600",
            content: (
                <div className={cn("space-y-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                    <Field label={t(lang, "labels.hobbies")} value={client.hobbies} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.personality")} value={client.personality} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.smoking")} value={client.smoking} lang={lang} optionKey="smoking" isRtl={isRtl} />
                    <Field label={t(lang, "labels.medicalHistory")} value={client.medicalHistory} lang={lang} isRtl={isRtl} />
                    {client.medicalHistory && (
                        <Field label={t(lang, "labels.medicalHistoryDetails")} value={client.medicalHistoryDetails} lang={lang} isRtl={isRtl} />
                    )}
                </div>
            )
        },
        {
            title: t(lang, "steps.preferences"),
            icon: Users,
            color: "text-red-600",
            content: (
                <div className={cn("space-y-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                    <Field label={t(lang, "labels.ageGapPreference")} value={client.ageGapPreference} lang={lang} optionKey="ageGapPreference" isRtl={isRtl} />
                    <Field label={t(lang, "labels.willingToRelocate")} value={client.willingToRelocate} lang={lang} optionKey="willingToRelocate" isRtl={isRtl} />
                    <Field label={t(lang, "labels.preferredEthnicities")} value={client.preferredEthnicities} lang={lang} optionKey="ethnicity" isRtl={isRtl} />
                    <Field label={t(lang, "labels.preferredHashkafos")} value={client.preferredHashkafos} lang={lang} optionKey="religiousAffiliation" isRtl={isRtl} />
                    <Field label={t(lang, "labels.preferredLearningStatus")} value={client.preferredLearningStatus} lang={lang} optionKey="learningStatus" isRtl={isRtl} />
                    <Field label={t(lang, "labels.preferredHeadCovering")} value={client.preferredHeadCovering} lang={lang} optionKey="headCovering" isRtl={isRtl} />
                    <Field label={t(lang, "labels.preferencesFreeText")} value={client.preferencesFreeText} lang={lang} isRtl={isRtl} />
                </div>
            )
        },
        {
            title: t(lang, "steps.admin"),
            icon: FileText,
            color: "text-red-600",
            content: (
                <div className={cn("space-y-2", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                    <Field label={t(lang, "labels.references")} value={client.references} lang={lang} isRtl={isRtl} />
                    <Field label={t(lang, "labels.notes")} value={client.notes} lang={lang} isRtl={isRtl} />
                </div>
            )
        }
    ];

    // For RTL, reverse the sections array so Basic Info is rightmost and Admin is leftmost
    const displaySections = isRtl ? [...sections].reverse() : sections;

    const nextSection = () => {
        if (isRtl) {
            // In RTL, "next" means moving right to left (decreasing index)
            setCurrentSectionIndex((prev) => (prev - 1 + displaySections.length) % displaySections.length);
        } else {
            // In LTR, "next" means moving left to right (increasing index)
            setCurrentSectionIndex((prev) => (prev + 1) % displaySections.length);
        }
    };

    const prevSection = () => {
        if (isRtl) {
            // In RTL, "prev" means moving left to right (increasing index)
            setCurrentSectionIndex((prev) => (prev + 1) % displaySections.length);
        } else {
            // In LTR, "prev" means moving right to left (decreasing index)
            setCurrentSectionIndex((prev) => (prev - 1 + displaySections.length) % displaySections.length);
        }
    };

    // Set initial section index - for RTL, start at the last section (rightmost - Basic Info)
    useEffect(() => {
        if (isRtl && displaySections.length > 0) {
            setCurrentSectionIndex(displaySections.length - 1);
        }
    }, [isRtl, displaySections.length]);

    // Swipe gesture support for touch devices
    useEffect(() => {
        const contentDiv = document.querySelector('[data-profile-content]') as HTMLElement;
        if (!contentDiv) return;

        let touchStartX = 0;
        let touchEndX = 0;
        const minSwipeDistance = 50; // Minimum distance for a swipe

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].screenX;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;

            // Only trigger swipe if distance is significant
            if (Math.abs(swipeDistance) > minSwipeDistance) {
                if (swipeDistance > 0) {
                    // Swipe right - go to previous section
                    if (isRtl) {
                        setCurrentSectionIndex((prev) => (prev + 1) % displaySections.length);
                    } else {
                        setCurrentSectionIndex((prev) => (prev - 1 + displaySections.length) % displaySections.length);
                    }
                } else {
                    // Swipe left - go to next section
                    if (isRtl) {
                        setCurrentSectionIndex((prev) => (prev - 1 + displaySections.length) % displaySections.length);
                    } else {
                        setCurrentSectionIndex((prev) => (prev + 1) % displaySections.length);
                    }
                }
            }
        };

        contentDiv.addEventListener('touchstart', handleTouchStart, { passive: true });
        contentDiv.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            contentDiv.removeEventListener('touchstart', handleTouchStart);
            contentDiv.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isRtl, displaySections.length]);


    return (
        <div className={cn("w-full flex flex-col h-full min-h-0 overflow-hidden pb-4", isRtl ? "rtl" : "ltr")} dir={isRtl ? "rtl" : "ltr"}>
            {/* Header / Top Card (Fixed Info) - Smaller */}
            <div className="w-full bg-white dark:bg-gray-950 p-3 rounded-xl shrink-0" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex flex-col items-center text-center space-y-2">
                    <button
                        onClick={() => {
                            if (allImages.length > 0) {
                                setIsGalleryOpen(true);
                            }
                        }}
                        className="relative w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden border-2 border-gray-50 dark:border-gray-800 shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                        disabled={allImages.length === 0}
                    >
                        {client.photoUrl ? (
                            <Image
                                src={client.photoUrl}
                                alt={client.fullName}
                                fill
                                className="object-cover"
                                sizes="64px"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <UserIcon className="h-6 w-6" />
                            </div>
                        )}
                    </button>

                    <div dir={isRtl ? "rtl" : "ltr"}>
                        <h1 className={cn("text-lg font-bold text-gray-900 dark:text-white", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>{client.fullName}</h1>
                        <div className={cn("flex flex-wrap justify-center gap-1.5 mt-0.5 text-xs text-gray-600 dark:text-gray-400", isRtl && "flex-row-reverse")} dir={isRtl ? "rtl" : "ltr"}>
                            <span 
                                className={cn(
                                    "flex items-center gap-1",
                                    isRtl ? "flex-row-reverse" : (getTextDirection(client.location) === "rtl" && "flex-row-reverse")
                                )}
                                dir={isRtl ? "rtl" : getTextDirection(client.location)}
                            >
                                <MapPin className="h-2.5 w-2.5" /> {client.location || "—"}
                            </span>
                            <span className="hidden w-0.5 h-0.5 bg-gray-300 rounded-full sm:inline-block"></span>
                            <span className={cn("flex items-center gap-1", isRtl && "flex-row-reverse")} dir={isRtl ? "rtl" : "ltr"}>
                                <Briefcase className="h-2.5 w-2.5" /> {client.occupationTitle || "—"}
                            </span>
                            <span className="hidden w-0.5 h-0.5 bg-gray-300 rounded-full sm:inline-block"></span>
                            <span className={cn("font-medium bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full text-xs", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                                {lang === "he" ? `גיל ${calculateAge(client.dob)}` : `${calculateAge(client.dob)} y/o`}
                            </span>
                        </div>
                    </div>

                    <div className={cn("flex gap-2 w-full sm:w-auto pt-0.5", isRtl && "flex-row-reverse")} dir={isRtl ? "rtl" : "ltr"}>
                        {isRtl ? (
                            <>
                                <button
                                    onClick={onDelete}
                                    className="flex-1 sm:flex-none px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none"
                                >
                                    {lang === "he" ? "מחיקה" : "Delete"}
                                </button>
                                <button
                                    onClick={onEdit}
                                    className="flex-1 sm:flex-none px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                >
                                    {lang === "he" ? "עריכה" : "Edit"}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onEdit}
                                    className="flex-1 sm:flex-none px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                >
                                    {isRtl ? "עריכה" : "Edit"}
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="flex-1 sm:flex-none px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none"
                                >
                                    {isRtl ? "מחיקה" : "Delete"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content - Toggle Style (Old Implementation) */}
            <div className="w-full flex-1 mt-2 bg-white dark:bg-gray-950 rounded-xl flex flex-col min-h-0 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
                {/* Carousel Controls - Top Navigation */}
                <div className={cn("flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-900/50 shrink-0 shadow-sm", isRtl && "flex-row-reverse")} dir={isRtl ? "rtl" : "ltr"}>
                    {/* Left button - Previous in LTR, Next in RTL */}
                    <button
                        onClick={isRtl ? nextSection : prevSection}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        aria-label={isRtl ? "Next section" : "Previous section"}
                    >
                        {isRtl ? (
                            <ChevronLeft className="h-5 w-5 text-gray-500" />
                        ) : (
                            <ChevronLeft className="h-5 w-5 text-gray-500" />
                        )}
                    </button>

                    <div className="flex flex-col items-center" dir={isRtl ? "rtl" : "ltr"}>
                        <div className={cn("flex items-center gap-2", displaySections[currentSectionIndex].color, isRtl && "flex-row-reverse")} dir={isRtl ? "rtl" : "ltr"}>
                            {(() => {
                                const Icon = displaySections[currentSectionIndex].icon;
                                return <Icon className="h-4 w-4" />;
                            })()}
                            <span className={cn("font-semibold", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                                {displaySections[currentSectionIndex].title}
                            </span>
                        </div>
                        <div className={cn("flex gap-1 mt-1.5", isRtl && "flex-row-reverse")}>
                            {displaySections.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full transition-colors",
                                        idx === currentSectionIndex ? "bg-red-600" : "bg-gray-300 dark:bg-gray-700"
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right button - Next in LTR, Previous in RTL */}
                    <button
                        onClick={isRtl ? prevSection : nextSection}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        aria-label={isRtl ? "Previous section" : "Next section"}
                    >
                        {isRtl ? (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                        ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                    </button>
                </div>

                {/* Section Content - Scrollable */}
                <div
                    data-profile-content
                    className="flex-1 overflow-y-auto p-4 custom-scrollbar"
                    dir={isRtl ? "rtl" : "ltr"}
                    style={isRtl ? { textAlign: "right" } : { textAlign: "left" }}
                >
                    <div className={cn("w-full", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
                        {displaySections[currentSectionIndex].content}
                    </div>
                </div>
            </div>

            <ImageGalleryModal
                images={allImages}
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
            />
        </div>
    );
}

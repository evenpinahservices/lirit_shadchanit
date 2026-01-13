import { useState, useRef, useEffect } from "react";
import { Client } from "@/lib/mockData";
import Image from "next/image";
import { MapPin, Briefcase, Ruler, Heart, BookOpen, GraduationCap, Globe, Users, FileText, ChevronLeft, ChevronRight, User as UserIcon } from "lucide-react";
import { cn, getTextDirection, detectClientLanguage } from "@/lib/utils";
import { ImageGalleryModal } from "./ImageGalleryModal";
import { FormLanguage, t, valueToLabel, getOptions } from "@/lib/translations";

interface ClientProfileViewProps {
    client: Client;
    onEdit: () => void;
    onDelete: () => void;
}

type OptionKey = keyof typeof import("@/lib/translations").translations.en.options;

const Field = ({ label, value, lang, optionKey }: { label: string; value: string | string[] | boolean | undefined; lang?: FormLanguage; optionKey?: OptionKey }) => {
    if (value === undefined || value === null || value === "") return null;

    let displayValue: React.ReactNode = value;
    let textDirection: "rtl" | "ltr" = "ltr";

    if (Array.isArray(value)) {
        if (value.length === 0) return null;
        // If we have an optionKey and lang, translate the values
        if (optionKey && lang) {
            displayValue = value.map(v => valueToLabel(lang, optionKey, v)).join(", ");
        } else {
            displayValue = value.join(", ");
        }
        // Check if any item in array contains Hebrew
        textDirection = value.some(v => typeof v === "string" && getTextDirection(v) === "rtl") ? "rtl" : "ltr";
    } else if (typeof value === "string") {
        // If we have an optionKey and lang, translate the value
        if (optionKey && lang) {
            displayValue = valueToLabel(lang, optionKey, value);
        } else {
            displayValue = value;
        }
        textDirection = getTextDirection(value);
    } else if (typeof value === "boolean") {
        displayValue = value ? (lang === "he" ? "כן" : "Yes") : (lang === "he" ? "לא" : "No");
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
            <span className="block text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                {label}
            </span>
            <span 
                className={cn(
                    "block text-gray-900 dark:text-gray-100 font-medium text-base",
                    textDirection === "rtl" && "text-right"
                )}
                dir={textDirection}
            >
                {displayValue}
            </span>
        </div>
    );
};

export function ClientProfileView({ client, onEdit, onDelete }: ClientProfileViewProps) {
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Determine language from client formLanguage or detect from content
    const lang: FormLanguage = detectClientLanguage(client);
    const isRtl = lang === "he";

    // Combine profile photo and gallery images
    const allImages = [
        ...(client.photoUrl ? [client.photoUrl] : []),
        ...(client.galleryImages || [])
    ].filter(Boolean);

    const calculateAge = (dob: string) => {
        if (!dob) return "N/A";

        // Handle Year Only (YYYY)
        if (/^\d{4}$/.test(dob)) {
            return new Date().getFullYear() - parseInt(dob);
        }

        // Handle Hebrew Date
        if (dob.includes("Hebrew:")) {
            // Extract year from "Hebrew: Day Month Year"
            const parts = dob.trim().split(" ");
            const hebrewYear = parseInt(parts[parts.length - 1]);
            // Approximate Gregorian year: Hebrew Year - 3760
            if (!isNaN(hebrewYear)) {
                return new Date().getFullYear() - (hebrewYear - 3760);
            }
            return "N/A";
        }

        // Handle Standard Date (YYYY-MM-DD)
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const sections = [
        {
            title: t(lang, "profileView.appearance"),
            icon: Ruler,
            content: (
                <div className="grid grid-cols-2 gap-4">
                    <Field label={t(lang, "profileView.height")} value={`${client.height} cm`} lang={lang} />
                    <Field label={t(lang, "profileView.eyeColor")} value={client.eyeColor} lang={lang} optionKey="eyeColor" />
                    <Field label={t(lang, "profileView.hairColor")} value={client.hairColor} lang={lang} optionKey="hairColor" />
                    <Field label={t(lang, "profileView.vision")} value={client.headCovering === "Glasses" ? "Glasses" : undefined} lang={lang} />
                </div>
            )
        },
        {
            title: t(lang, "profileView.backgroundHeritage"),
            icon: Globe,
            content: (
                <div className="grid gap-4">
                    <Field label={t(lang, "profileView.ethnicity")} value={client.ethnicity} lang={lang} optionKey="ethnicity" />
                    <Field label={t(lang, "profileView.tribalStatus")} value={client.tribalStatus} lang={lang} optionKey="tribalStatus" />
                    <Field label={t(lang, "profileView.languages")} value={client.languages} lang={lang} optionKey="languages" />
                    <Field label={t(lang, "profileView.family")} value={client.familyBackground} lang={lang} />
                </div>
            )
        },
        {
            title: t(lang, "profileView.religiousPersonal"),
            icon: BookOpen,
            content: (
                <div className="grid gap-4">
                    <Field label={t(lang, "profileView.affiliation")} value={client.religiousAffiliation} lang={lang} optionKey="religiousAffiliation" />
                    <Field label={t(lang, "profileView.learningStatus")} value={client.learningStatus} lang={lang} optionKey="learningStatus" />
                    <Field label={t(lang, "profileView.headCovering")} value={client.headCovering} lang={lang} optionKey="headCovering" />
                    <Field label={t(lang, "profileView.smoking")} value={client.smoking} lang={lang} optionKey="smoking" />
                    <div className="col-span-full">
                        <Field label={t(lang, "profileView.hobbies")} value={client.hobbies} lang={lang} />
                    </div>
                </div>
            )
        },
        {
            title: t(lang, "profileView.educationWork"),
            icon: GraduationCap,
            content: (
                <div className="grid gap-4">
                    <Field label={t(lang, "profileView.education")} value={client.education} lang={lang} />
                    <Field label={t(lang, "profileView.occupation")} value={client.occupation} lang={lang} />
                </div>
            )
        },
        {
            title: t(lang, "profileView.medical"),
            icon: Heart,
            content: (
                <div className="grid gap-4">
                    <Field label={t(lang, "profileView.medicalHistory")} value={client.medicalHistory} lang={lang} />
                    {client.medicalHistory && (
                        <Field label={t(lang, "profileView.details")} value={client.medicalHistoryDetails} lang={lang} />
                    )}
                </div>
            )
        },
        {
            title: t(lang, "profileView.theSearch"),
            icon: Users,
            content: (
                <div className="grid gap-4">
                    <Field label={t(lang, "profileView.ageGapPreference")} value={client.ageGapPreference} lang={lang} optionKey="ageGapPreference" />
                    <Field label={t(lang, "profileView.willingToRelocate")} value={client.willingToRelocate} lang={lang} optionKey="willingToRelocate" />
                    <Field label={t(lang, "profileView.preferredEthnicities")} value={client.preferredEthnicities} lang={lang} optionKey="ethnicity" />
                    <Field label={t(lang, "profileView.preferredHashkafos")} value={client.preferredHashkafos} lang={lang} optionKey="religiousAffiliation" />
                </div>
            )
        },
        {
            title: t(lang, "profileView.adminNotes"),
            icon: FileText,
            content: (
                <div className="grid gap-4">
                    <Field label={t(lang, "profileView.references")} value={client.references} lang={lang} />
                    <Field label={t(lang, "profileView.internalNotes")} value={client.notes} lang={lang} />
                </div>
            )
        }
    ];

    const nextSection = () => {
        setCurrentSectionIndex((prev) => (prev + 1) % sections.length);
    };

    const prevSection = () => {
        setCurrentSectionIndex((prev) => (prev - 1 + sections.length) % sections.length);
    };

    // Touch Handling for Swipe
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSection();
        } else if (isRightSwipe) {
            prevSection();
        }
    };

    // Conditional Scroll Logic
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = useState(false);

    useEffect(() => {
        const checkScroll = () => {
            if (scrollContainerRef.current) {
                const { scrollHeight, clientHeight } = scrollContainerRef.current;
                // Only enable scroll if content exceeds container by more than a small threshold (e.g. 5px)
                // This prevents scrolling for tiny sub-pixel overflows but ensures text lines are scrollable
                setIsScrollable(scrollHeight > clientHeight + 5);
            }
        };

        checkScroll();
        window.addEventListener('resize', checkScroll);

        // Small delay to ensure content has rendered/layout is stable
        const timer = setTimeout(checkScroll, 100);

        return () => {
            window.removeEventListener('resize', checkScroll);
            clearTimeout(timer);
        };
    }, [client, currentSectionIndex, sections]);

    const CurrentIcon = sections[currentSectionIndex].icon;

    return (
        <div className={`w-full flex flex-col h-full overflow-hidden pb-4 ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
            {/* Header / Top Card (Fixed Info) */}
            <div className="w-full bg-white dark:bg-gray-950 p-4 rounded-xl shrink-0">
                <div className="flex flex-col items-center text-center space-y-3">
                    <button
                        onClick={() => {
                            if (allImages.length > 0) {
                                setIsGalleryOpen(true);
                            }
                        }}
                        className="relative w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden border-2 border-gray-50 dark:border-gray-800 shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                        disabled={allImages.length === 0}
                    >
                        {client.photoUrl ? (
                            <Image
                                src={client.photoUrl}
                                alt={client.fullName}
                                fill
                                className="object-cover"
                                sizes="80px"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <UserIcon className="h-8 w-8" />
                            </div>
                        )}
                    </button>

                    {allImages.length > 0 && (
                        <button
                            onClick={() => setIsGalleryOpen(true)}
                            className="mt-2 text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 font-medium hover:bg-blue-100 transition-colors"
                        >
                            {lang === "he" ? `צפה בקורות חיים (${allImages.length})` : `View Resume (${allImages.length})`}
                        </button>
                    )}

                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{client.fullName}</h1>
                        <div className="flex flex-wrap justify-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                            <span 
                                className={cn(
                                    "flex items-center gap-1",
                                    getTextDirection(client.location) === "rtl" && "flex-row-reverse"
                                )}
                                dir={getTextDirection(client.location)}
                            >
                                <MapPin className="h-3 w-3" /> {client.location}
                            </span>
                            <span className="hidden w-1 h-1 bg-gray-300 rounded-full sm:inline-block"></span>
                            <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" /> {client.occupation}
                            </span>
                            <span className="hidden w-1 h-1 bg-gray-300 rounded-full sm:inline-block"></span>
                            <span className="font-medium bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                                {calculateAge(client.dob)} y/o
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto pt-1">
                        <button
                            onClick={onEdit}
                            className="flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                        >
                            {lang === "he" ? "עריכה" : "Edit"}
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none"
                        >
                            {lang === "he" ? "מחיקה" : "Delete"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Carousel Content - Takes remaining space */}
            <div className="w-full flex-1 mt-2 bg-white dark:bg-gray-950 rounded-xl flex flex-col min-h-0 overflow-hidden">
                {/* Carousel Controls */}
                <div className="flex items-center justify-between p-3 border-b bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                    <button
                        onClick={prevSection}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        aria-label="Previous section"
                    >
                        {isRtl ? (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                        ) : (
                            <ChevronLeft className="h-5 w-5 text-gray-500" />
                        )}
                    </button>

                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 text-red-600 font-semibold">
                            <CurrentIcon className="h-4 w-4" />
                            <span>{sections[currentSectionIndex].title}</span>
                        </div>
                        <div className="flex gap-1 mt-1.5">
                            {sections.map((_, idx) => (
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

                    <button
                        onClick={nextSection}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        aria-label="Next section"
                    >
                        {isRtl ? (
                            <ChevronLeft className="h-5 w-5 text-gray-500" />
                        ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                    </button>
                </div>

                {/* Section Content - Scrollable */}
                <div
                    ref={scrollContainerRef}
                    className={cn(
                        "flex-1 p-4 animate-in fade-in duration-300 touch-pan-y",
                        isScrollable ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"
                    )}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-full">
                        {sections[currentSectionIndex].content}
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


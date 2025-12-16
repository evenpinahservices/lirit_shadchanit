import { useState, useRef, useEffect } from "react";
import { Client } from "@/lib/mockData";
import Image from "next/image";
import { MapPin, Briefcase, Ruler, Heart, BookOpen, GraduationCap, Globe, Users, FileText, ChevronLeft, ChevronRight, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientProfileViewProps {
    client: Client;
    onEdit: () => void;
    onDelete: () => void;
}

const Field = ({ label, value }: { label: string; value: string | string[] | boolean | undefined }) => {
    if (value === undefined || value === null || value === "") return null;

    let displayValue: React.ReactNode = value;

    if (Array.isArray(value)) {
        if (value.length === 0) return null;
        displayValue = value.join(", ");
    } else if (typeof value === "boolean") {
        displayValue = value ? "Yes" : "No";
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
            <span className="block text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                {label}
            </span>
            <span className="block text-gray-900 dark:text-gray-100 font-medium text-base">
                {displayValue}
            </span>
        </div>
    );
};

export function ClientProfileView({ client, onEdit, onDelete }: ClientProfileViewProps) {
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

    const calculateAge = (dob: string) => {
        if (!dob) return "N/A";
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const sections = [
        {
            title: "Appearance",
            icon: Ruler,
            content: (
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Height" value={`${client.height} cm`} />
                    <Field label="Eye Color" value={client.eyeColor} />
                    <Field label="Hair Color" value={client.hairColor} />
                    <Field label="Vision" value={client.headCovering === "Glasses" ? "Glasses" : undefined} />
                </div>
            )
        },
        {
            title: "Background & Heritage",
            icon: Globe,
            content: (
                <div className="grid gap-4">
                    <Field label="Ethnicity" value={client.ethnicity} />
                    <Field label="Tribal Status" value={client.tribalStatus} />
                    <Field label="Languages" value={client.languages} />
                    <Field label="Family" value={client.familyBackground} />
                </div>
            )
        },
        {
            title: "Religious & Personal",
            icon: BookOpen,
            content: (
                <div className="grid gap-4">
                    <Field label="Affiliation" value={client.religiousAffiliation} />
                    <Field label="Learning Status" value={client.learningStatus} />
                    <Field label="Head Covering" value={client.headCovering} />
                    <Field label="Smoking" value={client.smoking} />
                    <div className="col-span-full">
                        <Field label="Hobbies" value={client.hobbies} />
                    </div>
                </div>
            )
        },
        {
            title: "Education & Work",
            icon: GraduationCap,
            content: (
                <div className="grid gap-4">
                    <Field label="Education" value={client.education} />
                    <Field label="Occupation" value={client.occupation} />
                </div>
            )
        },
        {
            title: "Medical",
            icon: Heart,
            content: (
                <div className="grid gap-4">
                    <Field label="Medical History" value={client.medicalHistory} />
                    {client.medicalHistory && (
                        <Field label="Details" value={client.medicalHistoryDetails} />
                    )}
                </div>
            )
        },
        {
            title: "The Search",
            icon: Users,
            content: (
                <div className="grid gap-4">
                    <Field label="Looking For" value={client.lookingFor} />
                    <Field label="Age Gap Preference" value={client.ageGapPreference} />
                    <Field label="Willing to Relocate" value={client.willingToRelocate} />
                    <Field label="Preferred Ethnicities" value={client.preferredEthnicities} />
                    <Field label="Preferred Hashkafos" value={client.preferredHashkafos} />
                </div>
            )
        },
        {
            title: "Admin Notes",
            icon: FileText,
            content: (
                <div className="grid gap-4">
                    <Field label="References" value={client.references} />
                    <Field label="Internal Notes" value={client.notes} />
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
                // Only enable scroll if content exceeds container by more than ~1cm (approx 40-50px)
                setIsScrollable(scrollHeight > clientHeight + 50);
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
        <div className="flex flex-col h-full overflow-hidden pb-4">
            {/* Header / Top Card (Fixed Info) */}
            <div className="bg-white dark:bg-gray-950 p-4 rounded-xl shrink-0">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="relative w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden border-2 border-gray-50 dark:border-gray-800 shadow-sm">
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
                    </div>

                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{client.fullName}</h1>
                        <div className="flex flex-wrap justify-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
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
                            Edit
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Carousel Content - Takes remaining space */}
            <div className="flex-1 mt-2 bg-white dark:bg-gray-950 rounded-xl flex flex-col min-h-0 overflow-hidden">
                {/* Carousel Controls */}
                <div className="flex items-center justify-between p-3 border-b bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                    <button
                        onClick={prevSection}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        aria-label="Previous section"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-500" />
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
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Section Content - Scrollable */}
                <div
                    ref={scrollContainerRef}
                    className={cn(
                        "flex-1 p-4 animate-in fade-in duration-300 touch-pan-y",
                        isScrollable ? "overflow-y-auto" : "overflow-hidden"
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
        </div>
    );
}


"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { calculateAge } from "@/lib/matchingUtils";
import { detectClientLanguage } from "@/lib/utils";
import { valueToLabel } from "@/lib/translations";
import Link from "next/link";
import { ArrowLeft, User as UserIcon, MapPin, ExternalLink, Heart } from "lucide-react";

function normalizeArr(val: string | string[] | undefined | null): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return [val];
}

const HEBREW_RE = /[֐-׿]/;
function textDir(s: string): "rtl" | "ltr" {
    return HEBREW_RE.test(s) ? "rtl" : "ltr";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Avatar({ client, he }: { client: Client; he: boolean }) {
    const age = calculateAge(client.dob);
    const ageLabel = he ? `${age} שנה` : `${age} y/o`;
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-700 shadow-md">
                {client.photoUrl ? (
                    <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                ) : (
                    <UserIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                )}
            </div>
            <div className="text-center">
                <h2 className="font-bold text-base text-gray-900 dark:text-gray-100 leading-tight">{client.fullName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{client.gender} · {ageLabel}</p>
                {client.location && (
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-0.5 mt-0.5">
                        <MapPin className="h-3 w-3" />{client.location}
                    </p>
                )}
            </div>
            <Link
                href={`/clients/${client.id}`}
                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
            >
                {he ? "פרופיל מלא" : "Full Profile"} <ExternalLink className="h-3 w-3" />
            </Link>
        </div>
    );
}

interface RowProps {
    label: string;
    aVal: string;
    bVal: string;
}

function CompareRow({ label, aVal, bVal }: RowProps) {
    const aDir = textDir(aVal);
    const bDir = textDir(bVal);
    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 py-2 text-sm">
            <div
                dir={aDir}
                className="text-gray-800 dark:text-gray-200 font-medium pr-2 min-w-0 wrap-break-word"
                style={{ textAlign: "right" }}
            >
                {aVal || "—"}
            </div>
            <div className="shrink-0 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{label}</span>
            </div>
            <div
                dir={bDir}
                className="text-gray-800 dark:text-gray-200 font-medium pl-2 min-w-0 wrap-break-word"
                style={{ textAlign: bDir === "rtl" ? "right" : "left" }}
            >
                {bVal || "—"}
            </div>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 mt-3 mb-1 px-3">
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{children}</span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────

function CompareContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { getClient, isLoading } = useClients();

    const aId = searchParams.get("a") || "";
    const bId = searchParams.get("b") || "";
    const back = searchParams.get("back") || "/matching";

    const clientA = getClient(aId);
    const clientB = getClient(bId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[40vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
            </div>
        );
    }

    if (!clientA || !clientB) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-4">
                <p className="text-gray-500">Could not find one or both clients.</p>
                <button onClick={() => router.push(back)} className="text-red-600 hover:underline text-sm">Go back</button>
            </div>
        );
    }

    const male = clientA.gender === "Male" ? clientA : clientB;
    const female = clientA.gender === "Female" ? clientA : clientB;
    const mixedGenders = clientA.gender !== clientB.gender;

    const bothHebrew =
        detectClientLanguage(clientA) === "he" &&
        detectClientLanguage(clientB) === "he";

    // Translate an English option value (or comma-separated list) to Hebrew when both profiles are Hebrew
    type OptionKey = Parameters<typeof valueToLabel>[1];
    function tv(val: string | undefined, key: OptionKey): string {
        if (!val) return "";
        if (!bothHebrew) return val;
        return val.split(", ").map(v => valueToLabel("he", key, v.trim())).join("، ");
    }

    // Labels — Hebrew when both profiles are Hebrew
    const L = bothHebrew
        ? {
            back: "חזרה",
            title: "השוואה",
            core: "פרטים מרכזיים",
            prefs: "העדפות",
            background: "רקע",
            personal: "אישי",
            location: "מיקום",
            ethnicity: "עדה",
            hashkafa: "השקפה",
            maritalStatus: "מצב משפחתי",
            age: "גיל",
            relocate: "מוכן לעבור?",
            learning: "לימוד (זכר / העדפת נקבה)",
            headCovering: "כיסוי ראש (נקבה / העדפת זכר)",
            familyBg: "רקע משפחתי",
            education: "השכלה",
            occupation: "עיסוק",
            languages: "שפות",
            personality: "אישיות",
            hobbies: "תחביבים",
            lookingFor: "מחפש/ת",
        }
        : {
            back: "Back",
            title: "Comparison",
            core: "Core",
            prefs: "Preferences",
            background: "Background",
            personal: "Personal",
            location: "Location",
            ethnicity: "Ethnicity",
            hashkafa: "Hashkafa",
            maritalStatus: "Marital Status",
            age: "Age",
            relocate: "Relocate?",
            learning: "Learning (♂ / ♀ pref)",
            headCovering: "Head Covering (♀ / ♂ pref)",
            familyBg: "Family Background",
            education: "Education",
            occupation: "Occupation",
            languages: "Languages",
            personality: "Personality",
            hobbies: "Hobbies",
            lookingFor: "Looking For",
        };

    return (
        <div className="flex flex-col h-full min-h-0 gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {L.back}
                </button>
                <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-600 fill-red-600" />
                    <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{L.title}</h1>
                </div>
                <div className="w-12" /> {/* spacer */}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1 pb-8">

                {/* Profile headers */}
                <div className="grid grid-cols-2 gap-4 mb-4 bg-white dark:bg-gray-950 rounded-xl p-4 shadow-sm">
                    <Avatar client={clientA} he={bothHebrew} />
                    <Avatar client={clientB} he={bothHebrew} />
                </div>

                {/* Comparison rows */}
                <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm py-3 divide-y divide-gray-50 dark:divide-gray-800/50">
                    <SectionLabel>{L.core}</SectionLabel>
                    <CompareRow label={L.location} aVal={clientA.location} bVal={clientB.location} />
                    <CompareRow label={L.ethnicity} aVal={tv(clientA.ethnicity, "ethnicity")} bVal={tv(clientB.ethnicity, "ethnicity")} />
                    <CompareRow
                        label={L.hashkafa}
                        aVal={tv(normalizeArr(clientA.religiousAffiliation).join(", "), "religiousAffiliation")}
                        bVal={tv(normalizeArr(clientB.religiousAffiliation).join(", "), "religiousAffiliation")}
                    />
                    <CompareRow label={L.maritalStatus} aVal={tv(clientA.maritalStatus, "maritalStatus")} bVal={tv(clientB.maritalStatus, "maritalStatus")} />
                    <CompareRow
                        label={L.age}
                        aVal={bothHebrew ? `${calculateAge(clientA.dob)} שנה` : `${calculateAge(clientA.dob)} y/o`}
                        bVal={bothHebrew ? `${calculateAge(clientB.dob)} שנה` : `${calculateAge(clientB.dob)} y/o`}
                    />
                    <CompareRow label={L.relocate} aVal={tv(clientA.willingToRelocate, "willingToRelocate")} bVal={tv(clientB.willingToRelocate, "willingToRelocate")} />

                    {mixedGenders && (
                        <>
                            <SectionLabel>{L.prefs}</SectionLabel>
                            <CompareRow
                                label={L.learning}
                                aVal={tv(male.learningStatus || "", "learningStatus") || "—"}
                                bVal={tv(normalizeArr(female.preferredLearningStatus).join(", "), "learningStatus") || (bothHebrew ? "כל סטטוס" : "Any")}
                            />
                            <CompareRow
                                label={L.headCovering}
                                aVal={tv(female.headCovering || "", "headCovering") || "—"}
                                bVal={tv(normalizeArr(male.preferredHeadCovering).join(", "), "headCovering") || (bothHebrew ? "כל כיסוי" : "Any")}
                            />
                        </>
                    )}

                    <SectionLabel>{L.background}</SectionLabel>
                    <CompareRow label={L.familyBg} aVal={clientA.familyBackground} bVal={clientB.familyBackground} />
                    <CompareRow label={L.education} aVal={clientA.education} bVal={clientB.education} />
                    <CompareRow label={L.occupation} aVal={clientA.occupationTitle} bVal={clientB.occupationTitle} />
                    <CompareRow
                        label={L.languages}
                        aVal={tv(normalizeArr(clientA.languages).join(", "), "languages")}
                        bVal={tv(normalizeArr(clientB.languages).join(", "), "languages")}
                    />

                    <SectionLabel>{L.personal}</SectionLabel>
                    <CompareRow label={L.personality} aVal={clientA.personality} bVal={clientB.personality} />
                    <CompareRow label={L.hobbies} aVal={clientA.hobbies} bVal={clientB.hobbies} />
                    {(clientA.preferencesFreeText || clientB.preferencesFreeText) && (
                        <CompareRow label={L.lookingFor} aVal={clientA.preferencesFreeText || ""} bVal={clientB.preferencesFreeText || ""} />
                    )}
                </div>

                {/* Profile buttons */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <Link
                        href={`/clients/${clientA.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        {bothHebrew ? `הפרופיל של ${clientA.fullName.split(" ")[0]}` : `${clientA.fullName.split(" ")[0]}'s Profile`}
                    </Link>
                    <Link
                        href={`/clients/${clientB.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        {bothHebrew ? `הפרופיל של ${clientB.fullName.split(" ")[0]}` : `${clientB.fullName.split(" ")[0]}'s Profile`}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ComparePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full min-h-[40vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
            </div>
        }>
            <CompareContent />
        </Suspense>
    );
}

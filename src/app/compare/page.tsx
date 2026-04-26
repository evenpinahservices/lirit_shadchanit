"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { calculateAge } from "@/lib/matchingUtils";
import { areLocationsCompatible } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    ArrowLeft, User as UserIcon, MapPin, CheckCircle2, XCircle, AlertCircle,
    ExternalLink, Heart, ChevronRight
} from "lucide-react";

// ── Compatibility helpers ──────────────────────────────────────────────────────

function normalizeArr(val: string | string[] | undefined | null): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return [val];
}

function isWildcard(v: string) {
    const s = v.toLowerCase().trim();
    return ["any", "all", "flexible", "i don't mind", "n/a", "doesn't matter"].some(w => s.includes(w));
}

type Compat = "yes" | "partial" | "no" | "unknown";

const ETH_MAP: Record<string, string> = {
    sephardi: "sephardi", sefardi: "sephardi", mizrachi: "sephardi", mizrahi: "sephardi",
    ashkenazi: "ashkenazi", ashkenaz: "ashkenazi",
    yemenite: "yemenite", yemeni: "yemenite",
    chassidic: "chassidic", chasidic: "chassidic", hasidic: "chassidic",
};
function ethGroup(e: string) { return ETH_MAP[e.toLowerCase().trim()] ?? e.toLowerCase().trim(); }

function checkLocationCompat(a: Client, b: Client): Compat {
    if (!a.location || !b.location) return "unknown";
    return areLocationsCompatible(a.location, b.location, a.willingToRelocate, b.willingToRelocate)
        ? "yes" : "no";
}

function checkEthnicityCompat(a: Client, b: Client): Compat {
    if (!a.ethnicity || !b.ethnicity) return "unknown";
    if (ethGroup(a.ethnicity) === ethGroup(b.ethnicity)) return "yes";
    const aPrefs = normalizeArr(a.preferredEthnicities);
    const bPrefs = normalizeArr(b.preferredEthnicities);
    const aOk = aPrefs.length === 0 || aPrefs.some(isWildcard) || aPrefs.some(e => ethGroup(e) === ethGroup(b.ethnicity!));
    const bOk = bPrefs.length === 0 || bPrefs.some(isWildcard) || bPrefs.some(e => ethGroup(e) === ethGroup(a.ethnicity!));
    return aOk && bOk ? "partial" : "no";
}

function checkHashkafaCompat(a: Client, b: Client): Compat {
    const aAff = normalizeArr(a.religiousAffiliation);
    const bAff = normalizeArr(b.religiousAffiliation);
    if (aAff.length === 0 || bAff.length === 0) return "unknown";
    return aAff.some(h => bAff.includes(h)) ? "yes" : "no";
}

function checkAgeGapCompat(a: Client, b: Client): { compat: Compat; gap: number } {
    const male = a.gender === "Male" ? a : b;
    const female = a.gender === "Female" ? a : b;
    const mAge = calculateAge(male.dob);
    const fAge = calculateAge(female.dob);
    const gap = mAge - fAge;
    const absGap = Math.abs(gap);
    const defaultOk = gap >= -1 && gap <= 3;
    return { compat: defaultOk ? "yes" : "partial", gap };
}

function checkDivorcedCompat(a: Client, b: Client): Compat {
    const aDiv = a.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    const bDiv = b.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    return aDiv === bDiv ? "yes" : "no";
}

function checkLearningCompat(male: Client, female: Client): Compat {
    const learnPrefs = normalizeArr(female.preferredLearningStatus);
    if (learnPrefs.length === 0 || learnPrefs.some(isWildcard)) return "unknown";
    if (!male.learningStatus) return "unknown";
    return learnPrefs.includes(male.learningStatus) ? "yes" : "no";
}

function checkHeadCoveringCompat(male: Client, female: Client): Compat {
    const headPrefs = normalizeArr(male.preferredHeadCovering);
    if (headPrefs.length === 0 || headPrefs.some(isWildcard)) return "unknown";
    if (!female.headCovering) return "unknown";
    return female.headCovering === "Flexible" || headPrefs.includes(female.headCovering) ? "yes" : "no";
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function CompatBadge({ compat }: { compat: Compat }) {
    if (compat === "yes") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    if (compat === "no") return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    if (compat === "partial") return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
    return null;
}

function rowBg(compat: Compat) {
    if (compat === "yes") return "bg-green-50/50 dark:bg-green-900/10";
    if (compat === "no") return "bg-red-50/50 dark:bg-red-900/10";
    if (compat === "partial") return "bg-amber-50/50 dark:bg-amber-900/10";
    return "";
}

interface CompareRowProps {
    label: string;
    aVal: string;
    bVal: string;
    compat?: Compat;
}

function CompareRow({ label, aVal, bVal, compat = "unknown" }: CompareRowProps) {
    return (
        <div className={cn("grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 py-2.5 rounded-lg text-sm", rowBg(compat))}>
            <div className="text-gray-800 dark:text-gray-200 font-medium text-right pr-2 min-w-0 break-words">{aVal || "—"}</div>
            <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{label}</span>
                <CompatBadge compat={compat} />
            </div>
            <div className="text-gray-800 dark:text-gray-200 font-medium pl-2 min-w-0 break-words">{bVal || "—"}</div>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 mt-4 mb-1">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{children}</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>
    );
}

function Avatar({ client }: { client: Client }) {
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
                <p className="text-xs text-gray-500 mt-0.5">{client.gender} · {calculateAge(client.dob)} y/o</p>
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
                Full Profile <ExternalLink className="h-3 w-3" />
            </Link>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
    const bothSameGender = clientA.gender === clientB.gender;

    const locationCompat = checkLocationCompat(clientA, clientB);
    const ethCompat = checkEthnicityCompat(clientA, clientB);
    const hashkafaCompat = checkHashkafaCompat(clientA, clientB);
    const { compat: ageCompat, gap: ageGap } = checkAgeGapCompat(clientA, clientB);
    const divorcedCompat = checkDivorcedCompat(clientA, clientB);
    const learningCompat = bothSameGender ? "unknown" as Compat : checkLearningCompat(male, female);
    const headCoverCompat = bothSameGender ? "unknown" as Compat : checkHeadCoveringCompat(male, female);

    const overallScore = [locationCompat, ethCompat, hashkafaCompat, ageCompat, divorcedCompat]
        .filter(c => c !== "unknown")
        .reduce((acc, c) => acc + (c === "yes" ? 2 : c === "partial" ? 1 : 0), 0);
    const maxScore = [locationCompat, ethCompat, hashkafaCompat, ageCompat, divorcedCompat]
        .filter(c => c !== "unknown").length * 2;
    const pct = maxScore > 0 ? Math.round((overallScore / maxScore) * 100) : 0;

    const aVal = (c: Client, field: keyof Client) => {
        const v = c[field];
        if (Array.isArray(v)) return v.join(", ");
        if (typeof v === "boolean") return v ? "Yes" : "No";
        return String(v || "");
    };

    return (
        <div className="flex flex-col h-full min-h-0 gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <button
                    onClick={() => router.push(back)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
                <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-600 fill-red-600" />
                    <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Comparison</h1>
                </div>
                <Link
                    href={`/matching?clientId=${aId}&view=results`}
                    className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                    Match <ChevronRight className="h-4 w-4" />
                </Link>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1 pb-8">
                {/* Profile headers */}
                <div className="grid grid-cols-2 gap-4 mb-4 bg-white dark:bg-gray-950 rounded-xl p-4 shadow-sm">
                    <Avatar client={clientA} />
                    <Avatar client={clientB} />
                </div>

                {/* Overall compatibility bar */}
                <div className="bg-white dark:bg-gray-950 rounded-xl p-4 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Compatibility</span>
                        <span className={cn(
                            "text-sm font-bold",
                            pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-600" : "text-red-500"
                        )}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all", pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500")}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-400">Based on core criteria</span>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />Match</span>
                            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500" />Partial</span>
                            <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />Conflict</span>
                        </div>
                    </div>
                </div>

                {/* Comparison rows */}
                <div className="bg-white dark:bg-gray-950 rounded-xl p-4 shadow-sm space-y-1">
                    <SectionLabel>Core Criteria</SectionLabel>
                    <CompareRow label="Location" aVal={clientA.location} bVal={clientB.location} compat={locationCompat} />
                    <CompareRow label="Ethnicity" aVal={clientA.ethnicity} bVal={clientB.ethnicity} compat={ethCompat} />
                    <CompareRow
                        label="Hashkafa"
                        aVal={normalizeArr(clientA.religiousAffiliation).join(", ")}
                        bVal={normalizeArr(clientB.religiousAffiliation).join(", ")}
                        compat={hashkafaCompat}
                    />
                    <CompareRow
                        label="Marital Status"
                        aVal={clientA.maritalStatus}
                        bVal={clientB.maritalStatus}
                        compat={divorcedCompat}
                    />
                    <CompareRow
                        label="Age Gap"
                        aVal={`${calculateAge(clientA.dob)} y/o`}
                        bVal={`${calculateAge(clientB.dob)} y/o`}
                        compat={ageCompat}
                    />

                    {!bothSameGender && (
                        <>
                            <SectionLabel>Role-Based Preferences</SectionLabel>
                            <CompareRow
                                label="Learning (♂ status / ♀ pref)"
                                aVal={male.learningStatus || "—"}
                                bVal={normalizeArr(female.preferredLearningStatus).join(", ") || "Any"}
                                compat={learningCompat}
                            />
                            <CompareRow
                                label="Head Covering (♀ wears / ♂ prefers)"
                                aVal={female.headCovering || "—"}
                                bVal={normalizeArr(male.preferredHeadCovering).join(", ") || "Any"}
                                compat={headCoverCompat}
                            />
                        </>
                    )}

                    <SectionLabel>Background</SectionLabel>
                    <CompareRow label="Family Background" aVal={clientA.familyBackground} bVal={clientB.familyBackground} />
                    <CompareRow label="Education" aVal={clientA.education} bVal={clientB.education} />
                    <CompareRow label="Occupation" aVal={clientA.occupationTitle} bVal={clientB.occupationTitle} />
                    <CompareRow
                        label="Languages"
                        aVal={normalizeArr(clientA.languages).join(", ")}
                        bVal={normalizeArr(clientB.languages).join(", ")}
                    />
                    <CompareRow label="Relocate?" aVal={clientA.willingToRelocate} bVal={clientB.willingToRelocate} />

                    <SectionLabel>Personal</SectionLabel>
                    <CompareRow label="Personality" aVal={clientA.personality} bVal={clientB.personality} />
                    <CompareRow label="Hobbies" aVal={clientA.hobbies} bVal={clientB.hobbies} />
                    {(clientA.preferencesFreeText || clientB.preferencesFreeText) && (
                        <CompareRow label="Looking For" aVal={clientA.preferencesFreeText || ""} bVal={clientB.preferencesFreeText || ""} />
                    )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <Link
                        href={`/clients/${clientA.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        {clientA.fullName.split(" ")[0]}'s Profile
                    </Link>
                    <Link
                        href={`/clients/${clientB.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        {clientB.fullName.split(" ")[0]}'s Profile
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

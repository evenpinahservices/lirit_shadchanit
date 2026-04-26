"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { calculateAge } from "@/lib/matchingUtils";
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
                className="text-gray-800 dark:text-gray-200 font-medium pr-2 min-w-0 break-words"
                style={{ textAlign: aDir === "rtl" ? "right" : "right" }}
            >
                {aVal || "—"}
            </div>
            <div className="shrink-0 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{label}</span>
            </div>
            <div
                dir={bDir}
                className="text-gray-800 dark:text-gray-200 font-medium pl-2 min-w-0 break-words"
                style={{ textAlign: bDir === "rtl" ? "left" : "left" }}
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

    return (
        <div className="flex flex-col h-full min-h-0 gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
                <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-600 fill-red-600" />
                    <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Comparison</h1>
                </div>
                <div className="w-12" /> {/* spacer */}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1 pb-8">

                {/* Profile headers */}
                <div className="grid grid-cols-2 gap-4 mb-4 bg-white dark:bg-gray-950 rounded-xl p-4 shadow-sm">
                    <Avatar client={clientA} />
                    <Avatar client={clientB} />
                </div>

                {/* Comparison rows */}
                <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm py-3 divide-y divide-gray-50 dark:divide-gray-800/50">
                    <SectionLabel>Core</SectionLabel>
                    <CompareRow label="Location" aVal={clientA.location} bVal={clientB.location} />
                    <CompareRow label="Ethnicity" aVal={clientA.ethnicity} bVal={clientB.ethnicity} />
                    <CompareRow
                        label="Hashkafa"
                        aVal={normalizeArr(clientA.religiousAffiliation).join(", ")}
                        bVal={normalizeArr(clientB.religiousAffiliation).join(", ")}
                    />
                    <CompareRow label="Marital Status" aVal={clientA.maritalStatus} bVal={clientB.maritalStatus} />
                    <CompareRow
                        label="Age"
                        aVal={`${calculateAge(clientA.dob)} y/o`}
                        bVal={`${calculateAge(clientB.dob)} y/o`}
                    />
                    <CompareRow label="Relocate?" aVal={clientA.willingToRelocate} bVal={clientB.willingToRelocate} />

                    {mixedGenders && (
                        <>
                            <SectionLabel>Preferences</SectionLabel>
                            <CompareRow
                                label="Learning (♂ / ♀ pref)"
                                aVal={male.learningStatus || "—"}
                                bVal={normalizeArr(female.preferredLearningStatus).join(", ") || "Any"}
                            />
                            <CompareRow
                                label="Head Covering (♀ / ♂ pref)"
                                aVal={female.headCovering || "—"}
                                bVal={normalizeArr(male.preferredHeadCovering).join(", ") || "Any"}
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

                    <SectionLabel>Personal</SectionLabel>
                    <CompareRow label="Personality" aVal={clientA.personality} bVal={clientB.personality} />
                    <CompareRow label="Hobbies" aVal={clientA.hobbies} bVal={clientB.hobbies} />
                    {(clientA.preferencesFreeText || clientB.preferencesFreeText) && (
                        <CompareRow label="Looking For" aVal={clientA.preferencesFreeText || ""} bVal={clientB.preferencesFreeText || ""} />
                    )}
                </div>

                {/* Profile buttons */}
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

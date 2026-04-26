"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { findMatchesWithLevels, calculateAge } from "@/lib/matchingUtils";
import { CountryCode, getLocationCountry } from "@/lib/locationMapping";
import { getDismissedMatches, dismissMatch } from "@/actions/matching";
import {
    Heart, Sparkles, ArrowRight, ChevronRight, Search, X, Clock,
} from "lucide-react";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface DisplayedMatch {
    client: Client;
    level: 1 | 2;
}

export default function MatchingPage() {
    const { clients } = useClients();
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialClientId = searchParams.get("clientId") || "";
    const [selectedClientId, setSelectedClientId] = useState(initialClientId);
    const [isResultsView, setIsResultsView] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Full pools for auto-fill after dismiss
    const [poolL1, setPoolL1] = useState<Client[]>([]);
    const [poolL2, setPoolL2] = useState<Client[]>([]);
    const [displayed, setDisplayed] = useState<DisplayedMatch[]>([]);
    const [dismissingId, setDismissingId] = useState<string | null>(null);

    const clientOptions = clients.map((c) => ({
        label: `${c.fullName} (${c.gender})`,
        value: c.id,
    }));

    const selectedClient = clients.find((c) => c.id === selectedClientId);

    // ── Match generation ──────────────────────────────────────────────────────

    const handleMatch = async () => {
        if (!selectedClientId || !selectedClient) return;
        setIsLoading(true);
        try {
            const dismissed = await getDismissedMatches(selectedClientId);
            const dismissedIds = new Set(dismissed.map((d) => d.candidateId));

            const { level1, level2 } = findMatchesWithLevels(
                selectedClient,
                clients,
                dismissedIds
            );

            setPoolL1(level1);
            setPoolL2(level2);

            // Initial display: 10 if L1 >= 5, otherwise all L1 + fill L2 to 5
            const initial: DisplayedMatch[] = [];
            if (level1.length >= 5) {
                initial.push(...level1.slice(0, 10).map((c) => ({ client: c, level: 1 as const })));
            } else {
                initial.push(...level1.map((c) => ({ client: c, level: 1 as const })));
                const needed = Math.max(0, 5 - level1.length);
                initial.push(...level2.slice(0, needed).map((c) => ({ client: c, level: 2 as const })));
            }

            setDisplayed(initial);
            setIsResultsView(true);

            const params = new URLSearchParams(searchParams.toString());
            params.set("view", "results");
            params.set("clientId", selectedClientId);
            router.push(`/matching?${params.toString()}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setIsResultsView(false);
        setDisplayed([]);
        setPoolL1([]);
        setPoolL2([]);
        router.push("/matching");
    };

    // ── Dismiss ───────────────────────────────────────────────────────────────

    const handleDismiss = useCallback(
        async (match: DisplayedMatch, permanent: boolean) => {
            const candidateId = match.client.id;
            setDismissingId(candidateId);

            setDisplayed((prev) => {
                const next = prev.filter((m) => m.client.id !== candidateId);
                const shownIds = new Set(next.map((m) => m.client.id));

                // Pull next from L1 pool, then L2 pool
                const nextL1 = poolL1.find((c) => !shownIds.has(c.id) && c.id !== candidateId);
                if (nextL1) return [...next, { client: nextL1, level: 1 as const }];

                const nextL2 = poolL2.find((c) => !shownIds.has(c.id) && c.id !== candidateId);
                if (nextL2) return [...next, { client: nextL2, level: 2 as const }];

                return next;
            });

            try {
                await dismissMatch(selectedClientId, candidateId, match.level, permanent);
            } finally {
                setDismissingId(null);
            }
        },
        [poolL1, poolL2, selectedClientId]
    );

    // ── Deal-breaker summary ──────────────────────────────────────────────────

    const getCountryName = (code: CountryCode): string => {
        const map: Record<CountryCode, string> = {
            IL: "Israel", US: "United States", UK: "England",
            FR: "France", BE: "Belgium", AU: "Australia", CA: "Canada", OTHER: "Other",
        };
        return map[code] || "Other";
    };

    const getActiveDealBreakers = (client: Client) => {
        const active: { label: string; value: string }[] = [];
        const isPass = (v: string) => {
            const n = v.toLowerCase().trim();
            return n.includes("i don't mind") || n === "any" || n === "";
        };
        const check = (label: string, val: string[] | string | undefined) => {
            if (!val) return;
            if (Array.isArray(val)) {
                if (val.length === 0 || val.some(isPass)) return;
                active.push({ label, value: val.join(", ") });
            } else {
                if (!isPass(val)) active.push({ label, value: val });
            }
        };

        check("Age Gap", client.ageGapPreference);
        if (client.willingToRelocate && client.willingToRelocate !== "Yes" && !isPass(client.willingToRelocate)) {
            const code = client.location ? getLocationCountry(client.location) : "OTHER";
            active.push({ label: "Location", value: `${getCountryName(code)} only` });
        }
        check("Hashkafa", client.preferredHashkafos);
        check("Ethnicity", client.preferredEthnicities);
        check("Learning status (in husband)", client.preferredLearningStatus);
        check("Head covering (in wife)", client.preferredHeadCovering);
        return active;
    };

    const activeDealBreakers = selectedClient ? getActiveDealBreakers(selectedClient) : [];
    const level1Count = displayed.filter((m) => m.level === 1).length;
    const level2Count = displayed.filter((m) => m.level === 2).length;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full overflow-hidden space-y-4">
            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Heart className="h-8 w-8 text-red-600 fill-red-600" />
                        Smart Matching
                    </h1>
                    <p className="text-muted-foreground hidden md:block">
                        Find compatible matches based on community standards.
                    </p>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-24 md:pb-0 relative">
                <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden flex-1">

                    {/* SEARCH / COMPACT HEADER */}
                    <div className="shrink-0">
                        {!isResultsView ? (
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 shadow-sm flex flex-col">
                                <h2 className="font-semibold mb-3">Select Client</h2>
                                <div className="space-y-3">
                                    <SearchableSelect
                                        options={clientOptions}
                                        value={selectedClientId}
                                        onChange={(val) => {
                                            setSelectedClientId(val);
                                            setDisplayed([]);
                                        }}
                                        placeholder="Search by name..."
                                        className="w-full"
                                    />

                                    {selectedClient && (
                                        <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-md space-y-1">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">Matching based on deal breakers:</p>
                                            <ul className="list-disc pl-4 space-y-0.5">
                                                {activeDealBreakers.length > 0 ? (
                                                    activeDealBreakers.map((item, i) => (
                                                        <li key={i}>
                                                            <span className="font-medium">{item.label}:</span> {item.value}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="list-none -ml-4 text-gray-500 italic">No specific deal breakers.</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleMatch}
                                        disabled={!selectedClientId || isLoading}
                                        className="w-full flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isLoading ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                        ) : (
                                            <Sparkles className="h-4 w-4" />
                                        )}
                                        Generate Matches
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-semibold text-lg">
                                            {selectedClient?.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-gray-900 dark:text-gray-100">{selectedClient?.fullName}</h2>
                                            <p className="text-xs text-muted-foreground" dir="ltr">
                                                {selectedClient?.location ?? <span className="italic">Unknown</span>}
                                                {" • "}
                                                {selectedClient && calculateAge(selectedClient.dob)} y/o
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleReset}
                                        className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        New Search
                                    </button>
                                </div>
                                {activeDealBreakers.length > 0 && (
                                    <div className="text-xs text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
                                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Deal Breakers:</p>
                                        <ul className="list-disc pl-4 space-y-0.5">
                                            {activeDealBreakers.map((item, i) => (
                                                <li key={i}>
                                                    <span className="font-medium">{item.label}:</span> {item.value}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RESULTS */}
                    {isResultsView && (
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            {displayed.length > 0 && (
                                <div className="flex items-center gap-3 mb-2 shrink-0">
                                    <h3 className="font-semibold text-gray-500">
                                        Possible Matches ({displayed.length})
                                    </h3>
                                    {level1Count > 0 && (
                                        <span className="text-xs text-gray-400">
                                            {level1Count} standard{level2Count > 0 ? `, ${level2Count} broader` : ""}
                                        </span>
                                    )}
                                </div>
                            )}

                            {displayed.length === 0 ? (
                                <div className="flex-1 min-h-[40vh] flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg">
                                    <Search className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        No matches found
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        No compatible matches for this client.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex-1 min-h-0 h-0 overflow-y-auto overscroll-contain p-1 pb-10 custom-scrollbar">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {displayed.map((match) => (
                                            <MatchCard
                                                key={match.client.id}
                                                match={match}
                                                isDismissing={dismissingId === match.client.id}
                                                onDismiss={handleDismiss}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

// ── Match Card ────────────────────────────────────────────────────────────────

interface MatchCardProps {
    match: DisplayedMatch;
    isDismissing: boolean;
    onDismiss: (match: DisplayedMatch, permanent: boolean) => void;
}

function MatchCard({ match, isDismissing, onDismiss }: MatchCardProps) {
    const { client, level } = match;

    return (
        <div className={`relative flex flex-col bg-gray-50 dark:bg-gray-900 p-3 shadow-sm transition-opacity ${isDismissing ? "opacity-40 pointer-events-none" : ""}`}>
            {level === 2 && (
                <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                    Broader match
                </span>
            )}

            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {client.photoUrl ? (
                        <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-sm font-semibold text-gray-400">{client.fullName.charAt(0)}</span>
                    )}
                </div>

                <div className="flex-1 min-w-0 pr-16">
                    <h3 className="font-semibold text-base">{client.fullName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                        {client.location || <span className="italic">Unknown Location</span>}
                        {" • "}
                        {client.dob ? `${calculateAge(client.dob)} y/o` : "—"}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        <p>Ethnicity: {Array.isArray(client.ethnicity) ? (client.ethnicity[0] || "—") : (client.ethnicity || "—")}</p>
                        <p>Hashkafa: {Array.isArray(client.religiousAffiliation) ? (client.religiousAffiliation[0] || "—") : (client.religiousAffiliation || "—")}</p>
                        <p>Learning: {Array.isArray(client.learningStatus) ? (client.learningStatus[0] || "—") : (client.learningStatus || "—")}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                    <button
                        onClick={() => onDismiss(match, true)}
                        disabled={isDismissing}
                        title="Not relevant — never suggest again"
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors border border-gray-200 dark:border-gray-700"
                    >
                        <X className="h-3 w-3" />
                        Not relevant
                    </button>
                    <button
                        onClick={() => onDismiss(match, false)}
                        disabled={isDismissing}
                        title="Suggest again in 1 month"
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors border border-gray-200 dark:border-gray-700"
                    >
                        <Clock className="h-3 w-3" />
                        Remind me later
                    </button>
                </div>
                <Link
                    href={`/clients/${client.id}?source=matching`}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline shrink-0"
                >
                    View <ChevronRight className="h-3 w-3" />
                </Link>
            </div>
        </div>
    );
}

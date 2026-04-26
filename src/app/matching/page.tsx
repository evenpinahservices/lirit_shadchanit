"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { findMatchesWithLevels, calculateAge } from "@/lib/matchingUtils";
import { CountryCode, getLocationCountry } from "@/lib/locationMapping";
import { getDismissedMatches, dismissMatch } from "@/actions/matching";
import { cn } from "@/lib/utils";
import {
    Heart, Sparkles, ChevronRight, Search, X, Clock,
    Shuffle, Users2, RefreshCw, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DisplayedMatch {
    client: Client;
    level: 1 | 2;
}

type Tier = "week" | "month" | "older";

interface FeedSlot {
    tier: Tier;
    seed: Client;       // the "featured" client in this slot
    match: Client | null; // their best match
    exiting: boolean;
    entering: boolean;
}

// ── Time-bucket helpers ────────────────────────────────────────────────────────

function parseDateStr(s: string): Date {
    if (!s) return new Date(0);
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(0) : d;
}

function getTier(createdAt: string): Tier {
    const d = parseDateStr(createdAt);
    const now = Date.now();
    const diff = now - d.getTime();
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const MONTH = 30 * 24 * 60 * 60 * 1000;
    if (diff <= WEEK) return "week";
    if (diff <= MONTH) return "month";
    return "older";
}

function pickRandom<T>(arr: T[], n: number, exclude: Set<string>, getId: (x: T) => string): T[] {
    const pool = arr.filter(x => !exclude.has(getId(x)));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

function getBestMatch(seed: Client, allClients: Client[]): Client | null {
    const { level1, level2 } = findMatchesWithLevels(seed, allClients, new Set());
    return level1[0] ?? level2[0] ?? null;
}

function buildFeed(allClients: Client[]): FeedSlot[] {
    const byTier: Record<Tier, Client[]> = { week: [], month: [], older: [] };
    for (const c of allClients) {
        if (!c.active && c.active !== undefined) continue;
        byTier[getTier(c.createdAt)].push(c);
    }

    const slots: FeedSlot[] = [];
    const usedIds = new Set<string>();

    const tiers: Tier[] = ["week", "month", "older"];
    for (const tier of tiers) {
        const pool = byTier[tier];
        const seeds = pickRandom(pool, 3, usedIds, c => c.id);
        for (const seed of seeds) {
            usedIds.add(seed.id);
            const bestMatch = getBestMatch(seed, allClients);
            slots.push({ tier, seed, match: bestMatch, exiting: false, entering: false });
        }
    }

    return slots;
}

const TIER_LABELS: Record<Tier, string> = {
    week: "Added this week",
    month: "Added this month",
    older: "Older clients",
};

const TIER_COLORS: Record<Tier, string> = {
    week: "text-green-600 dark:text-green-400",
    month: "text-blue-600 dark:text-blue-400",
    older: "text-gray-500 dark:text-gray-400",
};

// ── Discovery Feed ─────────────────────────────────────────────────────────────

function DiscoveryFeed({ allClients }: { allClients: Client[] }) {
    const [slots, setSlots] = useState<FeedSlot[]>(() => buildFeed(allClients));
    const [rebuilding, setRebuilding] = useState(false);
    const usedSeedIds = useRef<Set<string>>(new Set(slots.map(s => s.seed.id)));

    const rebuildFeed = () => {
        setRebuilding(true);
        setTimeout(() => {
            usedSeedIds.current = new Set();
            setSlots(buildFeed(allClients));
            setRebuilding(false);
        }, 300);
    };

    const handleNotNow = (slotIndex: number) => {
        const slot = slots[slotIndex];
        const tier = slot.tier;

        // Pick a replacement seed from same tier that hasn't been shown
        const byTier = allClients.filter(c => {
            if (!c.active && c.active !== undefined) return false;
            if (usedSeedIds.current.has(c.id)) return false;
            return getTier(c.createdAt) === tier;
        });

        const newSeed = byTier[Math.floor(Math.random() * byTier.length)] ?? null;

        // Animate out
        setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, exiting: true } : s));

        setTimeout(() => {
            if (!newSeed) {
                // No more replacements — just remove
                setSlots(prev => prev.filter((_, i) => i !== slotIndex));
                return;
            }
            usedSeedIds.current.add(newSeed.id);
            const newMatch = getBestMatch(newSeed, allClients);
            setSlots(prev => prev.map((s, i) =>
                i === slotIndex
                    ? { tier, seed: newSeed, match: newMatch, exiting: false, entering: true }
                    : s
            ));
            setTimeout(() => {
                setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, entering: false } : s));
            }, 50);
        }, 300);
    };

    const tierOrder: Tier[] = ["week", "month", "older"];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Suggested match pairs based on when clients joined.
                </p>
                <button
                    onClick={rebuildFeed}
                    disabled={rebuilding}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", rebuilding && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {tierOrder.map(tier => {
                const tierSlots = slots.map((s, i) => ({ ...s, _idx: i })).filter(s => s.tier === tier);
                if (tierSlots.length === 0) return null;
                return (
                    <div key={tier}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className={cn("text-xs font-bold uppercase tracking-wider", TIER_COLORS[tier])}>
                                {TIER_LABELS[tier]}
                            </span>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {tierSlots.map(slot => (
                                <FeedCard
                                    key={slot.seed.id}
                                    slot={slot}
                                    onNotNow={() => handleNotNow(slot._idx)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}

            {slots.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Shuffle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No more suggestions</p>
                    <button onClick={rebuildFeed} className="mt-2 text-sm text-red-600 hover:underline">Refresh feed</button>
                </div>
            )}
        </div>
    );
}

// ── Feed Card ──────────────────────────────────────────────────────────────────

function FeedCard({ slot, onNotNow }: { slot: FeedSlot & { _idx?: number }; onNotNow: () => void }) {
    const { seed, match, exiting, entering } = slot;

    return (
        <div className={cn(
            "flex flex-col bg-white dark:bg-gray-950 rounded-xl shadow-sm overflow-hidden transition-all duration-300",
            exiting && "opacity-0 scale-95 -translate-y-2",
            entering && "opacity-0 scale-95 translate-y-2",
            !exiting && !entering && "opacity-100 scale-100 translate-y-0"
        )}>
            {/* Two avatars */}
            <div className="flex items-center justify-around p-4 bg-gradient-to-b from-red-50/60 to-transparent dark:from-red-900/10">
                <MiniAvatar client={seed} />
                <div className="flex flex-col items-center gap-1">
                    <Heart className="h-5 w-5 text-red-400 fill-red-300" />
                    {match && (
                        <span className="text-[10px] text-gray-400 font-medium">
                            {Math.abs(calculateAge(seed.dob) - calculateAge(match.dob))}yr gap
                        </span>
                    )}
                </div>
                {match ? (
                    <MiniAvatar client={match} />
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Users2 className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                        </div>
                        <span className="text-[10px] text-gray-400">No match</span>
                    </div>
                )}
            </div>

            {/* Info row */}
            <div className="px-3 pb-1 flex justify-between text-[10px] text-gray-400 font-medium">
                <span>{seed.location || "—"}</span>
                {match && <span>{match.location || "—"}</span>}
            </div>
            <div className="px-3 pb-3 flex justify-between text-[10px] text-gray-400">
                <span className="truncate max-w-[45%]">{seed.ethnicity || ""}</span>
                {match && <span className="truncate max-w-[45%] text-right">{match.ethnicity || ""}</span>}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 dark:border-gray-800 flex">
                <button
                    onClick={onNotNow}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-r border-gray-100 dark:border-gray-800"
                >
                    <RefreshCw className="h-3 w-3" />
                    Not Now
                </button>
                {match ? (
                    <Link
                        href={`/compare?a=${seed.id}&b=${match.id}&back=/matching`}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <Heart className="h-3 w-3 fill-red-600" />
                        Show Match
                    </Link>
                ) : (
                    <span className="flex-1 flex items-center justify-center px-2 py-2.5 text-xs text-gray-300 dark:text-gray-600">
                        No match found
                    </span>
                )}
            </div>
        </div>
    );
}

function MiniAvatar({ client }: { client: Client }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                {client.photoUrl ? (
                    <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-base font-bold text-gray-300 dark:text-gray-600">{client.fullName.charAt(0)}</span>
                )}
            </div>
            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[70px] truncate">
                {client.fullName.split(" ")[0]}
            </span>
            <span className="text-[10px] text-gray-400">{calculateAge(client.dob)} y/o</span>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MatchingPage() {
    const { clients } = useClients();
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialClientId = searchParams.get("clientId") || "";
    const [tab, setTab] = useState<"discover" | "search">("discover");
    const [selectedClientId, setSelectedClientId] = useState(initialClientId);
    const [isResultsView, setIsResultsView] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Auto-switch to search tab if clientId is in URL
    useEffect(() => {
        if (initialClientId) setTab("search");
    }, []);

    const [poolL1, setPoolL1] = useState<Client[]>([]);
    const [poolL2, setPoolL2] = useState<Client[]>([]);
    const [displayed, setDisplayed] = useState<DisplayedMatch[]>([]);
    const [dismissingId, setDismissingId] = useState<string | null>(null);

    const clientOptions = clients.map((c) => ({
        label: `${c.fullName} (${c.gender})`,
        value: c.id,
    }));

    const selectedClient = clients.find((c) => c.id === selectedClientId);

    const handleMatch = async () => {
        if (!selectedClientId || !selectedClient) return;
        setIsLoading(true);
        try {
            const dismissed = await getDismissedMatches(selectedClientId);
            const dismissedIds = new Set(dismissed.map((d) => d.candidateId));
            const { level1, level2 } = findMatchesWithLevels(selectedClient, clients, dismissedIds);

            setPoolL1(level1);
            setPoolL2(level2);

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

    const handleDismiss = useCallback(
        async (match: DisplayedMatch, permanent: boolean) => {
            const candidateId = match.client.id;
            setDismissingId(candidateId);

            setDisplayed((prev) => {
                const next = prev.filter((m) => m.client.id !== candidateId);
                const shownIds = new Set(next.map((m) => m.client.id));
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

            {/* Tabs */}
            <div className="shrink-0 flex gap-1 border-b border-gray-200 dark:border-gray-800 px-1">
                <button
                    onClick={() => { setTab("discover"); handleReset(); }}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px",
                        tab === "discover"
                            ? "border-red-600 text-red-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    <Sparkles className="h-4 w-4" />
                    Discover
                </button>
                <button
                    onClick={() => setTab("search")}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px",
                        tab === "search"
                            ? "border-red-600 text-red-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    <Search className="h-4 w-4" />
                    Search
                </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-24 md:pb-0">

                {/* ── DISCOVER TAB ── */}
                {tab === "discover" && (
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1 pb-4">
                        {clients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <Sparkles className="h-10 w-10 mb-3 opacity-40" />
                                <p>Add clients to start discovering matches.</p>
                            </div>
                        ) : (
                            <DiscoveryFeed allClients={clients} />
                        )}
                    </div>
                )}

                {/* ── SEARCH TAB ── */}
                {tab === "search" && (
                    <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden flex-1">

                        {/* Client selector / compact header */}
                        <div className="shrink-0">
                            {!isResultsView ? (
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 shadow-sm flex flex-col">
                                    <h2 className="font-semibold mb-3">Select Client</h2>
                                    <div className="space-y-3">
                                        <SearchableSelect
                                            options={clientOptions}
                                            value={selectedClientId}
                                            onChange={(val) => { setSelectedClientId(val); setDisplayed([]); }}
                                            placeholder="Search by name..."
                                            className="w-full"
                                        />

                                        {selectedClient && (
                                            <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-md space-y-1">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">Matching based on deal breakers:</p>
                                                <ul className="list-disc pl-4 space-y-0.5">
                                                    {activeDealBreakers.length > 0 ? (
                                                        activeDealBreakers.map((item, i) => (
                                                            <li key={i}><span className="font-medium">{item.label}:</span> {item.value}</li>
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
                                                    <li key={i}><span className="font-medium">{item.label}:</span> {item.value}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Results */}
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
                                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No matches found</p>
                                        <p className="text-sm text-gray-500">No compatible matches for this client.</p>
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
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { findMatchesWithLevels, calculateAge } from "@/lib/matchingUtils";
import { CountryCode, getLocationCountry } from "@/lib/locationMapping";
import { getDismissedMatches, dismissMatch, restoreMatch } from "@/actions/matching";
import type { DismissedEntry } from "@/actions/matching";
import { cn } from "@/lib/utils";
import {
    Heart, Sparkles, Search, X, Clock, RefreshCw, Users2, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DisplayedMatch { client: Client; level: 1 | 2; }

type Tier = "week" | "month" | "older";

interface FeedSlot {
    id: string; // stable identity for keying
    tier: Tier;
    seed: Client;
    match: Client | null;
    visible: boolean;
}

// ── Time-bucket helpers ────────────────────────────────────────────────────────

function getTier(createdAt: string): Tier {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "older";
    const diff = Date.now() - d.getTime();
    if (diff <= 7 * 864e5) return "week";
    if (diff <= 30 * 864e5) return "month";
    return "older";
}

function pickRandom<T>(pool: T[], n: number): T[] {
    return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
}

function getBestMatch(seed: Client, allClients: Client[]): Client | null {
    const { level1, level2 } = findMatchesWithLevels(seed, allClients, new Set());
    return level1[0] ?? level2[0] ?? null;
}

function buildFeed(allClients: Client[]): FeedSlot[] {
    const active = allClients.filter(c => c.active !== false);
    const byTier: Record<Tier, Client[]> = { week: [], month: [], older: [] };
    for (const c of active) byTier[getTier(c.createdAt)].push(c);

    const usedIds = new Set<string>();
    const slotsByTier: Record<Tier, FeedSlot[]> = { week: [], month: [], older: [] };

    // First pass: pick up to 3 from each tier
    for (const tier of ["week", "month", "older"] as Tier[]) {
        const seeds = pickRandom(byTier[tier].filter(c => !usedIds.has(c.id)), 3);
        for (const seed of seeds) {
            usedIds.add(seed.id);
            slotsByTier[tier].push({ id: seed.id, tier, seed, match: getBestMatch(seed, active), visible: true });
        }
    }

    // Second pass: fill rows that have fewer than 3 using any remaining clients
    const remaining = active.filter(c => !usedIds.has(c.id)).sort(() => Math.random() - 0.5);
    let ri = 0;
    for (const tier of ["week", "month", "older"] as Tier[]) {
        while (slotsByTier[tier].length < 3 && ri < remaining.length) {
            const seed = remaining[ri++];
            usedIds.add(seed.id);
            slotsByTier[tier].push({ id: seed.id, tier, seed, match: getBestMatch(seed, active), visible: true });
        }
    }

    return [
        ...slotsByTier.week,
        ...slotsByTier.month,
        ...slotsByTier.older,
    ];
}

const TIER_LABELS: Record<Tier, string> = {
    week: "Added this week",
    month: "Added this month",
    older: "Older clients",
};
const TIER_COLORS: Record<Tier, string> = {
    week: "text-green-600 dark:text-green-400",
    month: "text-amber-600 dark:text-amber-400",
    older: "text-gray-500 dark:text-gray-400",
};

// ── Discovery Feed ─────────────────────────────────────────────────────────────

function DiscoveryFeed({ allClients }: { allClients: Client[] }) {
    const [slots, setSlots] = useState<FeedSlot[]>(() => buildFeed(allClients));
    const usedSeedIds = useRef(new Set(slots.map(s => s.seed.id)));

    const rebuildFeed = () => {
        setSlots(prev => prev.map(s => ({ ...s, visible: false })));
        setTimeout(() => {
            usedSeedIds.current = new Set();
            const next = buildFeed(allClients);
            setSlots(next);
        }, 280);
    };

    const handleNotNow = (slotId: string) => {
        const slot = slots.find(s => s.id === slotId);
        if (!slot) return;

        // Fade out
        setSlots(prev => prev.map(s => s.id === slotId ? { ...s, visible: false } : s));

        setTimeout(() => {
            const tier = slot.tier;
            const active = allClients.filter(c => c.active !== false);
            const candidate = active.find(c => !usedSeedIds.current.has(c.id) && getTier(c.createdAt) === tier)
                ?? active.find(c => !usedSeedIds.current.has(c.id)); // fallback: any tier

            if (!candidate) {
                setSlots(prev => prev.filter(s => s.id !== slotId));
                return;
            }

            usedSeedIds.current.add(candidate.id);
            const newSlot: FeedSlot = {
                id: candidate.id,
                tier,
                seed: candidate,
                match: getBestMatch(candidate, active),
                visible: false, // start invisible, then fade in
            };

            setSlots(prev => prev.map(s => s.id === slotId ? newSlot : s));
            // Tick: fade in
            setTimeout(() => setSlots(prev => prev.map(s => s.id === newSlot.id ? { ...s, visible: true } : s)), 30);
        }, 280);
    };

    const tierOrder: Tier[] = ["week", "month", "older"];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">Suggested pairs by when they joined.</p>
                <button
                    onClick={rebuildFeed}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                </button>
            </div>

            {tierOrder.map(tier => {
                const tierSlots = slots.filter(s => s.tier === tier);
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
                                    key={slot.id}
                                    slot={slot}
                                    onNotNow={() => handleNotNow(slot.id)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}

            {slots.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Users2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No suggestions available</p>
                    <button onClick={rebuildFeed} className="mt-2 text-sm text-red-600 hover:underline">Try refreshing</button>
                </div>
            )}
        </div>
    );
}

// ── Feed Card ──────────────────────────────────────────────────────────────────

function FeedCard({ slot, onNotNow }: { slot: FeedSlot; onNotNow: () => void }) {
    const { seed, match, visible } = slot;

    return (
        <div
            className="flex flex-col bg-white dark:bg-gray-950 rounded-xl shadow-sm overflow-hidden"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.25s ease" }}
        >
            {/* Two avatars */}
            <div className="flex items-center justify-around p-4 bg-gradient-to-b from-red-50/60 to-transparent dark:from-red-900/10">
                <MiniAvatar client={seed} />
                <div className="w-px self-stretch bg-gray-100 dark:bg-gray-800 mx-1" />
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

            <div className="px-3 pb-3 flex justify-between text-[10px] text-gray-400">
                <span className="truncate max-w-[48%]">{seed.location || "—"}</span>
                {match && <span className="truncate max-w-[48%] text-right">{match.location || "—"}</span>}
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
                    <span className="flex-1 flex items-center justify-center px-2 py-2.5 text-xs text-gray-300 dark:text-gray-600">No match found</span>
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

// ── Search Match Card ─────────────────────────────────────────────────────────
// Clicking navigates to compare; same style as feed card

interface SearchMatchCardProps {
    match: DisplayedMatch;
    selectedClientId: string;
    isDismissing: boolean;
    onDismiss: (match: DisplayedMatch, permanent: boolean) => void;
}

function SearchMatchCard({ match, selectedClientId, isDismissing, onDismiss }: SearchMatchCardProps) {
    const { client, level } = match;

    return (
        <div className={cn("flex flex-col bg-white dark:bg-gray-950 rounded-xl shadow-sm overflow-hidden transition-opacity", isDismissing && "opacity-40 pointer-events-none")}>
            {level === 2 && (
                <div className="px-3 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                        Broader match
                    </span>
                </div>
            )}

            {/* Avatar + info */}
            <Link
                href={`/compare?a=${selectedClientId}&b=${client.id}&back=/matching`}
                className="flex flex-col items-center p-4 bg-gradient-to-b from-red-50/40 to-transparent dark:from-red-900/10 hover:bg-red-50/60 dark:hover:bg-red-900/20 transition-colors"
            >
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden mb-2">
                    {client.photoUrl ? (
                        <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xl font-bold text-gray-300 dark:text-gray-600">{client.fullName.charAt(0)}</span>
                    )}
                </div>
                <h3 className="font-semibold text-sm text-center">{client.fullName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 text-center" dir="ltr">
                    {client.location || "—"} · {client.dob ? `${calculateAge(client.dob)} y/o` : "—"}
                </p>
                <div className="text-xs text-muted-foreground mt-1 text-center space-y-0.5">
                    <p>{client.ethnicity || "—"}</p>
                    <p>{(Array.isArray(client.religiousAffiliation) ? client.religiousAffiliation[0] : client.religiousAffiliation) || "—"}</p>
                </div>
                <span className="mt-2 text-xs font-semibold text-red-600">View Comparison →</span>
            </Link>

            {/* Dismiss actions */}
            <div className="border-t border-gray-100 dark:border-gray-800 flex">
                <button
                    onClick={() => onDismiss(match, true)}
                    disabled={isDismissing}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-r border-gray-100 dark:border-gray-800"
                >
                    <X className="h-3 w-3" />
                    Not relevant
                </button>
                <button
                    onClick={() => onDismiss(match, false)}
                    disabled={isDismissing}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                    <Clock className="h-3 w-3" />
                    Remind later
                </button>
            </div>
        </div>
    );
}

// ── Dismissed Section ─────────────────────────────────────────────────────────

interface DismissedSectionProps {
    clientId: string;
    dismissed: DismissedEntry[];
    allClients: Client[];
    onRestore: (candidateId: string) => void;
}

function DismissedSection({ clientId, dismissed, allClients, onRestore }: DismissedSectionProps) {
    const [open, setOpen] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    if (dismissed.length === 0) return null;

    const handleRestore = async (candidateId: string) => {
        setRestoringId(candidateId);
        try {
            await restoreMatch(clientId, candidateId);
            onRestore(candidateId);
        } finally {
            setRestoringId(null);
        }
    };

    const dismissed_clients = dismissed
        .map(d => ({ entry: d, client: allClients.find(c => c.id === d.candidateId) }))
        .filter(d => d.client);

    return (
        <div className="mt-4 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Snoozed / Not Relevant ({dismissed_clients.length})
                </span>
                <span className="text-xs text-gray-400">{open ? "Hide" : "Show"}</span>
            </button>
            {open && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {dismissed_clients.map(({ entry, client }) => (
                        <div key={entry.candidateId} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                {client!.photoUrl ? (
                                    <img src={client!.photoUrl} alt={client!.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm font-bold text-gray-400">{client!.fullName.charAt(0)}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{client!.fullName}</p>
                                <p className="text-xs text-gray-400">
                                    {entry.status === "snoozed" ? "Remind later" : "Not relevant"} · {client!.location || "—"}
                                </p>
                            </div>
                            <button
                                onClick={() => handleRestore(entry.candidateId)}
                                disabled={restoringId === entry.candidateId}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-gray-700 rounded-full transition-colors disabled:opacity-50"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Restore
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MatchingPage() {
    const { clients } = useClients();
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialClientId = searchParams.get("clientId") || "";
    const [tab, setTab] = useState<"discover" | "search">(initialClientId ? "search" : "discover");
    const [selectedClientId, setSelectedClientId] = useState(initialClientId);
    const [isResultsView, setIsResultsView] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [poolL1, setPoolL1] = useState<Client[]>([]);
    const [poolL2, setPoolL2] = useState<Client[]>([]);
    const [displayed, setDisplayed] = useState<DisplayedMatch[]>([]);
    const [dismissingId, setDismissingId] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState<DismissedEntry[]>([]);

    const clientOptions = clients.map(c => ({ label: `${c.fullName} (${c.gender})`, value: c.id }));
    const selectedClient = clients.find(c => c.id === selectedClientId);

    const handleMatch = async () => {
        if (!selectedClientId || !selectedClient) return;
        setIsLoading(true);
        try {
            const dismissedList = await getDismissedMatches(selectedClientId);
            setDismissed(dismissedList);
            const dismissedIds = new Set(dismissedList.map(d => d.candidateId));
            const { level1, level2 } = findMatchesWithLevels(selectedClient, clients, dismissedIds);

            setPoolL1(level1);
            setPoolL2(level2);

            const initial: DisplayedMatch[] = [];
            if (level1.length >= 5) {
                initial.push(...level1.slice(0, 10).map(c => ({ client: c, level: 1 as const })));
            } else {
                initial.push(...level1.map(c => ({ client: c, level: 1 as const })));
                const needed = Math.max(0, 5 - level1.length);
                initial.push(...level2.slice(0, needed).map(c => ({ client: c, level: 2 as const })));
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
        setDismissed([]);
        router.push("/matching");
    };

    const handleDismiss = useCallback(
        async (match: DisplayedMatch, permanent: boolean) => {
            const candidateId = match.client.id;
            setDismissingId(candidateId);

            setDisplayed(prev => {
                const next = prev.filter(m => m.client.id !== candidateId);
                const shownIds = new Set(next.map(m => m.client.id));
                const nextL1 = poolL1.find(c => !shownIds.has(c.id) && c.id !== candidateId);
                if (nextL1) return [...next, { client: nextL1, level: 1 as const }];
                const nextL2 = poolL2.find(c => !shownIds.has(c.id) && c.id !== candidateId);
                if (nextL2) return [...next, { client: nextL2, level: 2 as const }];
                return next;
            });

            // Add to dismissed list immediately so it shows in the snoozed section
            setDismissed(prev => [
                ...prev.filter(d => d.candidateId !== candidateId),
                { candidateId, status: permanent ? "rejected" : "snoozed" },
            ]);

            try {
                await dismissMatch(selectedClientId, candidateId, match.level, permanent);
            } finally {
                setDismissingId(null);
            }
        },
        [poolL1, poolL2, selectedClientId]
    );

    const handleRestore = (candidateId: string) => {
        // Remove from dismissed list; match will reappear on next generation
        setDismissed(prev => prev.filter(d => d.candidateId !== candidateId));
    };

    const getCountryName = (code: CountryCode): string => {
        const map: Record<CountryCode, string> = {
            IL: "Israel", US: "United States", UK: "England",
            FR: "France", BE: "Belgium", AU: "Australia", CA: "Canada", OTHER: "Other",
        };
        return map[code] || "Other";
    };

    const getActiveDealBreakers = (client: Client) => {
        const active: { label: string; value: string }[] = [];
        const isPass = (v: string) => { const n = v.toLowerCase().trim(); return n.includes("i don't mind") || n === "any" || n === ""; };
        const check = (label: string, val: string[] | string | undefined) => {
            if (!val) return;
            if (Array.isArray(val)) { if (val.length === 0 || val.some(isPass)) return; active.push({ label, value: val.join(", ") }); }
            else { if (!isPass(val)) active.push({ label, value: val }); }
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
    const level1Count = displayed.filter(m => m.level === 1).length;
    const level2Count = displayed.filter(m => m.level === 2).length;

    return (
        <div className="flex flex-col h-full overflow-hidden space-y-4">
            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Heart className="h-8 w-8 text-red-600 fill-red-600" />
                        Smart Matching
                    </h1>
                    <p className="text-muted-foreground hidden md:block">Find compatible matches based on community standards.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex gap-1 border-b border-gray-200 dark:border-gray-800 px-1">
                <button
                    onClick={() => { setTab("discover"); handleReset(); }}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px",
                        tab === "discover" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    <Sparkles className="h-4 w-4" />
                    Discover
                </button>
                <button
                    onClick={() => setTab("search")}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px",
                        tab === "search" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
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

                        {/* Selector / compact header */}
                        <div className="shrink-0">
                            {!isResultsView ? (
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 shadow-sm flex flex-col">
                                    <h2 className="font-semibold mb-3">Select Client</h2>
                                    <div className="space-y-3">
                                        <SearchableSelect
                                            options={clientOptions}
                                            value={selectedClientId}
                                            onChange={val => { setSelectedClientId(val); setDisplayed([]); }}
                                            placeholder="Search by name..."
                                            className="w-full"
                                        />
                                        {selectedClient && (
                                            <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-md space-y-1">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">Deal breakers:</p>
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
                                            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Sparkles className="h-4 w-4" />}
                                            Generate Matches
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-semibold text-lg">
                                                {selectedClient?.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <h2 className="font-bold text-gray-900 dark:text-gray-100">{selectedClient?.fullName}</h2>
                                                <p className="text-xs text-muted-foreground" dir="ltr">
                                                    {selectedClient?.location ?? <span className="italic">Unknown</span>} · {selectedClient && calculateAge(selectedClient.dob)} y/o
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={handleReset} className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            New Search
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Results */}
                        {isResultsView && (
                            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                                {displayed.length > 0 && (
                                    <div className="flex items-center gap-3 mb-2 shrink-0">
                                        <h3 className="font-semibold text-gray-500">Possible Matches ({displayed.length})</h3>
                                        {level1Count > 0 && (
                                            <span className="text-xs text-gray-400">
                                                {level1Count} standard{level2Count > 0 ? `, ${level2Count} broader` : ""}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 min-h-0 h-0 overflow-y-auto overscroll-contain p-1 pb-10 custom-scrollbar">
                                    {displayed.length === 0 ? (
                                        <div className="min-h-[30vh] flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg">
                                            <Search className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No matches found</p>
                                            <p className="text-sm text-gray-500">No compatible matches for this client.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {displayed.map(match => (
                                                <SearchMatchCard
                                                    key={match.client.id}
                                                    match={match}
                                                    selectedClientId={selectedClientId}
                                                    isDismissing={dismissingId === match.client.id}
                                                    onDismiss={handleDismiss}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <DismissedSection
                                        clientId={selectedClientId}
                                        dismissed={dismissed}
                                        allClients={clients}
                                        onRestore={handleRestore}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

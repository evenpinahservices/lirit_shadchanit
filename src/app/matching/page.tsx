"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { seedTestClient } from "@/actions/client";
import { Client, MOCK_CLIENTS } from "@/lib/mockData";
import { findMatches, calculateAge } from "@/lib/matchingUtils";
import { Heart, Sparkles, ArrowRight, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function MatchingPage() {
    const { clients } = useClients();
    const router = useRouter();

    const clientOptions = clients.map(client => ({
        label: `${client.fullName} (${client.gender})`,
        value: client.id
    }));

    // Force inclusions for testing
    const testClientMock = MOCK_CLIENTS.find(c => c.id === "test-long-list");
    const allClients = [...clients];
    if (testClientMock && !allClients.some(c => c.id === testClientMock.id)) {
        allClients.unshift(testClientMock); // Add to top for visibility
    }

    const searchParams = useSearchParams();
    const initialClientId = searchParams.get("clientId");

    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || "");
    const [matches, setMatches] = useState<Client[]>([]);

    // View State
    const [isResultsView, setIsResultsView] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(2);

    // Dynamic items per page based on viewport height
    useEffect(() => {
        const calculateItemsPerPage = () => {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            // Determine grid columns: 1 on mobile, 2 on sm (640px+), 3 on lg (1024px+)
            let columns = 1;
            if (viewportWidth >= 1024) columns = 3;
            else if (viewportWidth >= 640) columns = 2;

            // On tablet (md+), reserve less space since no bottom nav
            const isMdOrLarger = viewportWidth >= 768;
            // Header ~60px, client section ~150px, pagination ~50px, margins ~40px
            const reservedHeight = isMdOrLarger ? 280 : 400;
            const availableHeight = viewportHeight - reservedHeight;
            const itemHeight = 150; // Match cards are ~150px tall
            const rows = Math.max(1, Math.floor(availableHeight / itemHeight));
            // Calculate items as rows × columns for full grid utilization
            const calculated = rows * columns;
            setItemsPerPage(calculated);
        };
        calculateItemsPerPage();
        window.addEventListener('resize', calculateItemsPerPage);
        return () => window.removeEventListener('resize', calculateItemsPerPage);
    }, []);

    useEffect(() => {
        seedTestClient().catch(console.error);
    }, []);

    // Effect to handle deep linking
    useEffect(() => {
        if (initialClientId && clients.length > 0) {
            setSelectedClientId(initialClientId);
            const client = allClients.find(c => c.id === initialClientId);
            if (client) {
                const suggestions = findMatches(client, allClients);
                setMatches(suggestions);
                setIsResultsView(true);
            }
        }
    }, [initialClientId, clients]);

    const handleMatch = () => {
        if (!selectedClientId) return;

        const client = allClients.find((c) => c.id === selectedClientId);
        if (!client) return;

        const suggestions = findMatches(client, allClients); // Use shared logic

        setMatches(suggestions);
        setIsResultsView(true);
        setCurrentPage(1); // Reset to page 1

        // Update URL to reflect results state for tour
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", "results");
        if (selectedClientId) params.set("clientId", selectedClientId);
        router.push(`/matching?${params.toString()}`);
    };

    const handleReset = () => {
        setIsResultsView(false);
        setMatches([]);
        router.push("/matching");
    };

    // Pagination Logic
    const totalPages = Math.ceil(matches.length / itemsPerPage);
    const paginatedMatches = matches.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const selectedClient = allClients.find((c) => c.id === selectedClientId);

    const getActiveDealBreakers = (client: Client) => {
        const active: { label: string, value: string }[] = [];

        // Helper to normalize and check for "pass" values
        const isPass = (val: string) => {
            if (!val) return true;
            const normalized = val.toLowerCase().trim();
            return normalized.includes("i don't mind") || normalized === "any" || normalized === "";
        };

        const check = (label: string, val: string[] | string | undefined) => {
            if (!val) return;

            if (Array.isArray(val)) {
                if (val.length === 0) return;

                // If ANY value is "I don't mind" (or similar), we assume it overrides others and hides the constraint
                const hasPass = val.some(v => isPass(v));
                if (!hasPass) {
                    active.push({ label, value: val.join(", ") });
                }
            } else {
                if (!isPass(val)) {
                    active.push({ label, value: val });
                }
            }
        };

        check("Age Gap", client.ageGapPreference);

        if (client.willingToRelocate && client.willingToRelocate !== "Yes" && !isPass(client.willingToRelocate)) {
            active.push({ label: "Relocation", value: "Check compatibility" });
        }

        check("Hashkafa", client.preferredHashkafos);
        check("Ethnicity", client.preferredEthnicities);
        check("Learning Status", client.preferredLearningStatus);
        check("Head Covering", client.preferredHeadCovering);

        return active;
    };

    const activeDealBreakers = selectedClient ? getActiveDealBreakers(selectedClient) : [];

    return (
        <div id="matching-page-root" className="flex flex-col h-full overflow-hidden space-y-4">
            <div className="shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Smart Matching</h1>
                    <p className="text-muted-foreground">Find compatible matches based on strict deal-breakers.</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-24 md:pb-0 relative">
                <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">

                    {/* SEARCH / HEADER SECTION */}
                    <div className="shrink-0 min-h-0">
                        {!isResultsView ? (
                            // FULL SEARCH CARD
                            <div className="rounded-xl border bg-white dark:bg-gray-950 p-4 shadow-sm flex flex-col">
                                <h2 className="font-semibold mb-3 shrink-0">Select Client</h2>
                                <div className="space-y-3 flex flex-col">
                                    <div id="tour-matching-search">
                                        <SearchableSelect
                                            options={clientOptions}
                                            value={selectedClientId}
                                            onChange={(val) => {
                                                setSelectedClientId(val);
                                                setMatches([]);
                                            }}
                                            placeholder="Search by name..."
                                            className="w-full"
                                        />
                                    </div>

                                    {selectedClient && (
                                        <div className="text-sm text-muted-foreground space-y-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Matching based on deal breakers:</p>
                                            <ul className="list-disc pl-4 space-y-0.5">
                                                {activeDealBreakers.length > 0 ? (
                                                    activeDealBreakers.map((item, idx) => (
                                                        <li key={idx}>
                                                            <span className="font-medium">{item.label}:</span> {item.value}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="list-none text-gray-500 italic -ml-4">No specific deal breakers.</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleMatch}
                                        disabled={!selectedClientId}
                                        className="w-full flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Generate Matches
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // COMPACT HEADER (MINIMIZED)
                            <div className="rounded-xl border bg-white dark:bg-gray-950 p-4 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-semibold text-lg">
                                        {selectedClient?.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-900 dark:text-gray-100">{selectedClient?.fullName}</h2>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedClient && calculateAge(selectedClient.dob)} y/o • {selectedClient?.location}
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
                        )}
                    </div>

                    {/* RESULTS SECTION */}
                    {isResultsView && (
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-2 shrink-0">
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                                    Possible Matches ({matches.length})
                                </h3>
                            </div>

                            {matches.length === 0 ? (
                                <div id="tour-matching-results" className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground border rounded-xl bg-gray-50 dark:bg-gray-900/50">
                                    <p>No matches found matching the strict criteria.</p>
                                    <button onClick={handleReset} className="mt-2 text-red-600 hover:underline">Try another client</button>
                                </div>
                            ) : (
                                <div className="flex-1 min-h-0 overflow-y-auto p-1 pb-20 md:pb-0">
                                    <div id="tour-matching-results-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {paginatedMatches.map((match) => (
                                            <Link
                                                key={match.id}
                                                href={`/clients/${match.id}?source=matching`}
                                                className="group relative flex flex-col justify-between rounded-xl border bg-white dark:bg-gray-950 p-4 shadow-sm hover:shadow-md transition-all hover:border-red-200 dark:hover:border-red-900"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-semibold text-base group-hover:text-red-600 transition-colors">{match.fullName}</h3>
                                                            <p className="text-xs text-muted-foreground">{match.location} • {calculateAge(match.dob)} yo</p>
                                                        </div>
                                                        <div className="rounded-full bg-green-100 p-1.5 text-green-600">
                                                            <Check className="h-3 w-3" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Ethnicity:</span>
                                                            <span className="text-right truncate max-w-[7.5rem]">{Array.isArray(match.ethnicity) ? match.ethnicity.join(", ") : match.ethnicity}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Hashkafa:</span>
                                                            <span className="text-right truncate max-w-[7.5rem]">{Array.isArray(match.religiousAffiliation) ? match.religiousAffiliation[0] : match.religiousAffiliation}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Learning:</span>
                                                            <span className="text-right truncate max-w-[7.5rem]">{Array.isArray(match.learningStatus) ? match.learningStatus[0] : match.learningStatus}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-3 border-t flex items-center justify-end">
                                                    <span className="text-xs font-medium text-red-600 group-hover:underline flex items-center gap-1">
                                                        View Profile <ArrowRight className="h-3 w-3" />
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pagination Footer - Only show if valid results */}
                            {matches.length > 0 && totalPages > 1 && (
                                <div className="shrink-0 pt-2 flex items-center justify-between fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] px-4 py-2 bg-white dark:bg-gray-950 z-20 md:static md:p-0 md:pt-2 md:bg-transparent shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:shadow-none">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Prev
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Default state illustration if not searching */}
                    {!isResultsView && (
                        <div className="flex-1 flex items-center justify-center p-6 text-center border-2 border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex flex-col items-center gap-2">
                                <Heart className="h-8 w-8 text-gray-300" />
                                <p className="text-muted-foreground font-medium text-sm">Select a client above to start matching</p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

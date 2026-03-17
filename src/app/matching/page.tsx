"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { findMatches, calculateAge } from "@/lib/matchingUtils";
import { CountryCode, getLocationCountry } from "@/lib/locationMapping";
import { Heart, Sparkles, ArrowRight, Check, X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ItemsPerPageSelector } from "@/components/ui/ItemsPerPageSelector";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

export default function MatchingPage() {
    const { clients } = useClients();
    const router = useRouter();

    const clientOptions = clients.map(client => ({
        label: `${client.fullName} (${client.gender})`,
        value: client.id
    }));

    const allClients = [...clients];

    const searchParams = useSearchParams();
    const initialClientId = searchParams.get("clientId");
    const viewParam = searchParams.get("view");
    const isDeepLinkToResults = !!(initialClientId && viewParam === "results");

    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || "");
    const [matches, setMatches] = useState<Client[]>([]);

    // View State: start in results view when landing with ?clientId=...&view=results to avoid flash of "Select Client"
    const [isResultsView, setIsResultsView] = useState(isDeepLinkToResults);
    const [hasProcessedUrlParams, setHasProcessedUrlParams] = useState(!isDeepLinkToResults);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number | "all">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("itemsPerPage");
            if (saved) {
                if (saved === "all") return "all";
                const num = parseInt(saved, 10);
                if (!isNaN(num)) return num;
            }
        }
        return "all";
    });


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
            setHasProcessedUrlParams(true);
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
    const effectiveItemsPerPage = itemsPerPage === "all" ? matches.length : itemsPerPage;
    const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(matches.length / itemsPerPage);
    const paginatedMatches = matches.slice(
        (currentPage - 1) * effectiveItemsPerPage,
        currentPage * effectiveItemsPerPage
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleItemsPerPageChange = (value: number | "all") => {
        setItemsPerPage(value);
        setCurrentPage(1); // Reset to first page when changing items per page
        // Save to localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("itemsPerPage", value === "all" ? "all" : value.toString());
        }
    };

    // Swipe navigation for pagination
    const swipeRef = useSwipeNavigation({
        onSwipeLeft: () => {
            // Swipe left = next page
            if (currentPage < totalPages) {
                handlePageChange(currentPage + 1);
            }
        },
        onSwipeRight: () => {
            // Swipe right = previous page
            if (currentPage > 1) {
                handlePageChange(currentPage - 1);
            }
        },
        enabled: isResultsView && matches.length > 0 && totalPages > 1, // Only enable when showing results with multiple pages
    });

    const selectedClient = allClients.find((c) => c.id === selectedClientId);

    // Helper function to convert country code to readable country name
    const getCountryName = (countryCode: CountryCode): string => {
        const countryMap: Record<CountryCode, string> = {
            "IL": "Israel",
            "US": "United States",
            "UK": "England",
            "FR": "France",
            "BE": "Belgium",
            "AU": "Australia",
            "CA": "Canada",
            "OTHER": "Other"
        };
        return countryMap[countryCode] || "Other";
    };

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
            // Get the country from the client's location
            const countryCode = client.location ? getLocationCountry(client.location) : "OTHER";
            const countryName = getCountryName(countryCode);
            active.push({ label: "Location", value: `${countryName} only` });
        }

        check("Hashkafa", client.preferredHashkafos);
        check("Ethnicity", client.preferredEthnicities);
        check("Learning status (in husband)", client.preferredLearningStatus);
        check("Head covering (in wife)", client.preferredHeadCovering);

        return active;
    };

    const activeDealBreakers = selectedClient ? getActiveDealBreakers(selectedClient) : [];

    return (
        <div id="matching-page-root" className="flex flex-col h-full overflow-hidden space-y-4">
            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Heart className="h-8 w-8 text-red-600 fill-red-600" />
                        Smart Matching
                    </h1>
                    <p className="text-muted-foreground hidden md:block">Find compatible matches based on strict deal-breakers.</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-24 md:pb-0 relative">
                <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden flex-1">

                    {/* SEARCH / HEADER SECTION */}
                    <div className="shrink-0 min-h-0">
                        {!isResultsView ? (
                            // FULL SEARCH CARD
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 shadow-sm flex flex-col">
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
                                        className="w-full flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Generate Matches
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // COMPACT HEADER (MINIMIZED)
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-semibold text-lg">
                                            {selectedClient?.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-gray-900 dark:text-gray-100">{selectedClient?.fullName}</h2>
                                            <p className="text-xs text-muted-foreground" dir="ltr">
                                                {selectedClient?.location ? (
                                                    <>{selectedClient.location} • {selectedClient && calculateAge(selectedClient.dob)} y/o</>
                                                ) : (
                                                    <><span className="italic">Unknown Location</span> • {selectedClient && calculateAge(selectedClient.dob)} y/o</>
                                                )}
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
                                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Deal Breakers:</p>
                                        <ul className="list-disc pl-4 space-y-0.5">
                                            {activeDealBreakers.map((item, idx) => (
                                                <li key={idx}>
                                                    <span className="font-medium">{item.label}:</span> {item.value}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RESULTS SECTION */}
                    {isResultsView && (
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            {matches.length > 0 && (
                                <div className="flex items-center justify-between mb-2 shrink-0">
                                    <h3 className="font-semibold text-gray-500 dark:text-gray-500">
                                        Possible Matches ({matches.length})
                                    </h3>
                                </div>
                            )}

                            {matches.length === 0 ? (
                                <div id="tour-matching-results" className="flex-1 min-h-[40vh] flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg">
                                    {selectedClientId && !hasProcessedUrlParams ? (
                                        <>
                                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-red-600 border-t-transparent mx-auto mb-4" />
                                            <p className="text-sm text-muted-foreground">Loading matches...</p>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                No matches found
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-500">
                                                No matches found matching the strict criteria. Try another client.
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div 
                                    ref={swipeRef}
                                    className="flex-1 min-h-0 h-0 overflow-y-auto overscroll-contain p-1 pb-28 md:pb-6 custom-scrollbar"
                                >
                                    <div id="tour-matching-results-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {paginatedMatches.map((match) => (
                                            <Link
                                                key={match.id}
                                                href={`/clients/${match.id}?source=matching`}
                                                className="group relative flex flex-col bg-gray-50 dark:bg-gray-900 p-3 shadow-sm hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                                        {match.photoUrl ? (
                                                            <img src={match.photoUrl} alt={match.fullName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-gray-400">
                                                                {match.fullName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-semibold text-base group-hover:text-red-600 transition-colors">{match.fullName}</h3>
                                                                <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                                                                    {match.location || <span className="italic">Unknown Location</span>} • {match.dob ? `${calculateAge(match.dob)} y/o` : "—"}
                                                                </p>
                                                                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                                                                    <p>Ethnicity: {Array.isArray(match.ethnicity) ? (match.ethnicity.length > 0 ? match.ethnicity.join(", ") : "—") : (match.ethnicity || "—")}</p>
                                                                    <p>Hashkafa: {Array.isArray(match.religiousAffiliation) ? (match.religiousAffiliation.length > 0 ? match.religiousAffiliation[0] : "—") : (match.religiousAffiliation || "—")}</p>
                                                                    <p>Learning: {Array.isArray(match.learningStatus) ? (match.learningStatus.length > 0 ? match.learningStatus[0] : "—") : (match.learningStatus || "—")}</p>
                                                                </div>
                                                                <div className="mt-2 flex items-center justify-end">
                                                                    <span className="text-xs font-medium text-red-600 group-hover:underline flex items-center gap-1">
                                                                        View Profile <ArrowRight className="h-3 w-3" />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="rounded-full bg-green-100 p-1.5 text-green-600 shrink-0">
                                                                <Check className="h-3 w-3" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pagination Footer - Only show if valid results */}
                            {matches.length > 0 && (
                                <div className="shrink-0 pt-2 pb-4 flex items-center justify-between gap-2 fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] px-2 md:px-4 py-2 bg-white dark:bg-gray-950 z-20 md:static md:p-0 md:pt-2 md:pb-4 md:bg-transparent shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:shadow-none">
                                    <ItemsPerPageSelector
                                        value={itemsPerPage}
                                        onChange={handleItemsPerPageChange}
                                        totalItems={matches.length}
                                    />
                                    {totalPages > 1 && (
                                        <>
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                                style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                                            >
                                                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                                                <span className="hidden sm:inline">Prev</span>
                                            </button>
                                            <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
                                            >
                                                <span className="hidden sm:inline">Next</span>
                                                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}


                </div>
            </div>
        </div>
    );
}

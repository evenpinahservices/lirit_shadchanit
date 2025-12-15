"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { seedTestClient } from "@/actions/client";
import { Client, MOCK_CLIENTS } from "@/lib/mockData";
import { findMatches, calculateAge } from "@/lib/matchingUtils";
import { Heart, Sparkles, ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function MatchingPage() {
    const { clients } = useClients();

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
    const [hasSearched, setHasSearched] = useState(false);

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
                setHasSearched(true);
            }
        }
    }, [initialClientId, clients]);

    const handleMatch = () => {
        if (!selectedClientId) return;

        const client = allClients.find((c) => c.id === selectedClientId);
        if (!client) return;

        const suggestions = findMatches(client, allClients); // Use shared logic

        setMatches(suggestions);
        setHasSearched(true);
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
        <div className="flex flex-col h-full overflow-hidden space-y-4">
            <div className="shrink-0">
                <h1 className="text-3xl font-bold tracking-tight">Smart Matching</h1>
                <p className="text-muted-foreground">Find compatible matches based on strict deal-breakers.</p>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-24 md:pb-0">
                <div className="flex flex-col gap-4 h-full">

                    {/* Search Section - Flexible Height that shrinks internally when pressed */}
                    <div className="flex flex-col shrink min-h-0">
                        <div className="rounded-xl border bg-white dark:bg-gray-950 p-4 shadow-sm flex flex-col max-h-full">
                            <h2 className="font-semibold mb-3 shrink-0">Select Client</h2>
                            <div className="space-y-3 flex flex-col min-h-0">
                                <SearchableSelect
                                    options={clientOptions}
                                    value={selectedClientId}
                                    onChange={(val) => {
                                        setSelectedClientId(val);
                                        setHasSearched(false);
                                        setMatches([]);
                                    }}
                                    placeholder="Search by name..."
                                    className="w-full shrink-0"
                                />
                                placeholder="Search by name..."
                                className="w-full shrink-0"
                                />

                                {selectedClient && (
                                    <div className="text-sm text-muted-foreground space-y-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-md flex flex-col min-h-0 shrink overflow-hidden">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1 shrink-0">Matching based on deal breakers:</p>
                                        <div className="overflow-y-auto custom-scrollbar min-h-0 shrink text-left">
                                            {activeDealBreakers.length > 0 ? (
                                                <ul className="list-disc pl-4 space-y-0.5">
                                                    {activeDealBreakers.map((item, idx) => (
                                                        <li key={idx}>
                                                            <span className="font-medium">{item.label}:</span> {item.value}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-500 italic pl-1">No deal breakers specified.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleMatch}
                                    disabled={!selectedClientId}
                                    className="shrink-0 w-full flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Generate Matches
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Section - Pushed to bottom, Fixed Height (or min-height) */}
                    <div className="shrink-0 min-h-0 overflow-y-auto custom-scrollbar">
                        {!hasSearched ? (
                            <div className="flex items-center justify-center p-6 text-center border-2 border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-900/50 h-60">
                                <div className="flex flex-col items-center gap-2">
                                    <Heart className="h-8 w-8 text-gray-300" />
                                    <p className="text-muted-foreground font-medium text-sm">Select a client above to start matching</p>
                                </div>
                            </div>
                        ) : matches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-60 text-center text-muted-foreground border rounded-xl bg-gray-50 dark:bg-gray-900/50">
                                <p>No matches found matching the strict criteria.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-24 md:pb-2">
                                {matches.map((match) => (
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
                                                    <span className="text-right truncate max-w-[120px]">{Array.isArray(match.ethnicity) ? match.ethnicity.join(", ") : match.ethnicity}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Hashkafa:</span>
                                                    <span className="text-right truncate max-w-[120px]">{Array.isArray(match.religiousAffiliation) ? match.religiousAffiliation[0] : match.religiousAffiliation}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Learning:</span>
                                                    <span className="text-right truncate max-w-[120px]">{Array.isArray(match.learningStatus) ? match.learningStatus[0] : match.learningStatus}</span>
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

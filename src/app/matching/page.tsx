"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { findMatches, calculateAge } from "@/lib/matchingUtils";
import { Heart, Sparkles, ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";

export default function MatchingPage() {
    const { clients } = useClients();
    const searchParams = useSearchParams();
    const initialClientId = searchParams.get("clientId");

    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || "");
    const [matches, setMatches] = useState<Client[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Effect to handle deep linking
    useEffect(() => {
        if (initialClientId && clients.length > 0) {
            setSelectedClientId(initialClientId);
            const client = clients.find(c => c.id === initialClientId);
            if (client) {
                const suggestions = findMatches(client, clients);
                setMatches(suggestions);
                setHasSearched(true);
            }
        }
    }, [initialClientId, clients]);

    const handleMatch = () => {
        if (!selectedClientId) return;

        const client = clients.find((c) => c.id === selectedClientId);
        if (!client) return;

        const suggestions = findMatches(client, clients); // Use shared logic

        setMatches(suggestions);
        setHasSearched(true);
    };

    const selectedClient = clients.find((c) => c.id === selectedClientId);

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
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Smart Matching</h1>
                <p className="text-muted-foreground">Find compatible matches based on strict deal-breakers.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-[300px_1fr]">
                <div className="space-y-4">
                    <div className="rounded-xl border bg-white dark:bg-gray-950 p-6 shadow-sm">
                        <h2 className="font-semibold mb-4">Select Client</h2>
                        <div className="space-y-4">
                            <select
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                                value={selectedClientId}
                                onChange={(e) => {
                                    setSelectedClientId(e.target.value);
                                    setHasSearched(false);
                                    setMatches([]);
                                }}
                            >
                                <option value="">Select a client...</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.fullName} ({client.gender})
                                    </option>
                                ))}
                            </select>

                            {selectedClient && (
                                <div className="text-sm text-muted-foreground space-y-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Matching based on deal breakers:</p>
                                    {activeDealBreakers.length > 0 ? (
                                        <ul className="list-disc pl-4 space-y-1">
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
                </div>

                <div className="space-y-6">
                    {!hasSearched ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                            <Heart className="h-12 w-12 mb-4 text-gray-300" />
                            <p>Select a client and click "Generate Matches" to see suggestions.</p>
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border rounded-xl bg-gray-50 dark:bg-gray-900/50">
                            <p>No matches found matching the strict criteria.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {matches.map((match) => (
                                <Link
                                    key={match.id}
                                    href={`/clients/${match.id}?source=matching`}
                                    className="group relative flex flex-col justify-between rounded-xl border bg-white dark:bg-gray-950 p-6 shadow-sm hover:shadow-md transition-all hover:border-red-200 dark:hover:border-red-900"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-lg group-hover:text-red-600 transition-colors">{match.fullName}</h3>
                                                <p className="text-sm text-muted-foreground">{match.location} • {calculateAge(match.dob)} yo</p>
                                            </div>
                                            <div className="rounded-full bg-green-100 p-2 text-green-600">
                                                <Check className="h-4 w-4" />
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Ethnicity:</span>
                                                <span>{Array.isArray(match.ethnicity) ? match.ethnicity.join(", ") : match.ethnicity}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Hashkafa:</span>
                                                <span>{Array.isArray(match.religiousAffiliation) ? match.religiousAffiliation[0] : match.religiousAffiliation}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Learning Status:</span>
                                                <span>{Array.isArray(match.learningStatus) ? match.learningStatus[0] : match.learningStatus}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t flex items-center justify-end">
                                        <span className="text-sm font-medium text-red-600 group-hover:underline flex items-center gap-1">
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
    );
}

"use client";

import React, { useEffect, useState } from "react";
import { X, Sparkles, MapPin, Calendar, Heart } from "lucide-react";
import { Client } from "@/lib/mockData";
import { calculateAge } from "@/lib/matchingUtils";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AutomaticMatchingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onViewAll: () => void;
    matches: Client[];
    newClient: Client;
}

export function AutomaticMatchingModal({
    isOpen,
    onClose,
    onViewAll,
    matches,
    newClient,
}: AutomaticMatchingModalProps) {
    const [topMatches, setTopMatches] = useState<Client[]>([]);

    useEffect(() => {
        if (isOpen && matches.length > 0) {
            // Randomize and pick top 3
            const shuffled = [...matches].sort(() => 0.5 - Math.random());
            setTopMatches(shuffled.slice(0, 3));
        }
    }, [isOpen, matches]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 pb-2 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    Matches Found!
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    We found {matches.length} potential matches for <span className="font-medium text-gray-900 dark:text-gray-200">{newClient.fullName}</span>.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-4 overflow-y-auto">
                    {matches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed">
                            <Heart className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                            <p>No matches found yet based on the criteria.</p>
                            <p className="text-xs">Adjusting preferences might help!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-3">
                            {topMatches.map((match) => (
                                <div key={match.id} className="group flex items-center gap-4 p-3 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all hover:border-red-200 dark:hover:border-red-900 bg-white dark:bg-gray-900">
                                    {/* Small Circular Image */}
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                        {match.photoUrl ? (
                                            <Image
                                                src={match.photoUrl}
                                                alt={match.fullName}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-gray-400 dark:text-gray-500">
                                                {match.fullName.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100" title={match.fullName}>
                                            {match.fullName}
                                        </h4>
                                        <div className="flex items-center text-xs text-muted-foreground gap-3 mt-0.5">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{calculateAge(match.dob)} years old</span>
                                            </div>
                                            <div className="flex items-center gap-1 truncate">
                                                <MapPin className="h-3 w-3" />
                                                <span className="truncate">{match.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {matches.length > 3 && (
                        <p className="text-center text-xs text-muted-foreground mt-4 italic">
                            + {matches.length - 3} more matches available
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Skip & Go to Clients
                    </button>
                    {matches.length > 0 && (
                        <button
                            onClick={onViewAll}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            See All {matches.length} Matches
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

"use client";

import { useClients } from "@/context/ClientContext";
import { useState, useEffect } from "react";
import { User as UserIcon, ArrowRight, Clock, Hourglass } from "lucide-react";
import Link from "next/link";
import { getPendingClients } from "@/actions/pendingClient";

interface PendingClient {
    id: string;
    fullName: string;
    dob: string;
    location: string;
    occupationTitle: string;
    photoUrl?: string;
    gender: "Male" | "Female";
    submittedAt: string;
}

export default function DashboardAnalytics() {
    const { clients, isLoading } = useClients();

    const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => (
        <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
    const [pendingClients, setPendingClients] = useState<PendingClient[]>([]);
    const [totalPendingCount, setTotalPendingCount] = useState(0);
    const [isLoadingPending, setIsLoadingPending] = useState(true);

    // Calculate Total Clients
    const totalClients = clients.length;

    // Calculate Gender Distribution
    const genderCounts = clients.reduce((acc, client) => {
        const gender = client.gender || "Other";
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalBoys = genderCounts["Male"] || 0;
    const totalGirls = genderCounts["Female"] || 0;

    // Calculate Age
    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    // Get clients added in the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const clientsAddedLastWeek = clients.filter((client) => {
        if (!client.createdAt) return false;
        const createdDate = new Date(client.createdAt);
        return createdDate >= oneWeekAgo;
    });

    // Get recent clients (last 2, sorted by createdAt)
    const recentClients = [...clientsAddedLastWeek]
        .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, 2);

    // Load pending clients
    useEffect(() => {
        const loadPendingClients = async () => {
            try {
                setIsLoadingPending(true);
                const pending = await getPendingClients();
                setTotalPendingCount(pending.length);
                setPendingClients(pending.slice(0, 2) as PendingClient[]);
            } catch (error) {
                console.error("Failed to load pending clients:", error);
            } finally {
                setIsLoadingPending(false);
            }
        };

        loadPendingClients();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col h-full space-y-4">
                <div className="shrink-0 bg-card text-card-foreground shadow p-0 pb-4">
                    <div className="text-base font-medium text-muted-foreground mb-2">Total Clients</div>
                    <span className="flex items-center gap-1.5 text-2xl font-bold text-muted-foreground">
                        <Spinner className="h-5 w-5" />
                        Loading
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Total Clients Card - Fixed Top */}
            <div className="shrink-0 bg-card text-card-foreground shadow p-0 pb-4">
                <div className="text-base font-medium text-muted-foreground mb-2">
                    Total Clients
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold">{totalClients}</div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-gray-100">
                            <UserIcon className="h-4 w-4" />
                            <span className="font-medium">{totalBoys}</span>
                            <span className="text-xs">Boys</span>
                        </span>
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                            <UserIcon className="h-4 w-4" />
                            <span className="font-medium">{totalGirls}</span>
                            <span className="text-xs">Girls</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Recent Activity Area */}
            <div className="flex-1 min-h-0 flex flex-col bg-card text-card-foreground px-4 pb-4 pt-0 overflow-hidden">
                <div className="mb-4 text-lg font-medium">Recent Activity</div>
                
                <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                    {/* Recently Added Profiles */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Added Profiles in Last Week ({clientsAddedLastWeek.length})</span>
                        </div>
                        {recentClients.length > 0 ? (
                            <div className="grid gap-2 grid-cols-1">
                                {recentClients.map((client) => (
                                    <Link
                                        key={client.id}
                                        href={`/clients/${client.id}`}
                                        className="group relative flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-3 shadow-sm hover:shadow-md transition-all rounded"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                            {client.photoUrl ? (
                                                <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm group-hover:text-red-600 transition-colors truncate">{client.fullName}</h3>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {calculateAge(client.dob) !== null ? `${calculateAge(client.dob)} y/o` : 'Age N/A'} • {client.location}
                                            </p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-red-600 transition-colors shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground italic">No profiles added in the last week</div>
                        )}
                    </div>

                    {/* Divider between sections */}
                    {(recentClients.length > 0 || clientsAddedLastWeek.length === 0) && (isLoadingPending || pendingClients.length > 0) && (
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    )}

                    {/* Pending Profiles */}
                    {isLoadingPending ? (
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                                <Hourglass className="h-4 w-4" />
                                <span>Pending Profiles{totalPendingCount > 0 ? ` (${totalPendingCount})` : ''}</span>
                            </div>
                            <div className="flex items-center justify-center py-8">
                                <div className="text-sm text-muted-foreground">Loading pending profiles...</div>
                            </div>
                        </div>
                    ) : pendingClients.length > 0 ? (
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                                <Hourglass className="h-4 w-4" />
                                <span>Pending Profiles ({totalPendingCount})</span>
                            </div>
                            <div className="grid gap-2 grid-cols-1">
                                {pendingClients.map((client) => (
                                    <Link
                                        key={client.id}
                                        href={`/inbox/${client.id}`}
                                        className="group relative flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-3 shadow-sm hover:shadow-md transition-all rounded border-l-2 border-yellow-500"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                            {client.photoUrl ? (
                                                <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm group-hover:text-red-600 transition-colors truncate">{client.fullName}</h3>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {calculateAge(client.dob) !== null ? `${calculateAge(client.dob)} y/o` : 'Age N/A'} • {client.location}
                                            </p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-red-600 transition-colors shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        recentClients.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                                    <Hourglass className="h-4 w-4" />
                                    <span>Pending Profiles ({totalPendingCount})</span>
                                </div>
                                <div className="text-sm text-muted-foreground italic">No pending profiles</div>
                            </div>
                        )
                    )}

                    {recentClients.length === 0 && !isLoadingPending && pendingClients.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No recent activity
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

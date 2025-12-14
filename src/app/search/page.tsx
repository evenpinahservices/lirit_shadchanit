"use client";

import { useState, useEffect } from "react";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { Search, MapPin, Briefcase, Filter } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SearchPage() {
    const { clients, isLoading } = useClients();
    const [filteredClients, setFilteredClients] = useState<Client[]>(clients);

    // Filters
    const [keyword, setKeyword] = useState("");
    const [gender, setGender] = useState<string>("All");
    const [location, setLocation] = useState("");

    // New Filters
    const [minAge, setMinAge] = useState("");
    const [maxAge, setMaxAge] = useState("");
    const [minHeight, setMinHeight] = useState("");
    const [maxHeight, setMaxHeight] = useState("");

    const [religiosity, setReligiosity] = useState<string[]>([]);
    const [maritalStatus, setMaritalStatus] = useState<string[]>([]);
    const [ethnicity, setEthnicity] = useState<string[]>([]);

    // Options
    const religiosityOptions = ["Dati Leumi", "Masorti", "Chareidi", "Dati", "Secular"];
    const maritalStatusOptions = ["Single", "Divorced", "Widowed"];
    const ethnicityOptions = ["Ashkenazi", "Sephardi", "Mizrachi", "Ethiopian", "Yemenite", "Convert", "Any"];

    const toggleFilter = (item: string, current: string[], set: (val: string[]) => void) => {
        if (current.includes(item)) {
            set(current.filter(i => i !== item));
        } else {
            set([...current, item]);
        }
    };

    const calculateAge = (dob: string) => {
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    useEffect(() => {
        let results = clients;

        // Name filter
        if (keyword) {
            const lowerKeyword = keyword.toLowerCase();
            results = results.filter((c) => c.fullName.toLowerCase().includes(lowerKeyword));
        }

        // Gender filter
        if (gender !== "All") {
            results = results.filter((c) => c.gender === gender);
        }

        // Location filter
        if (location) {
            results = results.filter((c) => c.location.toLowerCase().includes(location.toLowerCase()));
        }

        // Age filter
        if (minAge) {
            results = results.filter((c) => calculateAge(c.dob) >= parseInt(minAge));
        }
        if (maxAge) {
            results = results.filter((c) => calculateAge(c.dob) <= parseInt(maxAge));
        }

        // Height filter
        if (minHeight) {
            results = results.filter((c) => c.height >= parseInt(minHeight));
        }
        if (maxHeight) {
            results = results.filter((c) => c.height <= parseInt(maxHeight));
        }

        // Religiosity filter
        if (religiosity.length > 0) {
            results = results.filter((c) => {
                // Handle both string and array (since mock data was updated to array but some might be string)
                const clientReligiosity = Array.isArray(c.religiousAffiliation)
                    ? c.religiousAffiliation
                    : [c.religiousAffiliation];
                return religiosity.some(r => clientReligiosity.some(cr => cr.includes(r)));
            });
        }

        // Marital Status filter
        if (maritalStatus.length > 0) {
            results = results.filter((c) => maritalStatus.includes(c.maritalStatus));
        }

        // Ethnicity filter
        if (ethnicity.length > 0) {
            results = results.filter((c) => {
                const clientEthnicity = Array.isArray(c.ethnicity) ? c.ethnicity : [c.ethnicity];
                return ethnicity.some(e => clientEthnicity.includes(e));
            });
        }

        setFilteredClients(results);
    }, [clients, keyword, gender, location, minAge, maxAge, minHeight, maxHeight, religiosity, maritalStatus, ethnicity]);

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="shrink-0">
                <h1 className="text-3xl font-bold tracking-tight">Advanced Search</h1>
                <p className="text-muted-foreground">Filter the database to find specific profiles.</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom)] md:pb-0">
                <div className="grid gap-8 lg:grid-cols-[300px_1fr] pb-24">
                    <div className="space-y-6">
                        <div className="rounded-xl border bg-white dark:bg-gray-950 p-4 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 font-semibold border-b pb-2 text-sm">
                                <Filter className="h-4 w-4" />
                                Filters
                            </div>

                            {/* Name */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">Name</label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Gender */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Gender</label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                    >
                                        <option value="All">All</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                {/* Location */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Location</label>
                                    <input
                                        type="text"
                                        placeholder="City..."
                                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Age Range */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Age Range</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                                            value={minAge}
                                            onChange={(e) => setMinAge(e.target.value)}
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                                            value={maxAge}
                                            onChange={(e) => setMaxAge(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Height Range */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Height (cm)</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                                            value={minHeight}
                                            onChange={(e) => setMinHeight(e.target.value)}
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                                            value={maxHeight}
                                            onChange={(e) => setMaxHeight(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-dashed">
                                {/* Religiosity */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Religiosity</label>
                                    <div className="flex flex-wrap gap-2">
                                        {religiosityOptions.map((option) => (
                                            <label key={option} className="inline-flex items-center gap-1.5 text-xs bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-red-200">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-3 w-3"
                                                    checked={religiosity.includes(option)}
                                                    onChange={() => toggleFilter(option, religiosity, setReligiosity)}
                                                />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Marital Status */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Marital Status</label>
                                    <div className="flex flex-wrap gap-2">
                                        {maritalStatusOptions.map((option) => (
                                            <label key={option} className="inline-flex items-center gap-1.5 text-xs bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-red-200">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-3 w-3"
                                                    checked={maritalStatus.includes(option)}
                                                    onChange={() => toggleFilter(option, maritalStatus, setMaritalStatus)}
                                                />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Ethnicity */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Ethnicity</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ethnicityOptions.map((option) => (
                                            <label key={option} className="inline-flex items-center gap-1.5 text-xs bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-red-200">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-3 w-3"
                                                    checked={ethnicity.includes(option)}
                                                    onChange={() => toggleFilter(option, ethnicity, setEthnicity)}
                                                />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div >

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{filteredClients.length} Results</h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {isLoading ? (
                                Array.from({ length: 9 }).map((_, i) => (
                                    <div key={i} className="h-64 rounded-xl border bg-white dark:bg-gray-950 p-6 shadow-sm animate-pulse space-y-4">
                                        <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                        <div className="space-y-2 pt-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/6"></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                filteredClients.map((client) => (
                                    <Link key={client.id} href={`/clients/${client.id}?source=search`} className="block group">
                                        <div className="h-full rounded-xl border bg-white dark:bg-gray-950 p-6 shadow-sm hover:shadow-md transition-all hover:border-red-200 dark:hover:border-red-900">
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-lg group-hover:text-red-600 transition-colors">
                                                            {client.fullName}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">{client.location}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase className="h-3 w-3" />
                                                        {client.occupation}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2">
                                                        <div>
                                                            <span className="font-medium text-xs text-gray-400 block">Height</span>
                                                            {client.height} cm
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-xs text-gray-400 block">Age</span>
                                                            {calculateAge(client.dob)}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-xs text-gray-400 block">Religiosity</span>
                                                            <span className="truncate block" title={Array.isArray(client.religiousAffiliation) ? client.religiousAffiliation.join(", ") : client.religiousAffiliation}>
                                                                {Array.isArray(client.religiousAffiliation) ? client.religiousAffiliation[0] + (client.religiousAffiliation.length > 1 ? "..." : "") : client.religiousAffiliation}
                                                            </span>
                                                        </div>

                                                        <div>
                                                            <span className="font-medium text-xs text-gray-400 block">Status</span>
                                                            {client.maritalStatus}
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="font-medium text-xs text-gray-400 block">Ethnicity</span>
                                                            {Array.isArray(client.ethnicity) ? client.ethnicity.join(", ") : client.ethnicity}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                            {!isLoading && filteredClients.length === 0 && (
                                <div className="col-span-full py-12 text-center text-muted-foreground">
                                    No clients found matching your filters.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

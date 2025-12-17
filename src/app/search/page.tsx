"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { Search, MapPin, Briefcase, Filter, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";

export default function SearchPage() {
    const { clients, isLoading } = useClients();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filteredClients, setFilteredClients] = useState<Client[]>(clients);

    // View State
    const [showResults, setShowResults] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(4);

    // Dynamic items per page based on viewport height
    useEffect(() => {
        const calculateItemsPerPage = () => {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            // Determine grid columns: 1 on mobile, 2 on sm, 3 on lg, 4 on xl
            let columns = 1;
            if (viewportWidth >= 1280) columns = 4;
            else if (viewportWidth >= 1024) columns = 3;
            else if (viewportWidth >= 640) columns = 2;

            const isMdOrLarger = viewportWidth >= 768;
            // On tablet/desktop, reserve less space since no bottom nav
            const reservedHeight = isMdOrLarger ? 280 : 380;
            const availableHeight = viewportHeight - reservedHeight;
            const itemHeight = 140; // Result cards ~140px tall
            const rows = Math.max(1, Math.floor(availableHeight / itemHeight));
            // Calculate items as rows × columns for full grid utilization
            const calculated = rows * columns;
            setItemsPerPage(calculated);
        };
        calculateItemsPerPage();
        window.addEventListener('resize', calculateItemsPerPage);
        return () => window.removeEventListener('resize', calculateItemsPerPage);
    }, []);

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
    // Options
    const genderOptions = ["Male", "Female"];
    const religiosityOptions = ["Haredi", "Hardal", "Dati Leumi", "Modern Orthodox", "Yeshivish American", "Yeshivish Litvish", "Yeshivish Hasidish", "Chabad", "Masorti", "Traditional", "Secular"];
    const maritalStatusOptions = ["Single", "Divorced", "Divorced with Kids", "Widowed", "Widowed with Kids"];
    const ethnicityOptions = ["Ashkenazi", "Sephardi", "Mizrahi", "Yemenite", "Ethiopian", "Convert", "Mixed", "Other"];

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
        setCurrentPage(1);
    }, [clients, keyword, gender, location, minAge, maxAge, minHeight, maxHeight, religiosity, maritalStatus, ethnicity]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <div className="shrink-0 px-4 pt-4 pb-2 md:pb-4 border-b bg-white dark:bg-gray-950 z-10 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        {showResults ? `Results (${filteredClients.length})` : "Advanced Search"}
                    </h1>
                    <p className="text-muted-foreground text-sm hidden md:block">Filter clients by detailed criteria.</p>
                </div>
                <button
                    onClick={() => {
                        setShowResults(!showResults);
                        if (showResults) {
                            router.push("/search");
                        } else {
                            // If toggling ON, we push results? Refine usually toggles OFF results (back to filters).
                            // The Refine button is visible ONLY in Results view (line 410 -> !showResults && hidden).
                            // Wait, line 150: `!showResults && "hidden"`.
                            // So Refine button is visible when SHOWING RESULTS.
                            // Clicking it should hide results -> go to filters.
                            router.push("/search");
                        }
                    }}
                    className={cn(
                        "md:hidden text-sm font-medium text-red-600 flex items-center gap-1",
                        !showResults && "hidden"
                    )}
                    id="tour-refine-search-btn"
                >
                    <Filter className="h-4 w-4" />
                    Refine Search
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <div className="h-full min-h-0 overflow-hidden flex flex-col md:flex-row md:gap-8 max-w-7xl mx-auto md:p-4">

                    {/* FILTERS COLUMN - Now with internal scroll and fixed button */}
                    <div className={cn(
                        "md:w-80 md:shrink-0 md:border-r md:pr-8 bg-white dark:bg-gray-950 md:bg-transparent transition-all duration-300 ease-in-out flex flex-col",
                        "w-full md:static h-full min-h-0",
                        showResults ? "hidden md:flex" : "flex"
                    )}>
                        {/* Scrollable filters area */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-0 pb-24 md:pb-0 max-h-[calc(100dvh-12rem)]">
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center text-lg">
                                    <Search className="w-5 h-5 mr-2" />
                                    Filter Criteria
                                </h3>

                                <div id="tour-search-filters" className="space-y-4">
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

                                    {/* ... Filters Content (unchanged) ... */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Age Range */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-500">Age Range</label>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    className="w-full p-2 border rounded-md text-sm dark:bg-gray-900"
                                                    value={minAge}
                                                    onChange={(e) => setMinAge(e.target.value)}
                                                />
                                                <span className="text-gray-400">-</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    className="w-full p-2 border rounded-md text-sm dark:bg-gray-900"
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
                                                    className="w-full p-2 border rounded-md text-sm dark:bg-gray-900"
                                                    value={minHeight}
                                                    onChange={(e) => setMinHeight(e.target.value)}
                                                />
                                                <span className="text-gray-400">-</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    className="w-full p-2 border rounded-md text-sm dark:bg-gray-900"
                                                    value={maxHeight}
                                                    onChange={(e) => setMaxHeight(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gender */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Gender</label>
                                        <select
                                            className="w-full p-2 border rounded-md text-sm dark:bg-gray-900"
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
                                            placeholder="City or Area..."
                                            className="w-full p-2 border rounded-md text-sm dark:bg-gray-900"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                        />
                                    </div>

                                    {/* Religiosity */}
                                    <div className="space-y-1 pt-2 border-t border-dashed">
                                        <label className="text-xs font-medium text-gray-500">Religiosity</label>
                                        <MultiSelect
                                            options={religiosityOptions}
                                            selected={religiosity}
                                            onChange={setReligiosity}
                                            placeholder="Select..."
                                            direction="top"
                                        />
                                    </div>

                                    {/* Marital Status */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Marital Status</label>
                                        <MultiSelect
                                            options={maritalStatusOptions}
                                            selected={maritalStatus}
                                            onChange={setMaritalStatus}
                                            placeholder="Select..."
                                            direction="top"
                                        />
                                    </div>

                                    {/* Ethnicity */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Ethnicity</label>
                                        <MultiSelect
                                            options={ethnicityOptions}
                                            selected={ethnicity}
                                            onChange={setEthnicity}
                                            placeholder="Select..."
                                            direction="top"
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            setKeyword("");
                                            setGender("All");
                                            setLocation("");
                                            setMinAge("");
                                            setMaxAge("");
                                            setMinHeight("");
                                            setMaxHeight("");
                                            setReligiosity([]);
                                            setMaritalStatus([]);
                                            setEthnicity([]);
                                        }}
                                        className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 underline pt-2"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RESULTS COLUMN */}
                    <div className={cn(
                        "flex-1 overflow-hidden px-4 pb-20 md:pb-0 h-full flex flex-col",
                        !showResults && "hidden md:flex md:items-center md:justify-center"
                    )}>
                        {!showResults ? (
                            <div className="hidden md:flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 border-2 border-dashed rounded-xl">
                                <Search className="h-10 w-10 text-gray-300 mb-2" />
                                <p className="font-medium">Ready to search?</p>
                                <p className="text-sm mb-4">Adjust filters to see breakdown.</p>
                                <button
                                    id="tour-show-results-btn"
                                    onClick={() => {
                                        setShowResults(true);
                                        router.push("/search?view=results");
                                    }}
                                    className="bg-red-600 text-white px-6 py-2 rounded-full font-medium hover:bg-red-700 transition"
                                >
                                    Show {filteredClients.length} Results
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 flex items-center justify-between shrink-0 pt-4 md:pt-0">
                                    {/* Subheader removed */}
                                </div>

                                {filteredClients.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <p>No clients match your criteria.</p>
                                        <button onClick={() => { setShowResults(false); router.push("/search"); }} className="mt-2 text-red-600 underline">Adjust Filters</button>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-hidden p-1">
                                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
                                            {paginatedClients.map(client => (
                                                <div key={client.id} className="bg-white dark:bg-gray-950 p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                                                    <Link href={`/clients/${client.id}`} className="flex gap-4 items-start">
                                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {client.photoUrl ? (
                                                                <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center w-full h-full text-gray-400">?</div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold truncate">{client.fullName}</h3>
                                                            <p className="text-sm text-gray-500">{calculateAge(client.dob)} • {client.gender}</p>
                                                            <p className="text-xs text-gray-400 truncate mt-1">{client.location}</p>
                                                            <div className="flex gap-1 mt-2">
                                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                                                    {calculateAge(client.dob)} y/o
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pagination Controls */}
                                {filteredClients.length > 0 && totalPages > 1 && (
                                    <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-950 z-20 md:static md:p-0 md:pb-4 md:bg-transparent shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:shadow-none">
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
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile "Show Results" Button - Fixed above bottom nav */}
            {!showResults && (
                <div className="md:hidden fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] p-4 z-50 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 pt-8">
                    <button
                        id="tour-mobile-show-results-btn"
                        onClick={() => {
                            setShowResults(true);
                            setCurrentPage(1);
                            router.push("/search?view=results");
                        }}
                        className="w-full bg-red-600 text-white font-medium py-3 rounded-xl shadow-md active:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        Show Results ({filteredClients.length})
                    </button>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { Search, MapPin, Briefcase, Filter, ChevronDown, ChevronLeft, ChevronRight, User as UserIcon, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn, compareLocations } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ItemsPerPageSelector } from "@/components/ui/ItemsPerPageSelector";

export default function SearchPage() {
    const { clients, isLoading } = useClients();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filteredClients, setFilteredClients] = useState<Client[]>(clients);

    // View State - Show results immediately on tablet and desktop
    const [showResults, setShowResults] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 768; // md breakpoint - show results immediately on tablet/desktop
        }
        return false;
    });

    // Scroll detection for gradient fade effect
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);

    // Check for scroll overflow to show/hide gradient fade
    useEffect(() => {
        const checkOverflow = () => {
            const container = scrollContainerRef.current;
            if (container) {
                // Only check if content is scrollable (more content than visible area)
                const hasScrollableContent = container.scrollHeight > container.clientHeight + 20;
                setHasOverflow(hasScrollableContent);
            }
        };
        
        // Initial check with slight delay to ensure DOM is ready
        const timeoutId = setTimeout(checkOverflow, 100);
        
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkOverflow);
            // Use ResizeObserver to detect content changes
            const resizeObserver = new ResizeObserver(checkOverflow);
            resizeObserver.observe(container);
            return () => {
                clearTimeout(timeoutId);
                container.removeEventListener('scroll', checkOverflow);
                resizeObserver.disconnect();
            };
        }
    }, [filteredClients, showResults]);

    // Note: Auto-fullscreen is NOT enabled by default
    // It only activates if user explicitly enables it via: localStorage.setItem('autoFullscreen', 'true')
    // This is an opt-in feature, not automatic

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
        return 5;
    });

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
    const ethnicityOptions = ["Ashkenazi", "Sephardi", "Yemenite", "Ethiopian", "Convert", "Other"];

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

        // Location filter (Hebrew-aware)
        if (location) {
            results = results.filter((c) => compareLocations(c.location, location));
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
    const effectiveItemsPerPage = itemsPerPage === "all" ? filteredClients.length : itemsPerPage;
    const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(filteredClients.length / itemsPerPage);
    const paginatedClients = filteredClients.slice(
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

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0 px-1 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Search className="h-8 w-8 text-red-600" />
                        {showResults ? `Results (${filteredClients.length})` : "Advanced Search"}
                    </h1>
                    <p className="text-muted-foreground hidden md:block">Filter clients by detailed criteria.</p>
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
                <div className="h-full min-h-0 overflow-hidden flex flex-col md:flex-row md:gap-8 max-w-7xl mx-auto md:p-4 md:pb-20" style={{ height: "100%" }}>

                    {/* FILTERS COLUMN - Now with internal scroll and fixed button */}
                    <div className={cn(
                        "md:w-96 lg:w-[28rem] md:shrink-0 transition-all duration-300 ease-in-out flex flex-col",
                        "w-full md:static h-full min-h-0",
                        showResults ? "hidden md:flex" : "flex"
                    )}>
                        {/* Scrollable filters area - scrollbar at edge */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-0 md:pr-0 pb-24 md:pb-0 max-h-[calc(100dvh-12rem)] custom-scrollbar">
                            <div className="space-y-5 md:pr-8">
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
                                    <div className="space-y-1 pt-2">
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
                        "flex-1 min-h-0 overflow-hidden px-4 md:px-4 md:pr-0 pb-20 md:pb-0 flex flex-col md:pt-0 md:max-h-[calc(100vh-12rem)]",
                        !showResults && "hidden md:flex md:items-center md:justify-center"
                    )}>
                        {!showResults ? (
                            <div className="hidden md:flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 bg-gray-50 dark:bg-gray-900/50">
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

                                {filteredClients.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-900">
                                        <p>No clients match your criteria.</p>
                                        <button onClick={() => { setShowResults(false); router.push("/search"); }} className="mt-2 text-red-600 underline">Adjust Filters</button>
                                    </div>
                                ) : (
                                    <div className="flex-1 min-h-0 overflow-y-auto p-1 md:p-1 md:pr-4 pb-24 md:pb-0 custom-scrollbar relative" style={{ height: "100%", maxHeight: "calc(100vh - 12rem)", WebkitOverflowScrolling: "touch" }}>
                                        <div 
                                            ref={scrollContainerRef}
                                            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                                        >
                                            {paginatedClients.map((client) => (
                                                <Link
                                                    key={client.id}
                                                    href={`/clients/${client.id}?source=search`}
                                                    className="group relative flex flex-col justify-between bg-gray-50 dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-all"
                                                >
                                                    <div className="space-y-3">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h3 className="font-semibold text-base group-hover:text-red-600 transition-colors">{client.fullName}</h3>
                                                                <p className="text-xs text-muted-foreground">{client.location} • {calculateAge(client.dob)} yo</p>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                                                {client.photoUrl ? (
                                                                    <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <UserIcon className="h-4 w-4 text-gray-400" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1 text-xs">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Age/Gender:</span>
                                                                <span className="text-right">{calculateAge(client.dob)} / {client.gender}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Occupation:</span>
                                                                <span className="text-right truncate max-w-[7.5rem]">{client.occupation}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 pt-3 flex items-center justify-end">
                                                        <span className="text-xs font-medium text-red-600 group-hover:underline flex items-center gap-1">
                                                            View Profile <ArrowRight className="h-3 w-3" />
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                        {/* Gradient fade - only show when content overflows */}
                                        {hasOverflow && (
                                            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent dark:from-gray-900 dark:via-gray-900/80 z-20" />
                                        )}
                                    </div>
                                )}

                                {/* Pagination Controls */}
                                {filteredClients.length > 0 && (
                                    <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 z-20 md:fixed md:bottom-0 md:left-0 md:right-0 md:px-4 md:py-3 md:bg-gray-50 md:dark:bg-gray-900 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                                        <ItemsPerPageSelector
                                            value={itemsPerPage}
                                            onChange={handleItemsPerPageChange}
                                            totalItems={filteredClients.length}
                                        />
                                        {totalPages > 1 && (
                                            <>
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
                                            </>
                                        )}
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

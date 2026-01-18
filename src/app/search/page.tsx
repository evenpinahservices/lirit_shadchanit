"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import { Search, MapPin, Briefcase, Filter, ChevronDown, ChevronLeft, ChevronRight, User as UserIcon, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn, compareLocations, detectClientLanguage } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ItemsPerPageSelector } from "@/components/ui/ItemsPerPageSelector";

export default function SearchPage() {
    const { clients, isLoading } = useClients();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Restore search state from sessionStorage synchronously during initialization
    const getSavedState = () => {
        if (typeof window !== "undefined") {
            const savedState = sessionStorage.getItem('searchState');
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    // Clear the saved state immediately after reading
                    sessionStorage.removeItem('searchState');
                    return state;
                } catch (e) {
                    console.error('Failed to parse search state:', e);
                    sessionStorage.removeItem('searchState');
                }
            }
        }
        return null;
    };

    const savedState = getSavedState();

    // View State - Show results immediately on tablet and desktop, or if we have saved state
    const [showResults, setShowResults] = useState(() => {
        // If we have saved state, always show results (even on mobile)
        if (savedState) {
            return true;
        }
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 768; // md breakpoint - show results immediately on tablet/desktop
        }
        return false;
    });

    // Scroll detection for gradient fade effect
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);

    // Check for scroll overflow to show/hide gradient fade
    // (Moved after filteredClients definition to avoid initialization error)

    // Note: Auto-fullscreen is NOT enabled by default
    // It only activates if user explicitly enables it via: localStorage.setItem('autoFullscreen', 'true')
    // This is an opt-in feature, not automatic

    // Filters - initialize from saved state if available
    const [keyword, setKeyword] = useState(savedState?.keyword || "");
    const [gender, setGender] = useState<string>(savedState?.gender || "All");
    const [location, setLocation] = useState(savedState?.location || "");

    // New Filters
    const [minAge, setMinAge] = useState(savedState?.minAge || "");
    const [maxAge, setMaxAge] = useState(savedState?.maxAge || "");
    const [minHeight, setMinHeight] = useState(savedState?.minHeight || "");
    const [maxHeight, setMaxHeight] = useState(savedState?.maxHeight || "");

    const [religiosity, setReligiosity] = useState<string[]>(savedState?.religiosity || []);
    const [maritalStatus, setMaritalStatus] = useState<string[]>(savedState?.maritalStatus || []);
    const [ethnicity, setEthnicity] = useState<string[]>(savedState?.ethnicity || []);

    // Pagination State - initialize from saved state if available
    const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
    const [itemsPerPage, setItemsPerPage] = useState<number | "all">(() => {
        if (savedState?.itemsPerPage) {
            return savedState.itemsPerPage;
        }
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
        if (!dob) return null;
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    };

    // Filter function that can be used synchronously
    const filterClients = (
        clientsToFilter: Client[],
        filterKeyword: string,
        filterGender: string,
        filterLocation: string,
        filterMinAge: string,
        filterMaxAge: string,
        filterMinHeight: string,
        filterMaxHeight: string,
        filterReligiosity: string[],
        filterMaritalStatus: string[],
        filterEthnicity: string[]
    ): Client[] => {
        if (!clientsToFilter || clientsToFilter.length === 0) {
            return [];
        }

        let results = clientsToFilter;

        // Name filter
        if (filterKeyword) {
            const lowerKeyword = filterKeyword.toLowerCase();
            results = results.filter((c) => c.fullName.toLowerCase().includes(lowerKeyword));
        }

        // Gender filter
        if (filterGender !== "All") {
            results = results.filter((c) => c.gender === filterGender);
        }

        // Location filter (Hebrew-aware)
        if (filterLocation) {
            results = results.filter((c) => compareLocations(c.location, filterLocation));
        }

        // Age filter
        if (filterMinAge) {
            results = results.filter((c) => {
                const age = calculateAge(c.dob);
                return age !== null && age >= parseInt(filterMinAge);
            });
        }
        if (filterMaxAge) {
            results = results.filter((c) => {
                const age = calculateAge(c.dob);
                return age !== null && age <= parseInt(filterMaxAge);
            });
        }

        // Height filter
        if (filterMinHeight) {
            results = results.filter((c) => c.height >= parseInt(filterMinHeight));
        }
        if (filterMaxHeight) {
            results = results.filter((c) => c.height <= parseInt(filterMaxHeight));
        }

        // Religiosity filter
        if (filterReligiosity.length > 0) {
            results = results.filter((c) => {
                const clientReligiosity = Array.isArray(c.religiousAffiliation)
                    ? c.religiousAffiliation
                    : [c.religiousAffiliation];
                return filterReligiosity.some(r => clientReligiosity.some(cr => cr.includes(r)));
            });
        }

        // Marital Status filter
        if (filterMaritalStatus.length > 0) {
            results = results.filter((c) => filterMaritalStatus.includes(c.maritalStatus));
        }

        // Ethnicity filter
        if (filterEthnicity.length > 0) {
            results = results.filter((c) => {
                const clientEthnicity = Array.isArray(c.ethnicity) ? c.ethnicity : [c.ethnicity];
                return filterEthnicity.some(e => clientEthnicity.includes(e));
            });
        }

        return results;
    };

    // Compute filtered clients synchronously using useMemo to prevent flicker
    const filteredClients = useMemo(() => {
        if (!clients || clients.length === 0) {
            return [];
        }
        return filterClients(
            clients,
            keyword,
            gender,
            location,
            minAge,
            maxAge,
            minHeight,
            maxHeight,
            religiosity,
            maritalStatus,
            ethnicity
        );
    }, [clients, keyword, gender, location, minAge, maxAge, minHeight, maxHeight, religiosity, maritalStatus, ethnicity]);

    // Track if we've restored from saved state to prevent resetting page
    const hasRestoredState = useRef(!!savedState);

    // Reset to page 1 when filters change (but preserve page if restoring from saved state)
    useEffect(() => {
        if (!hasRestoredState.current) {
            setCurrentPage(1);
        }
        // After first render, allow page resets on filter changes
        hasRestoredState.current = false;
    }, [keyword, gender, location, minAge, maxAge, minHeight, maxHeight, religiosity, maritalStatus, ethnicity]);

    // Check for scroll overflow to show/hide gradient fade (moved here after filteredClients is defined)
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
                                            className="grid gap-3 grid-cols-1"
                                        >
                                            {paginatedClients.map((client) => (
                                                <Link
                                                    key={client.id}
                                                    href={`/clients/${client.id}?source=search`}
                                                    onClick={() => {
                                                        // Store current search state in sessionStorage
                                                        const searchState = {
                                                            keyword,
                                                            gender,
                                                            location,
                                                            minAge,
                                                            maxAge,
                                                            minHeight,
                                                            maxHeight,
                                                            religiosity,
                                                            maritalStatus,
                                                            ethnicity,
                                                            currentPage,
                                                            itemsPerPage,
                                                        };
                                                        sessionStorage.setItem('searchState', JSON.stringify(searchState));
                                                    }}
                                                    className="group relative flex flex-col justify-between bg-gray-50 dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-all"
                                                >
                                                    <div className="space-y-3">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h3 className="font-semibold text-base group-hover:text-red-600 transition-colors">{client.fullName}</h3>
                                                                <p className="text-xs text-muted-foreground" dir="ltr">
                                                                    {calculateAge(client.dob) !== null ? `${calculateAge(client.dob)} y/o` : 'Age N/A'}
                                                                </p>
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
                                                                <span className="text-muted-foreground">Location:</span>
                                                                <span className="text-right truncate max-w-[7.5rem]">{client.location}</span>
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

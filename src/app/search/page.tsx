"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClients } from "@/context/ClientContext";
import { Client } from "@/lib/mockData";
import {
    Search, Filter, ChevronLeft, ChevronRight,
    User as UserIcon, ArrowRight, PanelLeftClose, PanelLeftOpen, X,
} from "lucide-react";
import Link from "next/link";
import { cn, compareLocations } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ItemsPerPageSelector } from "@/components/ui/ItemsPerPageSelector";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterSet = {
    keyword: string;
    location: string;
    minAge: string;
    maxAge: string;
    minHeight: string;
    maxHeight: string;
    religiosity: string[];
    maritalStatus: string[];
    ethnicity: string[];
};

const emptyFilterSet = (): FilterSet => ({
    keyword: "",
    location: "",
    minAge: "",
    maxAge: "",
    minHeight: "",
    maxHeight: "",
    religiosity: [],
    maritalStatus: [],
    ethnicity: [],
});

// ─── Sub-component: filter fields ────────────────────────────────────────────

function FilterFields({
    filters,
    onChange,
    onClear,
    religiosityOptions,
    maritalStatusOptions,
    ethnicityOptions,
}: {
    filters: FilterSet;
    onChange: (updated: FilterSet) => void;
    onClear: () => void;
    religiosityOptions: string[];
    maritalStatusOptions: string[];
    ethnicityOptions: string[];
}) {
    const set = (key: keyof FilterSet, value: string | string[]) =>
        onChange({ ...filters, [key]: value });

    return (
        <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Name</label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm dark:bg-gray-900"
                        value={filters.keyword}
                        onChange={(e) => set("keyword", e.target.value)}
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
                            className="w-full p-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-900"
                            value={filters.minAge}
                            onChange={(e) => set("minAge", e.target.value)}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="number"
                            placeholder="Max"
                            className="w-full p-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-900"
                            value={filters.maxAge}
                            onChange={(e) => set("maxAge", e.target.value)}
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
                            className="w-full p-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-900"
                            value={filters.minHeight}
                            onChange={(e) => set("minHeight", e.target.value)}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="number"
                            placeholder="Max"
                            className="w-full p-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-900"
                            value={filters.maxHeight}
                            onChange={(e) => set("maxHeight", e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Location */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Location</label>
                <input
                    type="text"
                    placeholder="City or Area..."
                    className="w-full p-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-900"
                    value={filters.location}
                    onChange={(e) => set("location", e.target.value)}
                />
            </div>

            {/* Religiosity */}
            <div className="space-y-1 pt-2">
                <label className="text-xs font-medium text-gray-500">Religiosity</label>
                <MultiSelect
                    options={religiosityOptions}
                    selected={filters.religiosity}
                    onChange={(v) => set("religiosity", v)}
                    placeholder="Select..."
                    direction="top"
                />
            </div>

            {/* Marital Status */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Marital Status</label>
                <MultiSelect
                    options={maritalStatusOptions}
                    selected={filters.maritalStatus}
                    onChange={(v) => set("maritalStatus", v)}
                    placeholder="Select..."
                    direction="top"
                />
            </div>

            {/* Ethnicity */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Ethnicity</label>
                <MultiSelect
                    options={ethnicityOptions}
                    selected={filters.ethnicity}
                    onChange={(v) => set("ethnicity", v)}
                    placeholder="Select..."
                    direction="top"
                />
            </div>

            <button
                onClick={onClear}
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 underline pt-2"
            >
                Clear Filters
            </button>
        </div>
    );
}

// ─── Sub-component: results list ──────────────────────────────────────────────

function ClientCard({
    client,
    calculateAge,
    onSaveState,
}: {
    client: Client;
    calculateAge: (dob: string) => number | null;
    onSaveState: () => void;
}) {
    return (
        <Link
            href={`/clients/${client.id}?source=search`}
            onClick={onSaveState}
            className="group relative flex flex-col bg-gray-50 dark:bg-gray-900 p-3 shadow-sm hover:shadow-md transition-all"
        >
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {client.photoUrl ? (
                        <img src={client.photoUrl} alt={client.fullName} className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="h-6 w-6 text-gray-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base group-hover:text-red-600 transition-colors">{client.fullName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                        {client.location || <span className="italic">Unknown Location</span>} • {calculateAge(client.dob) !== null ? `${calculateAge(client.dob)} y/o` : "—"}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        <p>Occupation: {client.occupationTitle || "—"}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-end">
                        <span className="text-xs font-medium text-red-600 group-hover:underline flex items-center gap-1">
                            View Profile <ArrowRight className="h-3 w-3" />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SearchPage() {
    const { clients } = useClients();
    const router = useRouter();

    const getSavedState = () => {
        if (typeof window !== "undefined") {
            const raw = sessionStorage.getItem("searchState");
            if (raw) {
                try {
                    const state = JSON.parse(raw);
                    sessionStorage.removeItem("searchState");
                    return state;
                } catch {
                    sessionStorage.removeItem("searchState");
                }
            }
        }
        return null;
    };

    const savedState = getSavedState();

    // ── UI state ──────────────────────────────────────────────────────────────
    const [showResults, setShowResults] = useState(() => {
        if (savedState) return true;
        if (typeof window !== "undefined") return window.innerWidth >= 768;
        return false;
    });
    const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(
        savedState?.filterPanelOpen ?? true
    );
    const [dualMode, setDualMode] = useState<boolean>(savedState?.dualMode ?? false);
    const [activeFilterTab, setActiveFilterTab] = useState<"male" | "female">(
        savedState?.activeFilterTab ?? "male"
    );
    const [mobileResultsTab, setMobileResultsTab] = useState<"male" | "female">("male");

    // ── Single-mode filter state ──────────────────────────────────────────────
    const [singleFilters, setSingleFilters] = useState<FilterSet>(
        savedState?.singleFilters ?? emptyFilterSet()
    );
    const [gender, setGender] = useState<string>(savedState?.gender ?? "All");

    // ── Dual-mode filter state ────────────────────────────────────────────────
    const [boyFilters, setBoyFilters] = useState<FilterSet>(
        savedState?.boyFilters ?? emptyFilterSet()
    );
    const [girlFilters, setGirlFilters] = useState<FilterSet>(
        savedState?.girlFilters ?? emptyFilterSet()
    );

    // ── Pagination ────────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState<number>(savedState?.currentPage ?? 1);
    const [currentPageBoys, setCurrentPageBoys] = useState<number>(savedState?.currentPageBoys ?? 1);
    const [currentPageGirls, setCurrentPageGirls] = useState<number>(savedState?.currentPageGirls ?? 1);
    const [itemsPerPage, setItemsPerPage] = useState<number | "all">(() => {
        if (savedState?.itemsPerPage) return savedState.itemsPerPage;
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

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);

    // ── Options ───────────────────────────────────────────────────────────────
    const religiosityOptions = ["Haredi", "Hardal", "Dati Leumi", "Modern Orthodox", "Yeshivish American", "Yeshivish Litvish", "Yeshivish Hasidish", "Chabad", "Masorti", "Traditional", "Secular"];
    const maritalStatusOptions = ["Single", "Divorced", "Divorced with Kids", "Widowed", "Widowed with Kids"];
    const ethnicityOptions = ["Ashkenazi", "Sephardi", "Yemenite", "Ethiopian", "Convert", "Other"];

    // ── Helpers ───────────────────────────────────────────────────────────────
    const calculateAge = useCallback((dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age >= 0 ? age : null;
    }, []);

    const filterClients = useCallback((
        src: Client[],
        f: FilterSet,
        filterGender: string
    ): Client[] => {
        if (!src?.length) return [];
        let res = src;
        if (f.keyword) {
            const lc = f.keyword.toLowerCase();
            res = res.filter((c) => c.fullName.toLowerCase().includes(lc));
        }
        if (filterGender !== "All") res = res.filter((c) => c.gender === filterGender);
        if (f.location) res = res.filter((c) => compareLocations(c.location, f.location));
        if (f.minAge) res = res.filter((c) => { const a = calculateAge(c.dob); return a !== null && a >= parseInt(f.minAge); });
        if (f.maxAge) res = res.filter((c) => { const a = calculateAge(c.dob); return a !== null && a <= parseInt(f.maxAge); });
        if (f.minHeight) res = res.filter((c) => (c.height ?? 0) >= parseInt(f.minHeight));
        if (f.maxHeight) res = res.filter((c) => (c.height ?? 0) <= parseInt(f.maxHeight));
        if (f.religiosity.length > 0) {
            res = res.filter((c) => {
                const cr = Array.isArray(c.religiousAffiliation) ? c.religiousAffiliation : [c.religiousAffiliation];
                return f.religiosity.some((r) => cr.some((x) => x.includes(r)));
            });
        }
        if (f.maritalStatus.length > 0) res = res.filter((c) => f.maritalStatus.includes(c.maritalStatus));
        if (f.ethnicity.length > 0) {
            res = res.filter((c) => {
                const ce = Array.isArray(c.ethnicity) ? c.ethnicity : [c.ethnicity];
                return f.ethnicity.some((e) => ce.includes(e));
            });
        }
        return res;
    }, [calculateAge]);

    // ── Computed results ──────────────────────────────────────────────────────
    const filteredClients = useMemo(
        () => filterClients(clients ?? [], singleFilters, gender),
        [clients, singleFilters, gender, filterClients]
    );

    const filteredBoys = useMemo(
        () => dualMode ? filterClients(clients ?? [], boyFilters, "Male") : [],
        [clients, dualMode, boyFilters, filterClients]
    );

    const filteredGirls = useMemo(
        () => dualMode ? filterClients(clients ?? [], girlFilters, "Female") : [],
        [clients, dualMode, girlFilters, filterClients]
    );

    // ── Pagination derived ────────────────────────────────────────────────────
    const ipp = itemsPerPage === "all" ? Math.max(filteredClients.length, 1) : itemsPerPage;
    const totalPages = itemsPerPage === "all" ? 1 : Math.max(1, Math.ceil(filteredClients.length / ipp));
    const paginatedClients = filteredClients.slice((currentPage - 1) * ipp, currentPage * ipp);

    const dualIpp = itemsPerPage === "all" ? 999999 : itemsPerPage;
    const totalPagesBoys = Math.max(1, Math.ceil(filteredBoys.length / dualIpp));
    const totalPagesGirls = Math.max(1, Math.ceil(filteredGirls.length / dualIpp));
    const paginatedBoys = filteredBoys.slice((currentPageBoys - 1) * dualIpp, currentPageBoys * dualIpp);
    const paginatedGirls = filteredGirls.slice((currentPageGirls - 1) * dualIpp, currentPageGirls * dualIpp);

    // ── Effects ───────────────────────────────────────────────────────────────
    const hasRestoredState = useRef(!!savedState);
    useEffect(() => {
        if (!hasRestoredState.current) setCurrentPage(1);
        hasRestoredState.current = false;
    }, [singleFilters, gender]);

    useEffect(() => { setCurrentPageBoys(1); }, [boyFilters]);
    useEffect(() => { setCurrentPageGirls(1); }, [girlFilters]);

    useEffect(() => {
        const checkOverflow = () => {
            const el = scrollContainerRef.current;
            if (el) setHasOverflow(el.scrollHeight > el.clientHeight + 20);
        };
        const id = setTimeout(checkOverflow, 100);
        const el = scrollContainerRef.current;
        if (el) {
            el.addEventListener("scroll", checkOverflow);
            const ro = new ResizeObserver(checkOverflow);
            ro.observe(el);
            return () => { clearTimeout(id); el.removeEventListener("scroll", checkOverflow); ro.disconnect(); };
        }
    }, [filteredClients, showResults]);

    // ── Dual-mode entry/exit ──────────────────────────────────────────────────
    const enterDualMode = () => {
        // Pre-populate from single mode
        if (gender === "Male" || gender === "All") setBoyFilters({ ...singleFilters });
        if (gender === "Female" || gender === "All") setGirlFilters({ ...singleFilters });
        setDualMode(true);
        setActiveFilterTab("male");
        setFilterPanelOpen(false); // collapse to give results more space
        setShowResults(true);
    };

    const exitDualMode = () => {
        setDualMode(false);
        setFilterPanelOpen(true);
    };

    // ── Session state save ────────────────────────────────────────────────────
    const buildSaveState = () => ({
        singleFilters, gender, currentPage, itemsPerPage,
        dualMode, activeFilterTab, filterPanelOpen,
        boyFilters, girlFilters, currentPageBoys, currentPageGirls,
    });

    // ── Swipe (single mode only) ──────────────────────────────────────────────
    const swipeRef = useSwipeNavigation({
        onSwipeLeft: () => { if (currentPage < totalPages) setCurrentPage((p) => p + 1); },
        onSwipeRight: () => { if (currentPage > 1) setCurrentPage((p) => p - 1); },
        enabled: !dualMode && showResults && totalPages > 1,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Shared pagination bar component (inline helper)
    // ─────────────────────────────────────────────────────────────────────────
    const PaginationBar = ({
        page, total, onChange, showIPP = true,
    }: {
        page: number;
        total: number;
        onChange: (p: number) => void;
        showIPP?: boolean;
    }) => (
        <div className="flex items-center justify-between gap-2 px-2 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0">
            {showIPP && (
                <ItemsPerPageSelector
                    value={itemsPerPage}
                    onChange={(v) => {
                        setItemsPerPage(v);
                        setCurrentPage(1);
                        setCurrentPageBoys(1);
                        setCurrentPageGirls(1);
                        if (typeof window !== "undefined") {
                            localStorage.setItem("itemsPerPage", v === "all" ? "all" : v.toString());
                        }
                    }}
                    totalItems={dualMode ? Math.max(filteredBoys.length, filteredGirls.length) : filteredClients.length}
                />
            )}
            {total > 1 && (
                <>
                    <button
                        onClick={() => onChange(page - 1)}
                        disabled={page === 1}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                    >
                        <ChevronLeft className="h-3 w-3" />
                        <span className="hidden sm:inline">Prev</span>
                    </button>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                        {page} / {total}
                    </span>
                    <button
                        onClick={() => onChange(page + 1)}
                        disabled={page === total}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-3 w-3" />
                    </button>
                </>
            )}
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between shrink-0 px-3 pt-4 pb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Search className="h-8 w-8 text-red-600" />
                        {dualMode
                            ? `Boys (${filteredBoys.length}) · Girls (${filteredGirls.length})`
                            : showResults
                                ? `Results (${filteredClients.length})`
                                : "Advanced Search"}
                    </h1>
                    <p className="text-muted-foreground hidden md:block text-sm">
                        {dualMode
                            ? "Dual search — filter boys and girls side by side."
                            : "Filter clients by detailed criteria."}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mobile: dual mode result tab switcher */}
                    {dualMode && showResults && (
                        <div className="md:hidden flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs font-medium">
                            <button
                                onClick={() => setMobileResultsTab("male")}
                                className={cn(
                                    "px-3 py-1.5 transition-colors",
                                    mobileResultsTab === "male"
                                        ? "bg-blue-600 text-white"
                                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                                )}
                            >
                                Boys ({filteredBoys.length})
                            </button>
                            <button
                                onClick={() => setMobileResultsTab("female")}
                                className={cn(
                                    "px-3 py-1.5 transition-colors",
                                    mobileResultsTab === "female"
                                        ? "bg-rose-500 text-white"
                                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                                )}
                            >
                                Girls ({filteredGirls.length})
                            </button>
                        </div>
                    )}

                    {/* Mobile: refine / filter buttons */}
                    {showResults && !dualMode && (
                        <button
                            onClick={() => { setShowResults(false); router.push("/search"); }}
                            className="md:hidden text-sm font-medium text-red-600 flex items-center gap-1"
                        >
                            <Filter className="h-4 w-4" />
                            Refine
                        </button>
                    )}
                    {dualMode && (
                        <button
                            onClick={() => { setShowResults(!showResults); }}
                            className="md:hidden text-sm font-medium text-red-600 flex items-center gap-1"
                        >
                            <Filter className="h-4 w-4" />
                            {showResults ? "Filters" : "Results"}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-hidden flex">

                {/* ── Filter panel ───────────────────────────────────────── */}
                <div className={cn(
                    "shrink-0 flex flex-col transition-all duration-100 overflow-hidden",
                    // Desktop: collapsible via width
                    filterPanelOpen ? "md:w-80 lg:w-96" : "md:w-0",
                    // Mobile: full-screen when viewing filters, hidden when viewing results
                    showResults ? "hidden md:flex" : "flex w-full",
                )}>
                    {/* Dual mode entry — always visible at top when in single mode */}
                    {!dualMode && (
                        <button
                            onClick={enterDualMode}
                            className="shrink-0 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors py-2 border-b border-gray-100 dark:border-gray-800"
                        >
                            Search for a boy and a girl at once
                        </button>
                    )}

                    {/* Dual mode tabs */}
                    {dualMode && (
                        <div className="flex shrink-0 border-b border-gray-200 dark:border-gray-800">
                            <button
                                onClick={() => setActiveFilterTab("male")}
                                className={cn(
                                    "flex-1 py-2.5 text-sm font-medium transition-colors",
                                    activeFilterTab === "male"
                                        ? "border-b-2 border-blue-600 text-blue-600"
                                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                )}
                            >
                                Boys
                            </button>
                            <button
                                onClick={() => setActiveFilterTab("female")}
                                className={cn(
                                    "flex-1 py-2.5 text-sm font-medium transition-colors",
                                    activeFilterTab === "female"
                                        ? "border-b-2 border-rose-500 text-rose-500"
                                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                )}
                            >
                                Girls
                            </button>
                            {/* Exit dual mode */}
                            <button
                                onClick={exitDualMode}
                                title="Exit dual search"
                                className="px-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Scrollable filter content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-28 md:pb-8 custom-scrollbar scrollbar-left">
                        <div className="space-y-5">
                            {!dualMode && (
                                <h3 className="font-semibold flex items-center text-lg">
                                    <Search className="w-5 h-5 mr-2" />
                                    Filter Criteria
                                </h3>
                            )}

                            {dualMode ? (
                                // Dual mode: separate filters per tab
                                <div id="tour-search-filters">
                                    {activeFilterTab === "male" ? (
                                        <FilterFields
                                            filters={boyFilters}
                                            onChange={setBoyFilters}
                                            onClear={() => setBoyFilters(emptyFilterSet())}
                                            religiosityOptions={religiosityOptions}
                                            maritalStatusOptions={maritalStatusOptions}
                                            ethnicityOptions={ethnicityOptions}
                                        />
                                    ) : (
                                        <FilterFields
                                            filters={girlFilters}
                                            onChange={setGirlFilters}
                                            onClear={() => setGirlFilters(emptyFilterSet())}
                                            religiosityOptions={religiosityOptions}
                                            maritalStatusOptions={maritalStatusOptions}
                                            ethnicityOptions={ethnicityOptions}
                                        />
                                    )}
                                </div>
                            ) : (
                                // Single mode filters
                                <div id="tour-search-filters" className="space-y-4">
                                    <FilterFields
                                        filters={singleFilters}
                                        onChange={setSingleFilters}
                                        onClear={() => { setSingleFilters(emptyFilterSet()); setGender("All"); }}
                                        religiosityOptions={religiosityOptions}
                                        maritalStatusOptions={maritalStatusOptions}
                                        ethnicityOptions={ethnicityOptions}
                                    />

                                    {/* Gender (single mode only) */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Gender</label>
                                        <select
                                            className="w-full p-2 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-900"
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                        >
                                            <option value="All">All</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>


                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Collapse toggle (desktop only) ─────────────────────── */}
                <button
                    onClick={() => setFilterPanelOpen((o) => !o)}
                    className={cn(
                        "hidden md:flex items-center justify-center w-5 shrink-0",
                        "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                        "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                        "transition-colors border-x border-gray-200 dark:border-gray-700"
                    )}
                    title={filterPanelOpen ? "Collapse filters" : "Expand filters"}
                >
                    {filterPanelOpen
                        ? <PanelLeftClose className="h-3.5 w-3.5" />
                        : <PanelLeftOpen className="h-3.5 w-3.5" />
                    }
                </button>

                {/* ── Results area ────────────────────────────────────────── */}
                <div className={cn(
                    "flex-1 min-h-0 overflow-hidden flex flex-col",
                    !showResults && "hidden md:flex"
                )}>
                    {dualMode ? (
                        /* ── Dual mode: two columns ───────────────────────── */
                        <div className="flex-1 min-h-0 flex overflow-hidden">
                            {/* Boys column — mobile: visible when mobileResultsTab=male; desktop: always half */}
                            <div className={cn(
                                "flex flex-col min-h-0 border-r border-gray-200 dark:border-gray-800",
                                "md:flex md:w-1/2",
                                mobileResultsTab === "male" ? "flex w-full" : "hidden"
                            )}>
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-blue-50 dark:bg-blue-950/30">
                                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Boys</span>
                                    <span className="text-xs text-gray-500">({filteredBoys.length})</span>
                                </div>
                                {filteredBoys.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 text-sm gap-2 p-6 text-center">
                                        <Search className="h-8 w-8 text-gray-300" />
                                        <span>No boys match these criteria.</span>
                                    </div>
                                ) : (
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                        {paginatedBoys.map((client) => (
                                            <ClientCard
                                                key={client.id}
                                                client={client}
                                                calculateAge={calculateAge}
                                                onSaveState={() => sessionStorage.setItem("searchState", JSON.stringify(buildSaveState()))}
                                            />
                                        ))}
                                    </div>
                                )}
                                {filteredBoys.length > 0 && (
                                    <PaginationBar
                                        page={currentPageBoys}
                                        total={totalPagesBoys}
                                        onChange={setCurrentPageBoys}
                                        showIPP={true}
                                    />
                                )}
                            </div>

                            {/* Girls column — mobile: visible when mobileResultsTab=female; desktop: always half */}
                            <div className={cn(
                                "flex flex-col min-h-0",
                                "md:flex md:w-1/2",
                                mobileResultsTab === "female" ? "flex w-full" : "hidden"
                            )}>
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-rose-50 dark:bg-rose-950/30">
                                    <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">Girls</span>
                                    <span className="text-xs text-gray-500">({filteredGirls.length})</span>
                                </div>
                                {filteredGirls.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 text-sm gap-2 p-6 text-center">
                                        <Search className="h-8 w-8 text-gray-300" />
                                        <span>No girls match these criteria.</span>
                                    </div>
                                ) : (
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                        {paginatedGirls.map((client) => (
                                            <ClientCard
                                                key={client.id}
                                                client={client}
                                                calculateAge={calculateAge}
                                                onSaveState={() => sessionStorage.setItem("searchState", JSON.stringify(buildSaveState()))}
                                            />
                                        ))}
                                    </div>
                                )}
                                {filteredGirls.length > 0 && (
                                    <PaginationBar
                                        page={currentPageGirls}
                                        total={totalPagesGirls}
                                        onChange={setCurrentPageGirls}
                                        showIPP={false}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ── Single mode results ──────────────────────────── */
                        <>
                            {filteredClients.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-gray-500 bg-gray-50 dark:bg-gray-900 p-8 text-center">
                                    <Search className="h-10 w-10 text-gray-300 mb-2" />
                                    <p className="font-medium">No clients match your criteria.</p>
                                    <button
                                        onClick={() => { setShowResults(false); router.push("/search"); }}
                                        className="mt-2 text-red-600 underline text-sm"
                                    >
                                        Adjust Filters
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="flex-1 min-h-0 overflow-y-auto p-2 md:pr-4 custom-scrollbar relative"
                                    style={{ WebkitOverflowScrolling: "touch" }}
                                >
                                    <div
                                        ref={(node) => {
                                            scrollContainerRef.current = node;
                                            swipeRef(node);
                                        }}
                                        className="grid gap-3 grid-cols-1"
                                    >
                                        {paginatedClients.map((client) => (
                                            <ClientCard
                                                key={client.id}
                                                client={client}
                                                calculateAge={calculateAge}
                                                onSaveState={() => sessionStorage.setItem("searchState", JSON.stringify(buildSaveState()))}
                                            />
                                        ))}
                                    </div>
                                    {hasOverflow && (
                                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-gray-50 via-gray-50/80 to-transparent dark:from-gray-900 dark:via-gray-900/80 z-20" />
                                    )}
                                </div>
                            )}

                            {/* Single mode pagination */}
                            {filteredClients.length > 0 && (
                                <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:sticky md:bottom-0 shrink-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                                    <PaginationBar
                                        page={currentPage}
                                        total={totalPages}
                                        onChange={setCurrentPage}
                                        showIPP={true}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Mobile "Show Results" button (single mode only) ───────── */}
            {!showResults && !dualMode && (
                <div className="md:hidden fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] p-4 z-50 bg-linear-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 pt-8">
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

            {/* ── Mobile dual mode: show filters button ─────────────────── */}
            {!showResults && dualMode && (
                <div className="md:hidden fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] p-4 z-50 bg-linear-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 pt-8">
                    <button
                        onClick={() => setShowResults(true)}
                        className="w-full bg-red-600 text-white font-medium py-3 rounded-xl shadow-md active:bg-red-700 transition-colors"
                    >
                        Show Results — Boys ({filteredBoys.length}) · Girls ({filteredGirls.length})
                    </button>
                </div>
            )}
        </div>
    );
}

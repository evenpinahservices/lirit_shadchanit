"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

// Steps will be defined dynamically in the hook

// Custom hook to provide tour functionality
export function useOnboardingTour() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isRunning, setIsRunning] = useState(false);
    const prevSectionRef = useRef<string | null>(null);

    // Helper to determine which "section" of the app we're in
    const getSection = useCallback((path: string): string => {
        if (path === '/') return 'dashboard';
        if (path.startsWith('/clients')) return 'clients';
        if (path.startsWith('/matching')) return 'matching';
        if (path.startsWith('/search')) return 'search';
        return 'other';
    }, []);

    const currentSection = getSection(pathname);

    const getStepsForPage = useCallback((): DriveStep[] => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const navSelector = isMobile ? "#mobile-bottom-nav" : "#desktop-nav-links";
        const editBtnSelector = isMobile ? "#tour-client-edit-btn-mobile" : "#tour-client-edit-btn";
        const deleteBtnSelector = isMobile ? "#tour-client-delete-btn-mobile" : "#tour-client-delete-btn";
        const showResultsBtnSelector = isMobile ? "#tour-mobile-show-results-btn" : "#tour-show-results-btn";

        // Define steps dynamically to use the correct selector
        const dashboardSteps: DriveStep[] = [
            {
                popover: {
                    title: "👋 Welcome to ShadchanitDB!",
                    description: "This quick tour will show you how to use the matchmaking database. Let's get started!",
                }
            },
            {
                element: navSelector,
                popover: {
                    title: "📍 Navigation Bar",
                    description: `Use the ${isMobile ? 'bottom' : 'top'} navigation bar to switch between Dashboard, Clients, Matching, and Search pages.`,
                }
            },
            {
                element: "[title='Start Tutorial']",
                popover: {
                    title: "❓ Help Icon",
                    description: "Click this icon anytime to restart the tutorial.",
                    side: "bottom" as const,
                }
            },
            {
                element: "#bug-report-btn",
                popover: {
                    title: "🐛 Report a Bug",
                    description: "Found an issue? Click this button to take a screenshot and report it directly to us.",
                    side: "bottom" as const,
                }
            },
            {
                element: "[title='Enter Fullscreen'], [title='Exit Fullscreen']",
                popover: {
                    title: "🖥️ Fullscreen Mode",
                    description: "Toggle fullscreen for a distraction-free experience.",
                    side: "bottom" as const,
                }
            },
            {
                popover: {
                    title: "📊 Dashboard Analytics",
                    description: "This page shows your database overview: total clients, gender distribution, and age statistics. Swipe or use arrows to view different charts.",
                }
            },
            {
                popover: {
                    title: "👥 Next: Client Database",
                    description: "Click 'Next' and then navigate to the Clients page using the navigation bar to continue the tour there!",
                }
            }
        ];

        const clientsSteps: DriveStep[] = [
            {
                popover: {
                    title: "👥 Client Database",
                    description: "Welcome to the Clients page! This is where you manage all your client profiles.",
                }
            },
            {
                element: "a[href='/clients/new']",
                popover: {
                    title: "➕ Add New Client",
                    description: "Click here to expand the 'Add Client' form and see what details are required. You can feel free to explore it! You can resume the tour from there or come back here.",
                    side: "left" as const,
                }
            },
            {
                element: "input[placeholder*='Search']",
                popover: {
                    title: "🔍 Quick Search",
                    description: "Type in this box to search for a client (e.g. 'Cohen'). The tutorial will pause while you type. Click the Help icon (?) to resume and finish the tour!",
                    side: "bottom" as const,
                }
            },
            {
                element: "#tour-client-results-desktop, #tour-client-results-mobile",
                popover: {
                    title: "👀 Real-time Results",
                    description: "The list updates instantly as you type. See how the results match your search.",
                    side: "top" as const,
                }
            },
            {
                element: editBtnSelector,
                popover: {
                    title: "✏️ Edit Client",
                    description: "Click the pencil icon to edit an existing client's details.",
                    side: "left" as const,
                }
            },
            {
                element: deleteBtnSelector,
                popover: {
                    title: "🗑️ Delete Client",
                    description: "Use the trash icon to remove a client from the database.",
                    side: "left" as const,
                }
            },
            {
                popover: {
                    title: "💕 Next: Matching",
                    description: "Navigate to the Matching page to see how to find compatible matches!",
                }
            }
        ];

        const matchingSteps: DriveStep[] = [
            {
                popover: {
                    title: "💕 Smart Matching",
                    description: "Welcome to the Matching page! Find compatible matches for your clients here.",
                }
            },
            {
                element: "#tour-matching-search",
                popover: {
                    title: "🎯 Select a Client",
                    description: "Start typing a name (e.g. 'Shoshana') to find a client.",
                    side: "bottom" as const,
                }
            },
            {
                element: "#tour-matching-search",
                popover: {
                    title: " ",
                    description: " ",
                    side: "bottom" as const,
                }
            },
            {
                popover: {
                    title: "🔍 Next: Search",
                    description: "Navigate to the Search page to explore advanced filtering options!",
                }
            }
        ];

        // Search Steps - Split based on URL state
        const isResultsView = typeof window !== 'undefined' && searchParams.get('view') === 'results';

        const searchStepsInitial: DriveStep[] = [
            {
                popover: {
                    title: "🔍 Advanced Search",
                    description: "Welcome to the Search page! Use powerful filters to find specific clients.",
                }
            },
            {
                element: "#tour-search-filters",
                popover: {
                    title: "🔎 Filter Criteria",
                    description: "Explore these filters! You can search by Name, Age Range, Marital Status, Ethnicity, and more.",
                    side: "right" as const,
                    align: "start" as const,
                }
            },
            {
                element: showResultsBtnSelector,
                popover: {
                    title: "👀 Show Results",
                    description: "Click 'Show Results' to see your matches. After viewing results, click the Help icon (?) again to continue the tutorial!",
                    side: "top" as const,
                }
            }
        ];

        const searchStepsResults: DriveStep[] = [
            ...(isMobile ? [{
                element: "#tour-refine-search-btn",
                popover: {
                    title: "🔧 Refine Search",
                    description: "Need to change something? Click here to adjust your filters.",
                    side: "bottom" as const,
                }
            }] : [{
                element: "#tour-search-filters",
                popover: {
                    title: "🔧 Refine Search",
                    description: "Adjust your filters in this panel to update results.",
                    side: "right" as const,
                }
            }]),
            {
                element: "#tour-logout-btn",
                popover: {
                    title: "🎉 Tour Complete!",
                    description: "You're a ShadchanitDB pro now! Click here to log out when you're done, or continue exploring.",
                    side: "bottom" as const,
                }
            }
        ];

        const searchSteps = isResultsView ? searchStepsResults : searchStepsInitial;

        // Use section-based matching to handle sub-pages like /clients/new or /clients/[id]
        if (pathname === '/') return dashboardSteps;
        if (pathname === '/clients' || pathname.startsWith('/clients/')) return clientsSteps;
        if (pathname === '/matching' || pathname.startsWith('/matching/')) return matchingSteps;
        if (pathname === '/search' || pathname.startsWith('/search/')) return searchSteps;

        // Fallback for unknown pages
        return [
            {
                popover: {
                    title: "📄 Page View",
                    description: "You're viewing a page. Use the navigation bar to explore other sections.",
                }
            }
        ];
    }, [pathname, searchParams]);

    const driverRef = useRef<any>(null);

    // Clean up tour on route change
    useEffect(() => {
        if (driverRef.current) {
            driverRef.current.destroy();
            driverRef.current = null;
            setIsRunning(false);
        }
    }, [pathname]);

    const startTour = useCallback(() => {
        // If not on a main page or sub-page, navigate to dashboard first
        const isValidPage = ['/', '/clients', '/matching', '/search'].includes(pathname) ||
            pathname.startsWith('/clients/') ||
            pathname.startsWith('/matching/') ||
            pathname.startsWith('/search/');

        if (!isValidPage) {
            router.push('/');
            return;
        }

        setIsRunning(true);

        let driverObj: any;

        const steps = getStepsForPage();
        driverObj = driver({
            showProgress: true,
            animate: true,
            overlayColor: "rgba(0, 0, 0, 0.75)",
            stagePadding: 10,
            stageRadius: 8,
            allowClose: true,
            steps: steps,
            popoverClass: "shadchanit-tour-popover",
            nextBtnText: "Next →",
            prevBtnText: "← Back",
            doneBtnText: "Finish!",
            onHighlightStarted: (element, step, options) => {
                // Save progress using driver's active index
                const activeIndex = driverObj.getActiveIndex();
                if (activeIndex !== undefined && activeIndex >= 0) {
                    const nextStep = activeIndex + 1;
                    console.log(`[Tour] Saving step ${nextStep} for section '${currentSection}'`);
                    localStorage.setItem(`tour_step_${currentSection}`, nextStep.toString());
                }

                // Kill tour when typing in the Clients search box
                if (step.element === "input[placeholder*='Search']") {
                    if (element) {
                        element.addEventListener('input', () => {
                            if (driverObj) {
                                driverObj.destroy();
                            }
                        }, { once: true });
                    }
                }

                // Kill tour when typing in the Matching search box
                if (step.element === "#tour-matching-search") {
                    const input = element?.querySelector('input');
                    if (input) {
                        input.addEventListener('input', () => {
                            if (driverObj) {
                                driverObj.destroy();
                            }
                        }, { once: true });
                    }
                }
            },
            onDestroyStarted: () => {
                setIsRunning(false);
                driverObj.destroy();
                driverRef.current = null;
            },
            onDestroyed: () => {
                setIsRunning(false);
                driverRef.current = null;
            }
        });

        driverRef.current = driverObj;
        const savedIndex = parseInt(localStorage.getItem(`tour_step_${currentSection}`) || "0");
        console.log(`[Tour] Loading step for section '${currentSection}': savedIndex=${savedIndex}, steps.length=${steps.length}`);
        // Clamp to valid range
        const startIndex = Math.min(savedIndex, steps.length - 1);
        console.log(`[Tour] Starting at step ${startIndex}`);
        driverObj.drive(startIndex);
    }, [pathname, router, getStepsForPage, currentSection]);

    // Clear saved progress only when changing to a different section
    useEffect(() => {
        if (prevSectionRef.current !== null && prevSectionRef.current !== currentSection) {
            // Section changed - clear the OLD section's progress
            if (typeof window !== 'undefined') {
                localStorage.removeItem(`tour_step_${prevSectionRef.current}`);
            }
        }
        prevSectionRef.current = currentSection;
    }, [currentSection]);

    return { startTour, isRunning };
}

// Optional: Component wrapper for easy integration
export function OnboardingTourProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

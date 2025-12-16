"use client";

import { useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

// Tour step configurations for each page
const DASHBOARD_STEPS: DriveStep[] = [
    {
        popover: {
            title: "👋 Welcome to ShadchanitDB!",
            description: "This quick tour will show you how to use the matchmaking database. Let's get started!",
        }
    },
    {
        element: "nav",
        popover: {
            title: "📍 Navigation Bar",
            description: "Use the top navigation to switch between Dashboard, Clients, Matching, and Search pages.",
            side: "bottom" as const,
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
            description: "Click 'Next' and then navigate to the Clients page using the top navigation to continue the tour there!",
        }
    }
];

const CLIENTS_STEPS: DriveStep[] = [
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
            description: "Click this button to add a new client. You'll fill out a multi-step form with all their details.",
            side: "left" as const,
        }
    },
    {
        element: "input[placeholder*='Search']",
        popover: {
            title: "🔍 Quick Search",
            description: "Type here to quickly filter clients by name.",
            side: "bottom" as const,
        }
    },
    {
        popover: {
            title: "📋 Client List",
            description: "Click on a client's name to view their full profile. Use the pencil icon to edit, or the trash icon to delete.",
        }
    },
    {
        popover: {
            title: "💕 Next: Matching",
            description: "Navigate to the Matching page to see how to find compatible matches!",
        }
    }
];

const MATCHING_STEPS: DriveStep[] = [
    {
        popover: {
            title: "💕 Smart Matching",
            description: "Welcome to the Matching page! Find compatible matches for your clients here.",
        }
    },
    {
        popover: {
            title: "🎯 Select a Client",
            description: "Use the dropdown to select a client. Try searching for 'Shoshana Brown' to see an example! The system will find compatible matches based on preferences and deal-breakers.",
        }
    },
    {
        popover: {
            title: "⬅️ ➡️ Browse Matches",
            description: "Use the Previous/Next buttons to browse through potential matches. Click on a match to view their full profile.",
        }
    },
    {
        popover: {
            title: "🔍 Next: Search",
            description: "Navigate to the Search page to explore advanced filtering options!",
        }
    }
];

const SEARCH_STEPS: DriveStep[] = [
    {
        popover: {
            title: "🔍 Advanced Search",
            description: "Welcome to the Search page! Use powerful filters to find specific clients.",
        }
    },
    {
        popover: {
            title: "🔎 Dynamic Filters",
            description: "Apply filters like gender, location, and age range. Results update dynamically as you change filters.",
        }
    },
    {
        popover: {
            title: "📋 Search Results",
            description: "Click on any result to view their full profile. Use 'Refine Search' to go back and adjust your filters.",
        }
    },
    {
        popover: {
            title: "🎉 Tour Complete!",
            description: "You now know how to use ShadchanitDB! Remember, click the Help icon (?) anytime to restart this tour.",
        }
    }
];

// Custom hook to provide tour functionality
export function useOnboardingTour() {
    const router = useRouter();
    const pathname = usePathname();
    const [isRunning, setIsRunning] = useState(false);

    const getStepsForPage = useCallback((): DriveStep[] => {
        switch (pathname) {
            case "/":
                return DASHBOARD_STEPS;
            case "/clients":
                return CLIENTS_STEPS;
            case "/matching":
                return MATCHING_STEPS;
            case "/search":
                return SEARCH_STEPS;
            default:
                // For other pages (like client details), provide a minimal tour
                return [
                    {
                        popover: {
                            title: "📄 Profile View",
                            description: "You're viewing a client profile. Use the Edit button to modify details, or Delete to remove the client.",
                        }
                    },
                    {
                        popover: {
                            title: "⬅️ Navigation",
                            description: "Click 'Back' at the top to return to the previous page.",
                        }
                    }
                ];
        }
    }, [pathname]);

    const startTour = useCallback(() => {
        // If not on a main page, navigate to dashboard first
        if (!["/", "/clients", "/matching", "/search"].includes(pathname) && !pathname.startsWith("/clients/")) {
            router.push("/");
            return;
        }

        setIsRunning(true);

        const driverObj = driver({
            showProgress: true,
            animate: true,
            overlayColor: "rgba(0, 0, 0, 0.75)",
            stagePadding: 10,
            stageRadius: 8,
            allowClose: true,
            steps: getStepsForPage(),
            popoverClass: "shadchanit-tour-popover",
            nextBtnText: "Next →",
            prevBtnText: "← Back",
            doneBtnText: "Finish!",
            onDestroyStarted: () => {
                setIsRunning(false);
                driverObj.destroy();
            },
            onDestroyed: () => {
                setIsRunning(false);
            }
        });

        driverObj.drive();
    }, [pathname, router, getStepsForPage]);

    return { startTour, isRunning };
}

// Optional: Component wrapper for easy integration
export function OnboardingTourProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

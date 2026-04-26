"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/login", "/signup"];
const PUBLIC_PATH_PREFIXES = ["/form/"]; // External form routes

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const isPublicPath = PUBLIC_PATHS.includes(pathname) || PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
        
        // If we are on a public path, we don't need to check auth
        if (isPublicPath) {
            setIsChecking(false);
            return;
        }

        // If we are not authenticated, redirect to login
        // We need to wait for the initial auth check from AuthContext (which uses useEffect)
        // However, AuthContext doesn't expose a 'loading' state currently.
        // We can rely on the fact that if user is null, we might be logged out OR loading.
        // But since AuthContext runs its effect on mount, we might have a race condition.
        // A safer bet for this MVP is:

        const checkAuth = () => {
            const storedUser = localStorage.getItem("mock_user");
            if (!storedUser && !user) {
                router.push("/login");
            }
            setIsChecking(false);
        };

        // Small timeout to allow AuthContext to initialize from localStorage
        const timeout = setTimeout(checkAuth, 100);
        return () => clearTimeout(timeout);

    }, [user, pathname, router]);

    // Prevent navigation to protected routes from external form pages
    useEffect(() => {
        const isOnExternalForm = PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
        
        if (isOnExternalForm) {
            // Store that we're on an external form page
            sessionStorage.setItem("isExternalFormUser", "true");
            // Clear any auth tokens to prevent access
            localStorage.removeItem("mock_user");
            localStorage.removeItem("auth_token");
        } else {
            // If not on external form, check if user came from external form
            const wasExternalFormUser = sessionStorage.getItem("isExternalFormUser");
            if (wasExternalFormUser && !PUBLIC_PATHS.includes(pathname)) {
                // User from external form trying to access protected route - block access
                sessionStorage.removeItem("isExternalFormUser");
                // Clear any auth tokens
                localStorage.removeItem("mock_user");
                localStorage.removeItem("auth_token");
                // Redirect to login (don't allow access)
                router.replace("/login");
                return;
            }
        }
    }, [pathname, router]);

    if (isChecking && !PUBLIC_PATHS.includes(pathname) && !PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // If we are on a public path, we don't need to check auth
        if (PUBLIC_PATHS.includes(pathname)) {
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

    if (isChecking && !PUBLIC_PATHS.includes(pathname)) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}

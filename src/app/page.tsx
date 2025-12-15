"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardAnalytics from "@/components/DashboardAnalytics";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-4 pb-20 md:pb-0">
      <div className="shrink-0 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name.split(' ')[0]}. Here is an overview of your matchmaking database.</p>
      </div>

      {/* Placeholder for dashboard widgets */}
      <div className="flex-1 min-h-0">
        <DashboardAnalytics />
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardAnalytics from "@/components/DashboardAnalytics";
import { LayoutDashboard } from "lucide-react";

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
      <div className="flex items-center justify-between shrink-0 px-1 pt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-red-600" />
            Dashboard
          </h1>
          <p className="text-muted-foreground hidden md:block">Welcome back, {user.name.split(' ')[0]}. Here is an overview of your matchmaking database.</p>
        </div>
      </div>

      {/* Placeholder for dashboard widgets */}
      <div className="flex-1 min-h-0">
        <DashboardAnalytics />
      </div>
    </div>
  );
}

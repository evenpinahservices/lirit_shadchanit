import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ClientProvider } from "@/context/ClientContext";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/ui/Navbar";
import { BottomNav } from "@/components/ui/BottomNav";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShadchanitDB - Matchmaking Database",
  description: "Client management and matchmaking system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-gray-50 dark:bg-gray-900")}>
        <AuthProvider>
          <ClientProvider>
            <AuthGuard>
              <div className="flex flex-col h-full max-h-dvh">
                <Navbar />
                <main className="flex-1 overflow-y-auto container mx-auto py-8 px-4 scroll-smooth">
                  {children}
                </main>
                <BottomNav />
              </div>
            </AuthGuard>
          </ClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

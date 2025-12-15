import type { Metadata, Viewport } from "next";
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

// Lock viewport to 412x892 (Galaxy A35) for consistent rendering
export const viewport: Viewport = {
  width: 412,
  height: 892,
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
                <main className="flex-1 overflow-hidden flex flex-col container mx-auto pt-2 px-4">
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


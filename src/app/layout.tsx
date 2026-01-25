import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ClientProvider } from "@/context/ClientContext";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/ui/Navbar";
import { BottomNav } from "@/components/ui/BottomNav";
import { AutoFullscreen } from "@/components/AutoFullscreen";
import { KeyboardScrollHandler } from "@/components/KeyboardScrollHandler";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap", // Optimize font loading - shows fallback font until custom font loads
  preload: false, // Disable preload to avoid the warning (font will still load, just not preloaded)
  adjustFontFallback: true, // Better fallback font matching
});

export const metadata: Metadata = {
  title: "ShadchanitDB - Matchmaking Database",
  description: "Client management and matchmaking system",
};

// Responsive viewport - scales to device width
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  // Prevent keyboard from causing layout issues
  interactiveWidget: "resizes-visual",
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
              <AutoFullscreen />
              <KeyboardScrollHandler />
              <div className="flex flex-col h-dvh min-h-0 overflow-hidden">
                <Suspense fallback={null}>
                  <Navbar />
                </Suspense>
                <main className="flex-1 min-h-0 overflow-hidden flex flex-col w-full pt-2 px-4 pb-16 md:pb-2">
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


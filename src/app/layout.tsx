import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getBrand, currentBrandId } from "@/config/branding";
import { AuthProvider } from "@/context/AuthContext";
import { ClientProvider } from "@/context/ClientContext";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/ui/Navbar";
import { BottomNav } from "@/components/ui/BottomNav";
import { PWARegister } from "@/components/PWARegister";
import { KeyboardScrollHandler } from "@/components/KeyboardScrollHandler";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const brand = getBrand();

export const metadata: Metadata = {
  title: brand.appName,
  description: "Client management and matchmaking system",
  manifest: "/manifest.webmanifest",
  themeColor: brand.themeColor,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: brand.themeColor,
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-brand={currentBrandId}>
      <body className={cn(inter.className, "min-h-screen bg-gray-50 dark:bg-gray-900")}>
        <PWARegister />
        <AuthProvider>
          <ClientProvider>
            <AuthGuard>
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


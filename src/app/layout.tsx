import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ClientProvider } from "@/context/ClientContext";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/ui/Navbar";
import { BottomNav } from "@/components/ui/BottomNav";
import { AutoFullscreen } from "@/components/AutoFullscreen";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

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
              <div className="flex flex-col h-full max-h-dvh min-h-0 overflow-hidden">
                <Suspense fallback={null}>
                  <Navbar />
                </Suspense>
                <main className="flex-1 min-h-0 overflow-hidden flex flex-col container mx-auto pt-2 px-4">
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


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientForm } from "@/components/clients/ClientForm";
import { AutoFillModal } from "@/components/clients/AutoFillModal";
import { FormLanguage } from "@/lib/translations";
import { Globe, Languages, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createPendingClient } from "@/actions/pendingClient";
import { flattenAiFormDataForPending } from "@/lib/flattenAiFormData";
import { useBackgroundAiProgress } from "@/context/BackgroundAiProgressContext";

type FormMode = FormLanguage | "ai";

export default function NewClientPage() {
    const router = useRouter();
    const aiProgress = useBackgroundAiProgress();
    const isUploadInProgress = aiProgress?.isProcessing ?? false;
    const [selectedMode, setSelectedMode] = useState<FormMode | null>(null);
    const [showAutoFillModal, setShowAutoFillModal] = useState(false);
    const [autoFillData, setAutoFillData] = useState<any>(null);
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
    const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    // Mode selection screen — single column, explicit spacing so title and subtitles never overlap at any viewport
    if (!selectedMode) {
        return (
            <div className="w-full h-full min-h-0 flex flex-col overflow-x-hidden">
                <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 flex-1 min-h-0 flex flex-col gap-3 sm:gap-6 py-4 sm:py-6">
                    {/* Title: compact on mobile so all fits in viewport */}
                    <header className="text-center shrink-0 space-y-1 sm:space-y-2" dir="ltr">
                        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            Add New Client
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-base" dir="rtl">
                            הוספת לקוח חדש
                        </p>
                    </header>

                    {/* Subtitle: compact on mobile */}
                    <section className="text-center shrink-0 space-y-0.5 sm:space-y-2" dir="ltr">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Select Form Language
                        </h2>
                        <p className="text-muted-foreground text-xs sm:text-base" dir="rtl">
                            בחר את שפת הטופס
                        </p>
                    </section>

                    {/* Options: take remaining space so no scroll needed */}
                    <div className="flex-1 min-h-0 flex flex-col sm:flex-row items-stretch gap-2 sm:gap-6 w-full">
                                    {/* Auto-Generate Option - Only for admin users (first) */}
                                    {isAdmin && (
                                        <button
                                            onClick={() => !isUploadInProgress && setSelectedMode("ai")}
                                            disabled={isUploadInProgress}
                                            className="group relative flex flex-col items-center justify-center border-2 border-gray-200 rounded-xl sm:rounded-2xl hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer w-full flex-1 min-h-0 p-3 sm:p-6 md:p-8 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                                        >
                                            <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-1 sm:mb-2 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors shrink-0">
                                                <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <span className="text-sm sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">Auto-Generate</span>
                                            <span className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Gemini-Powered Extraction</span>
                                        </button>
                                    )}

                                    {/* English Option */}
                                    <button
                                        onClick={() => !isUploadInProgress && setSelectedMode("en")}
                                        disabled={isUploadInProgress}
                                        className="group relative flex flex-col items-center justify-center border-2 border-gray-200 rounded-xl sm:rounded-2xl hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer w-full flex-1 min-h-0 p-3 sm:p-6 md:p-8 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                                    >
                                        <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-1 sm:mb-2 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors shrink-0">
                                            <Globe className="w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="text-sm sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">English</span>
                                        <span className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">English Form</span>
                                    </button>

                                    {/* Hebrew Option */}
                                    <button
                                        onClick={() => !isUploadInProgress && setSelectedMode("he")}
                                        disabled={isUploadInProgress}
                                        className="group relative flex flex-col items-center justify-center border-2 border-gray-200 rounded-xl sm:rounded-2xl hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer w-full flex-1 min-h-0 p-3 sm:p-6 md:p-8 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                                    >
                                        <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-1 sm:mb-2 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors shrink-0">
                                            <Languages className="w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 text-green-600 dark:text-green-400" />
                                        </div>
                                        <span className="text-sm sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">עברית</span>
                                        <span className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">טופס בעברית</span>
                                    </button>
                    </div>
                </div>
            </div>
        );
    }

    // Handle AutoFill: create pending draft and redirect to inbox so uploads/form are never lost
    const handleAiComplete = async (payload: { formData: any; galleryUrls: string[]; profilePhotoUrl: string | null }) => {
        try {
            const flat = flattenAiFormDataForPending({
                formData: payload.formData,
                galleryUrls: payload.galleryUrls,
                profilePhotoUrl: payload.profilePhotoUrl,
            });
            const pending = await createPendingClient({
                ...flat,
                source: "admin_ai_draft",
                sourceDescription: "AI-generated form by admin",
            } as any);
            router.push(`/inbox/${pending.id}`);
        } catch (err: any) {
            console.error("Failed to create AI draft:", err);
            const msg = err?.message?.includes("Server Components render")
                ? "A server error occurred. Please try again or check the Vercel logs for details."
                : (err?.message || "Unknown error");
            alert("Failed to save draft: " + msg);
        }
    };

    // Legacy callbacks when not using onComplete (e.g. if modal used elsewhere)
    const handleAutoFill = (data: any) => {
        setAutoFillData(data);
        setSelectedMode("en");
    };

    const handleAddToGallery = (urls: string[]) => {
        setGalleryUrls(urls);
    };

    const handleSetProfilePhoto = (url: string) => {
        setProfilePhotoUrl(url);
    };

    const handleCloseAutoFill = () => {
        if (selectedMode === "ai") {
            setSelectedMode(null);
        }
    };

    // Form with selected language
    const selectedLanguage = selectedMode as FormLanguage;
    
    return (
        <>
            {/* AutoFill Modal - shown when AI option is selected (full screen) */}
            {selectedMode === "ai" && isAdmin && (
                <AutoFillModal
                    isOpen={true}
                    onClose={handleCloseAutoFill}
                    onFillForm={handleAutoFill}
                    onAddToGallery={handleAddToGallery}
                    onSetProfilePhoto={handleSetProfilePhoto}
                    onComplete={handleAiComplete}
                    fullScreen={true}
                />
            )}
            
            {/* Regular form (manual English/Hebrew only; AI flow redirects to inbox) */}
            {selectedMode && selectedMode !== "ai" && (
                <div className={`w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden ${selectedLanguage === "he" ? "rtl" : "ltr"}`} dir={selectedLanguage === "he" ? "rtl" : "ltr"}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 mb-2 pt-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
                                {selectedLanguage === "he" ? "הוספת לקוח חדש" : "Add New Client"}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5 break-words">
                                {selectedLanguage === "he" 
                                    ? "הזן את הפרטים עבור פרופיל הלקוח החדש."
                                    : "Enter the details for the new client profile."}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedMode(null);
                                setAutoFillData(null);
                                setGalleryUrls([]);
                                setProfilePhotoUrl("");
                            }}
                            className="shrink-0 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full sm:w-auto"
                        >
                            <Languages className="w-4 h-4" />
                            {selectedLanguage === "he" ? "Change / שנה שפה" : "Change Language"}
                        </button>
                    </div>
                    <ClientForm 
                        language={selectedLanguage} 
                        initialAutoFillData={autoFillData}
                        initialGalleryUrls={galleryUrls}
                        initialProfilePhotoUrl={profilePhotoUrl}
                        hideAutoFillOptions={true}
                    />
                </div>
            )}
        </>
    );
}

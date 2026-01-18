"use client";

import { useState } from "react";
import { ClientForm } from "@/components/clients/ClientForm";
import { FormLanguage } from "@/lib/translations";
import { Globe, Languages } from "lucide-react";

export default function NewClientPage() {
    const [selectedLanguage, setSelectedLanguage] = useState<FormLanguage | null>(null);

    // Language selection screen
    if (!selectedLanguage) {
        return (
            <div className="w-full space-y-6 pt-4">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Add New Client</h1>
                    <p className="text-muted-foreground mt-2">הוספת לקוח חדש</p>
                </div>

                <div className="w-full">
                    <div className="mt-8 sm:mt-12">
                        <h2 className="text-lg sm:text-xl font-semibold text-center mb-2">Select Form Language</h2>
                        <p className="text-center text-muted-foreground mb-4 sm:mb-6 md:mb-8">בחר את שפת הטופס</p>

                        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pb-6 sm:pb-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12 w-full">
                                {/* English Option */}
                                <button
                                    onClick={() => setSelectedLanguage("en")}
                                    className="group relative flex flex-col items-center justify-center p-4 sm:p-8 md:p-10 lg:p-12 xl:p-16 border-2 border-gray-200 rounded-xl sm:rounded-2xl hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer w-full min-h-[160px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px]"
                                >
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                        <Globe className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-blue-600 dark:text-blue-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                                    </div>
                                    <span className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-gray-100">English</span>
                                    <span className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-400 mt-1">English Form</span>
                                </button>

                                {/* Hebrew Option */}
                                <button
                                    onClick={() => setSelectedLanguage("he")}
                                    className="group relative flex flex-col items-center justify-center p-4 sm:p-8 md:p-10 lg:p-12 xl:p-16 border-2 border-gray-200 rounded-xl sm:rounded-2xl hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer w-full min-h-[160px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px]"
                                >
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                        <Languages className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-green-600 dark:text-green-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                                    </div>
                                    <span className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-gray-100">עברית</span>
                                    <span className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-400 mt-1">טופס בעברית</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Form with selected language
    return (
        <div className={`w-full h-full flex flex-col flex-1 min-h-0 ${selectedLanguage === "he" ? "rtl" : "ltr"}`} dir={selectedLanguage === "he" ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between shrink-0 mb-2 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {selectedLanguage === "he" ? "הוספת לקוח חדש" : "Add New Client"}
                    </h1>
                    <p className="text-muted-foreground">
                        {selectedLanguage === "he" 
                            ? "הזן את הפרטים עבור פרופיל הלקוח החדש."
                            : "Enter the details for the new client profile."}
                    </p>
                </div>
                <button
                    onClick={() => setSelectedLanguage(null)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <Languages className="w-4 h-4" />
                    {selectedLanguage === "he" ? "Change / שנה שפה" : "Change Language"}
                </button>
            </div>
            <ClientForm language={selectedLanguage} />
        </div>
    );
}

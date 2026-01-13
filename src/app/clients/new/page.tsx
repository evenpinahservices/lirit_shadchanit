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
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Add New Client</h1>
                    <p className="text-muted-foreground mt-2">הוספת לקוח חדש</p>
                </div>

                <div className="mt-12">
                    <h2 className="text-xl font-semibold text-center mb-2">Select Form Language</h2>
                    <p className="text-center text-muted-foreground mb-8">בחר את שפת הטופס</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        {/* English Option */}
                        <button
                            onClick={() => setSelectedLanguage("en")}
                            className="group relative flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-2xl hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer"
                        >
                            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                            </div>
                            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">English</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">English Form</span>
                        </button>

                        {/* Hebrew Option */}
                        <button
                            onClick={() => setSelectedLanguage("he")}
                            className="group relative flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-2xl hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                <Languages className="w-8 h-8 text-green-600 dark:text-green-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                            </div>
                            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">עברית</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">טופס בעברית</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Form with selected language
    return (
        <div className={`w-full h-full flex flex-col flex-1 min-h-0 ${selectedLanguage === "he" ? "rtl" : "ltr"}`} dir={selectedLanguage === "he" ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between shrink-0 mb-2">
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

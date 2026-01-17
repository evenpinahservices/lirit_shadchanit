"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createPendingClient, getPendingClientByIdentifier, updatePendingClient } from "@/actions/pendingClient";
import { getApprovedClientByIdentifier } from "@/actions/client";
import { ClientForm } from "@/components/clients/ClientForm";
import { FormLanguage } from "@/lib/translations";
import { Globe, Languages, AlertCircle, Edit, Mail, Phone, CheckCircle2 } from "lucide-react";
import { Client } from "@/lib/mockData";

export default function ExternalFormPage() {
    const params = useParams();
    const token = params.token as string;
    
    const [selectedLanguage, setSelectedLanguage] = useState<FormLanguage | null>(null);
    const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState<Client | null>(null);
    const [existingPendingId, setExistingPendingId] = useState<string | null>(null);
    
    // Identifier state
    const [identifierEntered, setIdentifierEntered] = useState(false);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setIsValidToken(false);
                setIsLoading(false);
                return;
            }
            setIsValidToken(true);
            setIsLoading(false);
        };

        validateToken();
    }, [token]);

    // Handle identifier submission
    const handleIdentifierSubmit = async () => {
        if (!email.trim() && !phone.trim()) {
            alert("Please provide either an email or phone number");
            return;
        }
        
        setIsLoadingSubmission(true);
        try {
            // First check for pending submission (takes priority - they can edit pending)
            const existingPending = await getPendingClientByIdentifier(
                email.trim() || undefined, 
                phone.trim() || undefined
            );
            
            if (existingPending) {
                // Convert to Client format (remove pending-specific fields)
                const { submittedAt, submittedBy, token: _, id, ...clientData } = existingPending as any;
                setExistingSubmission(clientData as Client);
                setExistingPendingId(id); // Store the pending client ID for updating
            } else {
                // No pending submission, check if there's an approved client
                const approvedClient = await getApprovedClientByIdentifier(
                    email.trim() || undefined,
                    phone.trim() || undefined
                );
                
                if (approvedClient) {
                    // Use approved client data to pre-fill the form
                    // This allows them to edit their approved profile
                    // Don't set existingPendingId - approved clients create new pending entries
                    setExistingSubmission(approvedClient);
                    setExistingPendingId(null);
                }
            }
            
            setIdentifierEntered(true);
        } catch (error) {
            console.error("Error looking up submission:", error);
            // Continue anyway - might be a new submission
            setIdentifierEntered(true);
        } finally {
            setIsLoadingSubmission(false);
        }
    };

    // Language selection screen
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading form...</p>
                </div>
            </div>
        );
    }

    if (!isValidToken) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="text-center max-w-md mx-auto p-6">
                    <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Invalid Form Link</h1>
                    <p className="text-muted-foreground mb-4">
                        This form link is invalid or has expired. Please contact the administrator for a new link.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        const isHebrew = selectedLanguage === "he";
        return (
            <div className={`flex items-center justify-center h-full min-h-screen ${isHebrew ? "rtl" : "ltr"}`} dir={isHebrew ? "rtl" : "ltr"}>
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">
                        {isHebrew ? "תודה רבה!" : "Thank You!"}
                    </h1>
                    <p className="text-muted-foreground">
                        {isHebrew 
                            ? "הטופס שלך נשלח בהצלחה. הוא ייבדק על ידי מנהל ויתווסף למסד הנתונים לאחר אישור."
                            : "Your form has been submitted successfully. It will be reviewed by an administrator and added to the database upon approval."
                        }
                    </p>
                </div>
            </div>
        );
    }

    // Identifier entry screen (before language selection)
    if (isValidToken && !identifierEntered) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight mb-2">
                            Client Registration Form
                        </h1>
                        <p className="text-muted-foreground mb-2">טופס רישום לקוח</p>
                        <p className="text-muted-foreground text-sm">
                            Please provide your email or phone number to continue.
                        </p>
                        <p className="text-muted-foreground text-sm">
                            אנא הזן את האימייל או מספר הטלפון שלך כדי להמשיך.
                        </p>
                    </div>

                    <div className="space-y-4 bg-white dark:bg-gray-950 p-6 rounded-lg border shadow-sm">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email (optional) / אימייל (אופציונלי)
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                className="w-full p-2 border rounded-md dark:bg-gray-900"
                                dir="ltr"
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-950 text-gray-500">OR / או</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Phone Number (optional) / מספר טלפון (אופציונלי)
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1-555-123-4567"
                                className="w-full p-2 border rounded-md dark:bg-gray-900"
                                dir="ltr"
                            />
                        </div>

                        <button
                            onClick={handleIdentifierSubmit}
                            disabled={isLoadingSubmission || (!email.trim() && !phone.trim())}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoadingSubmission ? "Loading... / טוען..." : "Continue / המשך"}
                        </button>

                        <p className="text-xs text-muted-foreground text-center">
                            We use this to identify your submission if you need to edit it later.
                            <br />
                            אנו משתמשים בזה כדי לזהות את הגשתך אם תצטרך לערוך אותה מאוחר יותר.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedLanguage) {
        // If editing existing submission, show simple edit button instead of language selection
        if (existingSubmission) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
                    <div className="text-center max-w-md">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                Profile Found
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            We found your previous submission. You can edit and resubmit it.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            מצאנו את הגשתך הקודמת. תוכל לערוך ולשלוח מחדש.
                        </p>
                    </div>
                    <button
                        onClick={() => setSelectedLanguage(existingSubmission.formLanguage || "en")}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                    >
                        <Edit className="h-4 w-4" />
                        Edit & Resubmit
                    </button>
                </div>
            );
        }

        // New submission - show language selection
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-3xl w-full space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight">Client Registration Form</h1>
                        <p className="text-muted-foreground mt-2">טופס רישום לקוח</p>
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
            </div>
        );
    }

    // Form with selected language
    return (
        <div className={`min-h-screen flex flex-col ${selectedLanguage === "he" ? "rtl" : "ltr"}`} dir={selectedLanguage === "he" ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between shrink-0 mb-2 px-4 pt-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {existingSubmission 
                            ? (selectedLanguage === "he" ? "עריכת פרופיל" : "Edit Your Profile")
                            : (selectedLanguage === "he" ? "טופס רישום לקוח" : "Client Registration Form")
                        }
                    </h1>
                    <p className="text-muted-foreground">
                        {existingSubmission
                            ? (selectedLanguage === "he"
                                ? "ערוך את הפרטים שלך ושלח מחדש לבדיקה."
                                : "Edit your information and resubmit for review.")
                            : (selectedLanguage === "he" 
                                ? "הזן את הפרטים עבור פרופיל הלקוח."
                                : "Enter your details to create your client profile.")
                        }
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
            <ExternalClientForm 
                language={selectedLanguage} 
                token={token}
                existingClient={existingSubmission}
                existingPendingId={existingPendingId}
                identifierEmail={email.trim() || undefined}
                identifierPhone={phone.trim() || undefined}
                onSuccess={(newPendingId) => {
                    // Update the pending ID if a new one was created
                    if (newPendingId && !existingPendingId) {
                        setExistingPendingId(newPendingId);
                    }
                    setSubmitted(true);
                }}
            />
        </div>
    );
}

// Custom wrapper component that handles pending submission
function ExternalClientForm({ 
    language, 
    token,
    existingClient,
    existingPendingId,
    identifierEmail,
    identifierPhone,
    onSuccess 
}: { 
    language: FormLanguage; 
    token: string;
    existingClient?: Client | null;
    existingPendingId?: string | null;
    identifierEmail?: string;
    identifierPhone?: string;
    onSuccess: (newPendingId?: string) => void;
}) {
    const handleSubmitToPending = async (values: any) => {
        try {
            // Remove internal/admin-only fields for external forms (keep references)
            const { notes, resumeRawText, ...clientValues } = values;
            
            // If there's an existing pending entry (not approved), update it instead of creating new
            if (existingPendingId) {
                await updatePendingClient(existingPendingId, {
                    ...clientValues,
                    token,
                    source: "client_form",
                    sourceDescription: "Resubmitted by client via form link (edited)",
                });
                onSuccess(existingPendingId); // Pass back the same ID
            } else {
                // Check if client is already approved (will create new pending entry)
                const isApproved = existingClient && existingClient.id && !existingPendingId;
                
                // Create a NEW pending client entry
                // If editing an approved client, explicitly pass the approved client ID
                // This ensures createPendingClient can set existingApprovedClientId correctly
                const pendingData: any = {
                    ...clientValues,
                    token,
                    submittedAt: new Date().toISOString(),
                    source: "client_form",
                    sourceDescription: isApproved
                        ? "Resubmitted by client via form link (will overwrite approved profile)"
                        : "Submitted by client via form link",
                };
                
                // Explicitly set existingApprovedClientId if editing an approved client
                if (isApproved && existingClient.id) {
                    pendingData.existingApprovedClientId = existingClient.id;
                    console.log("Form submission - Setting existingApprovedClientId:", existingClient.id);
                }
                
                console.log("Form submission - Creating pending client with data:", {
                    email: pendingData.email,
                    phone: pendingData.phone,
                    existingApprovedClientId: pendingData.existingApprovedClientId,
                    isApproved
                });
                
                const newPending = await createPendingClient(pendingData);
                onSuccess(newPending.id); // Pass back the new pending ID
            }
        } catch (error: any) {
            console.error("Failed to submit form:", error);
            alert("Failed to submit form: " + (error.message || error));
            throw error; // Re-throw to let ClientForm handle the error state
        }
    };
    
    // Merge identifier values with existing client data
    // Always use identifier values to pre-fill email/phone fields if provided
    // This ensures the information entered in the first step appears in the form
    const clientWithIdentifier: Client | undefined = existingClient 
        ? {
            ...existingClient,
            // Pre-fill with identifier values if provided, otherwise use existing client values
            email: identifierEmail || existingClient.email || "",
            phone: identifierPhone || existingClient.phone || "",
        }
        : identifierEmail || identifierPhone
            ? {
                // Create a minimal client object with identifier info for pre-filling
                id: "",
                fullName: "",
                email: identifierEmail || "",
                phone: identifierPhone || "",
                dob: "",
                gender: "Male" as const,
                location: "",
                height: 0,
                eyeColor: "",
                hairColor: "",
                tribalStatus: "",
                maritalStatus: "",
                children: 0,
                religiousAffiliation: [],
                learningStatus: "",
                ethnicity: "",
                familyBackground: "",
                education: "",
                occupation: "",
                languages: [],
                hobbies: "",
                personality: "",
                ageGapPreference: [],
                willingToRelocate: "",
                medicalHistory: false,
                smoking: "",
                headCovering: "",
                references: "",
                notes: "",
                resumeRawText: "",
                active: true,
                photoUrl: "",
                preferredEthnicities: [],
                preferredHashkafos: [],
                preferredLearningStatus: [],
                preferredHeadCovering: [],
                formLanguage: language,
                createdAt: "",
            } as Client
            : undefined;

    return (
        <ClientForm 
            client={clientWithIdentifier}
            language={language}
            onSubmitToPending={handleSubmitToPending}
            isExternalForm={true}
        />
    );
}

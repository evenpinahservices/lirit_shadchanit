"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { createPendingClient, getPendingClientByIdentifier, updatePendingClient, validateAndIncrementToken, validateTokenOnly } from "@/actions/pendingClient";
import { getApprovedClientByIdentifier } from "@/actions/client";
import { saveFormDraft, getFormDraft, deleteFormDraft } from "@/actions/formDraft";
import { ClientForm } from "@/components/clients/ClientForm";
import { FormLanguage } from "@/lib/translations";
import { Globe, Languages, AlertCircle, Edit, Mail, Phone, CheckCircle2, RotateCcw } from "lucide-react";
import { Client } from "@/lib/mockData";
import { ErrorAlertModal } from "@/components/ui/ErrorAlertModal";
import { getFriendlyError } from "@/lib/errorMessages";
import type { FriendlyError } from "@/lib/errorMessages";

export default function ExternalFormPage() {
    const params = useParams();
    const token = params.token as string;
    
    const [selectedLanguage, setSelectedLanguage] = useState<FormLanguage | null>(null);
    const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState<Client | null>(null);
    const [existingPendingId, setExistingPendingId] = useState<string | null>(null);
    
    // Draft state
    const [existingDraft, setExistingDraft] = useState<{
        formLanguage: "en" | "he";
        currentStep: number;
        data: Record<string, any>;
        lastSavedAt: string;
    } | null>(null);
    
    // Identifier state
    const [identifierEntered, setIdentifierEntered] = useState(false);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
    const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setIsValidToken(false);
                setIsLoading(false);
                return;
            }
            
            const sessionKey = `token_validated_${token}`;
            const alreadyValidated = sessionStorage.getItem(sessionKey);

            let isValid: boolean;
            if (alreadyValidated) {
                // Already counted this session -- just check validity without incrementing
                isValid = await validateTokenOnly(token);
            } else {
                isValid = await validateAndIncrementToken(token);
                if (isValid) {
                    sessionStorage.setItem(sessionKey, "1");
                }
            }

            setIsValidToken(isValid);
            setIsLoading(false);
        };

        validateToken();
    }, [token]);

    // Prevent navigation away from external form page (security)
    useEffect(() => {
        // Mark that we're on an external form
        sessionStorage.setItem("isExternalFormUser", "true");
        
        // Intercept browser back/forward navigation
        const handlePopState = (e: PopStateEvent) => {
            // If user tries to navigate away, redirect back to form
            const currentPath = window.location.pathname;
            if (!currentPath.startsWith("/form/") && currentPath !== "/login") {
                // User navigated away - redirect back to form
                e.preventDefault();
                window.history.pushState(null, "", `/form/${token}`);
                window.location.reload();
            }
        };

        // Intercept all link clicks to prevent navigation
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (link && link.href) {
                const url = new URL(link.href);
                // Only allow navigation within the same form page
                if (!url.pathname.startsWith(`/form/${token}`) && url.pathname !== "/login") {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        };

        // Intercept programmatic navigation
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;
        
        window.history.pushState = function(...args) {
            const newPath = args[2] as string;
            if (newPath && !newPath.startsWith("/form/") && newPath !== "/login") {
                console.warn("Navigation blocked: External form users cannot navigate to protected routes");
                return;
            }
            return originalPushState.apply(window.history, args);
        };
        
        window.history.replaceState = function(...args) {
            const newPath = args[2] as string;
            if (newPath && !newPath.startsWith("/form/") && newPath !== "/login") {
                console.warn("Navigation blocked: External form users cannot navigate to protected routes");
                return;
            }
            return originalReplaceState.apply(window.history, args);
        };

        // Override history to prevent navigation
        window.history.pushState(null, "", window.location.href);
        window.addEventListener("popstate", handlePopState);
        document.addEventListener("click", handleClick, true); // Use capture phase

        return () => {
            window.removeEventListener("popstate", handlePopState);
            document.removeEventListener("click", handleClick, true);
            // Restore original functions
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
        };
    }, [token]);

    // Handle identifier submission
    const handleIdentifierSubmit = async () => {
        if (!email.trim() && !phone.trim()) {
            setFriendlyError(getFriendlyError("Please provide either an email or phone number", "submit-form"));
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
                setExistingPendingId(id);
            } else {
                // No pending submission, check if there's an approved client
                const approvedClient = await getApprovedClientByIdentifier(
                    email.trim() || undefined,
                    phone.trim() || undefined
                );
                
                if (approvedClient) {
                    setExistingSubmission(approvedClient);
                    setExistingPendingId(null);
                } else {
                    // No pending or approved -- check for an in-progress draft
                    const draft = await getFormDraft(
                        email.trim() || undefined,
                        phone.trim() || undefined
                    );
                    if (draft) {
                        setExistingDraft(draft);
                    }
                }
            }
            
            setIdentifierEntered(true);
        } catch (error) {
            console.error("Error looking up submission:", error);
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
                        This form link is invalid or has expired. Please contact the matchmaker (shadchanit) for a new link.
                    </p>
                    <h1 className="text-2xl font-bold mb-2 mt-6" dir="rtl">קישור לא תקין</h1>
                    <p className="text-muted-foreground" dir="rtl">
                        קישור זה אינו תקין או שפג תוקפו. אנא צרו קשר עם השדכנית לקבלת קישור חדש.
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
            <>
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

                    <div className="space-y-4 bg-white dark:bg-gray-950 p-6 rounded-lg border shadow-sm relative">
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email (optional) / אימייל (אופציונלי)
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                    className="w-full p-2 border rounded-md dark:bg-gray-900 relative z-10"
                                    dir="ltr"
                                    autoComplete="email"
                                />
                            </div>
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
            <ErrorAlertModal
                isOpen={!!friendlyError}
                onClose={() => setFriendlyError(null)}
                error={friendlyError}
            />
            </>
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

        // If there's a saved draft, offer to resume
        if (existingDraft) {
            const draftDate = new Date(existingDraft.lastSavedAt);
            const formattedDate = draftDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
                    <div className="text-center max-w-md">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <RotateCcw className="h-5 w-5 text-blue-600" />
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                Draft Found
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            We found a form you started filling out on {formattedDate}. Would you like to continue where you left off?
                        </p>
                        <p className="text-sm text-muted-foreground" dir="rtl">
                            מצאנו טופס שהתחלת למלא ב-{formattedDate}. האם תרצה להמשיך מהמקום שהפסקת?
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setExistingDraft(null);
                                // Start fresh - fall through to language selection
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 transition-colors"
                        >
                            Start Fresh / התחל מחדש
                        </button>
                        <button
                            onClick={() => setSelectedLanguage(existingDraft.formLanguage)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Resume / המשך
                        </button>
                    </div>
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
        <div className={`w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden ${selectedLanguage === "he" ? "rtl" : "ltr"}`} dir={selectedLanguage === "he" ? "rtl" : "ltr"}>
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
                draftData={existingDraft}
                onSuccess={(newPendingId) => {
                    if (newPendingId && !existingPendingId) {
                        setExistingPendingId(newPendingId);
                    }
                    setSubmitted(true);
                }}
            />
        </div>
    );
}

// Custom wrapper component that handles pending submission + auto-save
function ExternalClientForm({ 
    language, 
    token,
    existingClient,
    existingPendingId,
    identifierEmail,
    identifierPhone,
    draftData,
    onSuccess 
}: { 
    language: FormLanguage; 
    token: string;
    existingClient?: Client | null;
    existingPendingId?: string | null;
    identifierEmail?: string;
    identifierPhone?: string;
    draftData?: { formLanguage: "en" | "he"; currentStep: number; data: Record<string, any>; lastSavedAt: string } | null;
    onSuccess: (newPendingId?: string) => void;
}) {
    const savingRef = useRef(false);

    // Auto-save callback passed to ClientForm
    const handleAutoSave = useCallback(async (formData: Record<string, any>, step: number) => {
        if (savingRef.current) return;
        savingRef.current = true;
        try {
            if (existingPendingId) {
                // Editing an existing pending submission — persist directly so changes survive page reload
                const { notes, resumeRawText, ...clientValues } = formData;
                await updatePendingClient(existingPendingId, { ...clientValues, token } as any);
            } else {
                await saveFormDraft({
                    token,
                    email: identifierEmail,
                    phone: identifierPhone,
                    formLanguage: language,
                    currentStep: step,
                    data: formData,
                });
            }
        } catch (err) {
            console.error("Auto-save failed:", err);
        } finally {
            savingRef.current = false;
        }
    }, [token, identifierEmail, identifierPhone, language, existingPendingId]);

    const handleSubmitToPending = async (values: any) => {
        try {
            const { notes, resumeRawText, ...clientValues } = values;
            
            if (existingPendingId) {
                await updatePendingClient(existingPendingId, {
                    ...clientValues,
                    token,
                    source: "client_form",
                    sourceDescription: "Resubmitted by client via form link (edited)",
                });
                // Clean up draft on successful submit
                await deleteFormDraft(identifierEmail, identifierPhone).catch(() => {});
                onSuccess(existingPendingId);
            } else {
                const isApproved = existingClient && existingClient.id && !existingPendingId;
                
                const pendingData: any = {
                    ...clientValues,
                    token,
                    submittedAt: new Date().toISOString(),
                    source: "client_form",
                    sourceDescription: isApproved
                        ? "Resubmitted by client via form link (will overwrite approved profile)"
                        : "Submitted by client via form link",
                };
                
                if (isApproved && existingClient.id) {
                    pendingData.existingApprovedClientId = existingClient.id;
                }
                
                const newPending = await createPendingClient(pendingData);
                // Clean up draft on successful submit
                await deleteFormDraft(identifierEmail, identifierPhone).catch(() => {});
                onSuccess(newPending.id);
            }
        } catch (error: any) {
            console.error("Failed to submit form:", error);
            throw error;
        }
    };
    
    // Build the initial client object: prefer draft data > existing submission > identifier-only
    const buildClientFromDraft = (): Client | undefined => {
        if (draftData?.data && Object.keys(draftData.data).length > 0) {
            return {
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
                headCovering: "",
                religiousDetailsFreeText: "",
                ethnicity: "",
                familyBackground: "",
                education: "",
                occupationTitle: "",
                occupationDescription: "",
                languages: [],
                hobbies: "",
                personality: "",
                ageGapPreference: [],
                willingToRelocate: "",
                medicalHistory: false,
                smoking: "",
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
                ...draftData.data,
                // Always override email/phone from identifier
                ...(identifierEmail ? { email: identifierEmail } : {}),
                ...(identifierPhone ? { phone: identifierPhone } : {}),
            } as Client;
        }
        return undefined;
    };

    const clientWithIdentifier: Client | undefined = existingClient 
        ? {
            ...existingClient,
            email: identifierEmail || existingClient.email || "",
            phone: identifierPhone || existingClient.phone || "",
        }
        : buildClientFromDraft() || (identifierEmail || identifierPhone
            ? {
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
                headCovering: "",
                religiousDetailsFreeText: "",
                ethnicity: "",
                familyBackground: "",
                education: "",
                occupationTitle: "",
                occupationDescription: "",
                languages: [],
                hobbies: "",
                personality: "",
                ageGapPreference: [],
                willingToRelocate: "",
                medicalHistory: false,
                smoking: "",
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
            : undefined);

    return (
        <ClientForm 
            client={clientWithIdentifier}
            language={language}
            onSubmitToPending={handleSubmitToPending}
            isExternalForm={true}
            token={token}
            hideAutoFillOptions={true}
            onAutoSave={handleAutoSave}
            initialStep={draftData?.currentStep}
        />
    );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Client, ClientSchema } from "@/lib/mockData";
import { useClients } from "@/context/ClientContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, Check, UploadCloud } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const formSchema = ClientSchema;

interface ClientFormProps {
    client?: Client;
    isEditing?: boolean;
    onCancel?: () => void;
}

// Step definitions for the wizard
const STEPS = [
    { title: "Basic Info", fields: ["fullName", "email", "phone", "dob", "gender", "location"] },
    { title: "Appearance", fields: ["height", "eyeColor", "hairColor", "photoUrl"] },
    { title: "Background", fields: ["ethnicity", "tribalStatus", "religiousAffiliation", "learningStatus", "maritalStatus", "languages", "familyBackground", "education", "occupation", "smoking", "headCovering"] },
    { title: "Personal", fields: ["hobbies", "personality", "medicalHistory", "medicalHistoryDetails"] },
    { title: "Preferences", fields: ["lookingFor", "ageGapPreference", "willingToRelocate", "preferredEthnicities", "preferredHashkafos", "preferredLearningStatus", "expectedHeadCovering"] },
    { title: "Admin", fields: ["references", "notes"] },
];

export function ClientForm({ client, isEditing = false, onCancel }: ClientFormProps) {
    const defaultValues: any = client ? {
        ...client,
        religiousAffiliation: Array.isArray(client.religiousAffiliation) ? client.religiousAffiliation[0] : client.religiousAffiliation,
        ethnicity: client.ethnicity,
        learningStatus: client.learningStatus,
        maritalStatus: client.maritalStatus,
        languages: client.languages,
        hobbies: client.hobbies,
        // Ensure other array fields that map to single inputs are handled if necessary
    } : {
        fullName: "",
        email: "",
        phone: "",
        dob: "",
        gender: "Male",
        location: "",
        height: 170,
        eyeColor: "Brown",
        hairColor: "Dark",
        maritalStatus: "Single",
        children: 0,
        religiousAffiliation: "Yeshivish",
        learningStatus: "Full-time Learner",
        ethnicity: "Ashkenazi",
        education: "",
        occupation: "",
        languages: [],
        hobbies: [],
        personality: "",
        lookingFor: "Long-term",
        ageGapPreference: "Up to 3 years",
        willingToRelocate: "Maybe",
        medicalHistory: "No",
        smoking: "No",
        references: "",
        notes: "",
        active: true,
        photoUrl: "",
    };

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        trigger,
    } = useForm<z.input<typeof formSchema>, any, z.output<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    const { addClient, updateClient, isUploading, uploadImage } = useClients();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);

    const onSubmit = async (values: z.output<typeof formSchema>) => {
        try {
            if (isEditing && client) {
                updateClient(client.id, values);
            } else {
                addClient(values);
            }
            router.push("/clients");
        } catch (error: any) {
            console.error("Failed to submit client:", error);
            alert("Failed to save client: " + (error.message || error));
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const uploadedUrl = await uploadImage(file);
            if (uploadedUrl) {
                setValue("photoUrl", uploadedUrl);
            } else {
                alert("Failed to upload image.");
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
            alert("Failed to upload image. Please try again.");
        }
    };

    const nextStep = async () => {
        const fields = STEPS[currentStep].fields as any[];
        const isValid = await trigger(fields);

        if (isValid) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAutoPopulate = () => {
        const randomStr = Math.random().toString(36).substring(7);
        setValue("fullName", `Test Client ${randomStr}`);
        setValue("email", `test${randomStr}@example.com`);
        setValue("phone", "050-000-0000");
        setValue("dob", "1995-01-01");
        setValue("gender", Math.random() > 0.5 ? "Male" : "Female");
        setValue("location", "Jerusalem");
        setValue("height", 175 + Math.floor(Math.random() * 10));
        setValue("eyeColor", "Brown");
        setValue("hairColor", "Dark");
        setValue("maritalStatus", "Single");
        setValue("religiousAffiliation", "Yeshivish");
        setValue("ethnicity", "Ashkenazi");
        setValue("occupation", "Developer");
        setValue("learningStatus", "Working");
        setValue("headCovering", "None");
        setValue("smoking", "No");
        setValue("personality", "Auto-generated personality description for testing purposes.");
        setValue("hobbies", "Coding, Testing");
        setValue("medicalHistory", "No");
        setValue("lookingFor", "Long-term");
        setValue("ageGapPreference", "Any");
        setValue("willingToRelocate", "Yes");
        setValue("preferredEthnicities", "Ashkenazi");
        setValue("preferredHashkafos", "Yeshivish");
    };

    const watchedPhotoUrl = watch("photoUrl");
    const watchedMedical = watch("medicalHistory");

    return (
        <div className="fixed inset-x-0 bottom-0 top-[65px] z-40 bg-white dark:bg-gray-950 flex flex-col md:relative md:inset-auto md:top-auto md:h-auto md:bg-transparent md:block">
            <form
                onSubmit={handleSubmit(onSubmit)}
                onKeyDown={(e) => {
                    // Prevent implicit submission on Enter, allow inside textareas
                    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                        e.preventDefault();
                    }
                }}
                className="flex flex-col h-full md:h-auto md:block md:space-y-6"
            >
                {/* Wizard Header - Sticky on Mobile */}
                <div className="shrink-0 bg-white dark:bg-gray-950 p-4 border-b md:border md:rounded-xl md:shadow-sm z-30">
                    <div className="flex items-center justify-between mb-2 md:mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{STEPS[currentStep].title}</h2>
                            <button type="button" onClick={handleAutoPopulate} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-200">Dev Fill</button>
                        </div>
                        <span className="text-sm text-gray-500">
                            Step {currentStep + 1} of {STEPS.length}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-800">
                        <div
                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Steps Content - Scrollable on Mobile with EXTRA padding for validation errors */}
                <div className="flex-1 overflow-y-auto md:overflow-visible min-h-0 bg-white dark:bg-gray-950 p-6 md:rounded-xl md:border md:shadow-sm space-y-6 scrollbar-hide pb-40 md:pb-6">

                    {/* STEP 0: BASIC INFO */}
                    {currentStep === 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Full Name (Hebrew/English)</label>
                                    <input {...register("fullName")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="e.g. David Cohen" />
                                    {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName?.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <input {...register("email")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="david@example.com" />
                                    {errors.email && <p className="text-red-500 text-xs">{errors.email?.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone</label>
                                    <input {...register("phone")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="050-123-4567" />
                                    {errors.phone && <p className="text-red-500 text-xs">{errors.phone?.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Date of Birth</label>
                                    <input type="date" {...register("dob")} className="w-full p-2 border rounded-md dark:bg-gray-900" />
                                    {errors.dob && <p className="text-red-500 text-xs">{errors.dob?.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Gender</label>
                                    <select {...register("gender")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Location</label>
                                    <input {...register("location")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="City, Neighborhood" />
                                    {errors.location && <p className="text-red-500 text-xs">{errors.location?.message}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: APPEARANCE */}
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <label className="text-sm font-medium block">Profile Photo</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border">
                                        {watchedPhotoUrl ? (
                                            <Image src={watchedPhotoUrl || ""} alt="Preview" fill className="object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">No Img</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 w-full mb-2">
                                            <UploadCloud className="mr-2 h-4 w-4" />
                                            <span>{isUploading ? "Uploading..." : "Upload New Photo"}</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isUploading} />
                                        </label>
                                        <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Height (cm)</label>
                                    <input type="number" {...register("height", { valueAsNumber: true })} className="w-full p-2 border rounded-md dark:bg-gray-900" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Eye Color</label>
                                    <select {...register("eyeColor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        <option value="Brown">Brown</option>
                                        <option value="Blue">Blue</option>
                                        <option value="Green">Green</option>
                                        <option value="Hazel">Hazel</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Hair Color</label>
                                    <select {...register("hairColor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        <option value="Dark">Dark</option>
                                        <option value="Brown">Brown</option>
                                        <option value="Blonde">Blonde</option>
                                        <option value="Red">Red</option>
                                        <option value="Grey">Grey</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: BACKGROUND */}
                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Religious Affiliation</label>
                                <select {...register("religiousAffiliation")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="Yeshivish">Yeshivish</option>
                                    <option value="Chassidish">Chassidish</option>
                                    <option value="Modern Orthodox">Modern Orthodox</option>
                                    <option value="Traditional">Traditional</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ethnicity</label>
                                <select {...register("ethnicity")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="Ashkenazi">Ashkenazi</option>
                                    <option value="Sefardi">Sefardi</option>
                                    <option value="Temani">Temani</option>
                                    <option value="Convert">Convert</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Marital Status</label>
                                <select {...register("maritalStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="Single">Single</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Widowed">Widowed</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Occupation</label>
                                <input {...register("occupation")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="e.g. Teacher, Developer" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Learning Status</label>
                                <select {...register("learningStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="Full-time Learner">Full-time Learner</option>
                                    <option value="Working & Learning">Working & Learning</option>
                                    <option value="Working">Working</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Head Covering (if applicable)</label>
                                <select {...register("headCovering")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="None">None</option>
                                    <option value="Kippah Srugah">Kippah Srugah</option>
                                    <option value="Kippah Black">Kippah Black</option>
                                    <option value="Wig">Wig</option>
                                    <option value="Tichel">Tichel</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Smoking</label>
                                <select {...register("smoking")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                    <option value="Occasionally">Occasionally</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PERSONAL */}
                    {currentStep === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Personality Description</label>
                                <textarea {...register("personality")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" placeholder="Describe the personality..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Hobbies</label>
                                <input {...register("hobbies")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="e.g. Music, Hiking (comma separated)" />
                                <p className="text-xs text-gray-500">Separate with commas</p>
                            </div>
                            <div className="space-y-4 border-t pt-4">
                                <label className="text-sm font-medium block">Medical History?</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 border p-3 rounded-md w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <input type="radio" value="No" {...register("medicalHistory")} className="text-red-600 focus:ring-red-500" />
                                        <span>No</span>
                                    </label>
                                    <label className="flex items-center gap-2 border p-3 rounded-md w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <input type="radio" value="Yes" {...register("medicalHistory")} className="text-red-600 focus:ring-red-500" />
                                        <span>Yes</span>
                                    </label>
                                </div>
                                {watchedMedical === "Yes" && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-sm font-medium">Please explain:</label>
                                        <textarea {...register("medicalHistoryDetails")} className="w-full p-2 border rounded-md dark:bg-gray-900" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: PREFERENCES */}
                    {currentStep === 4 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Looking For</label>
                                <select {...register("lookingFor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="Long-term">Long-term</option>
                                    <option value="Short-term">Short-term</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Age Gap Preference</label>
                                <select {...register("ageGapPreference")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="Up to 3 years">Up to 3 years</option>
                                    <option value="Up to 5 years">Up to 5 years</option>
                                    <option value="Up to 10 years">Up to 10 years</option>
                                    <option value="Any">Any</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Willing to Relocate</label>
                                <select {...register("willingToRelocate")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="Maybe">Maybe</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preferred Ethnicities</label>
                                <input {...register("preferredEthnicities")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="Comma separated..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preferred Hashkafos</label>
                                <input {...register("preferredHashkafos")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="Comma separated..." />
                            </div>
                        </div>
                    )}

                    {/* STEP 5: ADMIN */}
                    {currentStep === 5 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">References (Name & Phone)</label>
                                <textarea {...register("references")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Internal Notes</label>
                                <textarea {...register("notes")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" />
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Navigation - Fixed in layout */}
                {/* Footer Navigation - Fixed in layout */}
                <div className="shrink-0 p-4 bg-white dark:bg-gray-950 z-50 flex items-center justify-between md:pb-4 md:static fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0">
                    <div className="flex gap-2">
                        {isEditing && onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (currentStep === 0) {
                                    router.push("/clients");
                                } else {
                                    prevStep();
                                }
                            }}
                            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </button>
                    </div>

                    {currentStep < STEPS.length - 1 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            {isEditing ? "Update Client" : "Submit Client"}
                            <Check className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Client, ClientSchema } from "@/lib/mockData";
import { useClients } from "@/context/ClientContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, ChevronLeft, ChevronRight, Check, UploadCloud } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";

const GENDER_OPTIONS = ["Male", "Female"];
const RELIGIOUS_AFFILIATION_OPTIONS = ["Haredi", "Hardal", "Dati Leumi", "Modern Orthodox", "Yeshivish American", "Yeshivish Litvish", "Yeshivish Hasidish", "Chabad", "Masorti", "Traditional", "Secular"];
const ETHNICITY_OPTIONS = ["Ashkenazi", "Sephardi", "Mizrahi", "Yemenite", "Ethiopian", "Convert", "Mixed", "Other"];
const TRIBAL_STATUS_OPTIONS = ["Cohen", "Levi", "Yisrael", "Bat Cohen", "Bat Levi", "Bat Yisrael", "Convert"];
const MARITAL_STATUS_OPTIONS = ["Single", "Divorced", "Divorced with Kids", "Widowed", "Widowed with Kids"];
const LEARNING_STATUS_OPTIONS = ["Full Time", "Half Time", "Koveah Itim", "Working", "Student", "Retired", "N/A"];
const HEAD_COVERING_OPTIONS = ["None", "Kippah Sruga", "Kippah Black", "Wig", "Tichel", "Hat", "Scarf", "Flexible"];
const SMOKING_OPTIONS = ["No", "Yes", "Occasionally", "Vape"];
const LANGUAGES_OPTIONS = ["English", "Hebrew", "French", "Spanish", "Yiddish", "Russian", "Portuguese", "German"];
const EYE_COLOR_OPTIONS = ["Brown", "Blue", "Green", "Hazel", "Grey", "Other"];
const HAIR_COLOR_OPTIONS = ["Black", "Brown", "Blonde", "Red", "Grey", "Bald", "White", "Other"];
const LOOKING_FOR_OPTIONS = ["Long-term", "Short-term", "Marriage", "Dating"];
const AGE_GAP_OPTIONS = ["I don't mind", "1-2 years", "3-5 years", "5-10 years", "Any"];
const WILLING_TO_RELOCATE_OPTIONS = ["Yes", "No", "Maybe"];
const PREFERRED_ETHNICITY_OPTIONS = ["I don't mind", ...ETHNICITY_OPTIONS];
const PREFERRED_HASHKAFOS_OPTIONS = ["I don't mind", ...RELIGIOUS_AFFILIATION_OPTIONS];
const PREFERRED_LEARNING_STATUS_OPTIONS = ["I don't mind", ...LEARNING_STATUS_OPTIONS];
const PREFERRED_HEAD_COVERING_OPTIONS = ["I don't mind", ...HEAD_COVERING_OPTIONS];

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
    { title: "Background", fields: ["ethnicity", "tribalStatus", "maritalStatus", "languages", "familyBackground", "education", "occupation"] },
    { title: "Religious Details", fields: ["religiousAffiliation", "learningStatus", "headCovering", "smoking"] },
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
        religiousAffiliation: [], // Changed to array
        learningStatus: "Full Time", // Changed generic default
        ethnicity: "Ashkenazi",
        education: "",
        occupation: "",
        languages: [],
        hobbies: [],
        personality: "",
        lookingFor: "Long-term",
        ageGapPreference: [], // Changed to array
        willingToRelocate: "Maybe",
        medicalHistory: "No",
        smoking: "No",
        references: "",
        notes: "",
        active: true,
        photoUrl: "",
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        expectedHeadCovering: "I don't mind",
    };

    const {
        register,
        handleSubmit,
        control,
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
    const [isSubmitReady, setIsSubmitReady] = useState(false);

    // Reset submit ready state when stepping back or forward, but trigger it for the last step
    useEffect(() => {
        if (currentStep === STEPS.length - 1) {
            setIsSubmitReady(false);
            const timer = setTimeout(() => {
                setIsSubmitReady(true);
            }, 500); // 500ms delay to prevent double-tap submission
            return () => clearTimeout(timer);
        } else {
            setIsSubmitReady(false);
        }
    }, [currentStep]);

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
                                        {GENDER_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
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
                                        {EYE_COLOR_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Hair Color</label>
                                    <select {...register("hairColor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                        {HAIR_COLOR_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: BACKGROUND */}
                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ethnicity</label>
                                <select {...register("ethnicity")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    {ETHNICITY_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tribal Status</label>
                                <select {...register("tribalStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    <option value="">Select...</option>
                                    {TRIBAL_STATUS_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Marital Status</label>
                                <select {...register("maritalStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    {MARITAL_STATUS_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Occupation</label>
                                <input {...register("occupation")} className="w-full p-2 border rounded-md dark:bg-gray-900" placeholder="e.g. Teacher, Developer" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Languages</label>
                                <Controller
                                    name="languages"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <MultiSelect
                                            options={LANGUAGES_OPTIONS}
                                            selected={Array.isArray(field.value) ? field.value : []}
                                            onChange={field.onChange}
                                            placeholder="Select languages..."
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: RELIGIOUS DETAILS */}
                    {currentStep === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Religious Affiliation</label>
                                <Controller
                                    name="religiousAffiliation"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <MultiSelect
                                            options={RELIGIOUS_AFFILIATION_OPTIONS}
                                            selected={Array.isArray(field.value) ? field.value : (field.value ? [field.value] : [])}
                                            onChange={field.onChange}
                                            placeholder="Select affiliations..."
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Learning Status</label>
                                <select {...register("learningStatus")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    {LEARNING_STATUS_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Head Covering (if applicable)</label>
                                <select {...register("headCovering")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    {HEAD_COVERING_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Smoking</label>
                                <select {...register("smoking")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    {SMOKING_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: PERSONAL */}
                    {currentStep === 4 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Personality Description</label>
                                <textarea {...register("personality")} className="w-full p-2 border rounded-md h-32 dark:bg-gray-900" placeholder="Describe the personality..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Hobbies</label>
                                <Controller
                                    name="hobbies"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <MultiSelect
                                            options={["Reading", "Hiking", "Music", "Cooking", "Traveling", "Learning Torah", "Sports", "Art", "Writing", "Volunteering", "Photography", "Gardening", "Chess", "History", "Swimming", "Running"]}
                                            selected={Array.isArray(field.value) ? field.value : []}
                                            onChange={field.onChange}
                                            placeholder="Select hobbies..."
                                        />
                                    )}
                                />
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

                    {/* STEP 5: PREFERENCES */}
                    {currentStep === 5 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Looking For</label>
                                <select {...register("lookingFor")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    {LOOKING_FOR_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Age Gap Preference</label>
                                <Controller
                                    name="ageGapPreference"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <MultiSelect
                                            options={AGE_GAP_OPTIONS}
                                            selected={Array.isArray(field.value) ? field.value : [String(field.value)]}
                                            onChange={field.onChange}
                                            placeholder="Select age gap preference..."
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Willing to Relocate</label>
                                <select {...register("willingToRelocate")} className="w-full p-2 border rounded-md dark:bg-gray-900">
                                    {WILLING_TO_RELOCATE_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preferred Ethnicities</label>
                                <Controller
                                    name="preferredEthnicities"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <MultiSelect
                                            options={PREFERRED_ETHNICITY_OPTIONS}
                                            selected={Array.isArray(field.value) ? field.value : []}
                                            onChange={field.onChange}
                                            placeholder="Select preferred ethnicities..."
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preferred Hashkafos</label>
                                <Controller
                                    name="preferredHashkafos"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <MultiSelect
                                            options={PREFERRED_HASHKAFOS_OPTIONS}
                                            selected={Array.isArray(field.value) ? field.value : []}
                                            onChange={field.onChange}
                                            placeholder="Select preferred hashkafos..."
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preferred Learning Status</label>
                                <Controller
                                    name="preferredLearningStatus"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <MultiSelect
                                            options={PREFERRED_LEARNING_STATUS_OPTIONS}
                                            selected={Array.isArray(field.value) ? field.value : []}
                                            onChange={field.onChange}
                                            placeholder="Select preferred learning status..."
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preferred Head Covering</label>
                                <Controller
                                    name="preferredHeadCovering"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <MultiSelect
                                            options={PREFERRED_HEAD_COVERING_OPTIONS}
                                            selected={Array.isArray(field.value) ? field.value : []}
                                            onChange={field.onChange}
                                            placeholder="Select preferred head covering..."
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 6: ADMIN */}
                    {currentStep === 6 && (
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
                <div className="fixed bottom-24 left-0 right-0 flex items-center justify-center gap-4 px-4 py-2 bg-white dark:bg-gray-950 z-50 md:static md:p-0 md:pb-4 md:bg-transparent">
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
                            disabled={!isSubmitReady}
                            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isSubmitReady ? 'bg-green-600 hover:bg-green-700' : 'bg-green-400 cursor-not-allowed'}`}
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

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Eye, BookOpen, Heart, FileText, UploadCloud, Sparkles } from "lucide-react";
import { findMatches, calculateAge } from "@/lib/matchingUtils";
import { Client } from "@/lib/mockData";
import Link from "next/link";
import { useClients } from "@/context/ClientContext";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { uploadImage } from "@/actions/upload";

interface ClientFormProps {
    initialData?: Client;
    isEditing?: boolean;
}

// Helper components
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-4 border-b pb-6 last:border-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="grid gap-4 md:grid-cols-2">
            {children}
        </div>
    </div>
);

const Input = ({ label, name, value, onChange, type = "text", required = false, placeholder = "" }: any) => (
    <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            name={name}
            type={type}
            value={value || ""}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
        />
    </div>
);

const TextArea = ({ label, name, value, onChange, rows = 3, placeholder = "", required = false }: any) => (
    <div className="col-span-full">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
            name={name}
            value={value || ""}
            onChange={onChange}
            rows={rows}
            required={required}
            placeholder={placeholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
        />
    </div>
);

const Select = ({ label, name, value, onChange, options, required = false }: any) => (
    <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            name={name}
            value={value || ""}
            onChange={onChange}
            required={required}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
        >
            <option value="">Select...</option>
            {options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
);

// Constants
const GENDER_OPTIONS = ["Male", "Female"];
const EYE_COLOR_OPTIONS = ["Brown", "Blue", "Green", "Hazel", "Grey", "Other"];
const HAIR_COLOR_OPTIONS = ["Black", "Brown", "Blonde", "Red", "Grey", "Bald", "White", "Other"];
const ETHNICITY_OPTIONS = ["Ashkenazi", "Sephardi", "Mizrahi", "Yemenite", "Ethiopian"];
const TRIBAL_STATUS_OPTIONS = ["Cohen", "Levi", "Yisrael", "Bat Cohen", "Bat Levi", "Bat Yisrael", "Convert"];
const RELIGIOUS_AFFILIATION_OPTIONS = ["Haredi", "Hardal", "Dati Leumi", "Modern Orthodox", "Yeshivish American", "Yeshivish Litvish", "Yeshivish Hasidish", "Chabad", "Masorti", "Traditional", "Secular"];
const LEARNING_STATUS_OPTIONS = ["Full Time", "Half Time", "Koveah Itim", "Working", "N/A"];
const MARITAL_STATUS_OPTIONS = ["Single", "Divorced", "Divorced with Kids", "Widowed", "Widowed with Kids"];
const LANGUAGES_OPTIONS = ["English", "Hebrew", "French", "Spanish", "Yiddish", "Russian", "Portuguese", "German"];

const AGE_GAP_OPTIONS = ["I don't mind", "1-2 years", "3-5 years", "5-10 years"];

const SMOKING_OPTIONS = ["No", "Yes", "Occasionally", "Vape"];
const HEAD_COVERING_OPTIONS = ["Uncovered", "Wig", "Hat", "Scarf", "Flexible"];
const PREFERRED_ETHNICITY_OPTIONS = ["I don't mind", "Ashkenazi", "Sephardi", "Mizrahi", "Yemenite", "Ethiopian"];
const PREFERRED_LEARNING_STATUS_OPTIONS = ["I don't mind", "Full Time", "Half Time", "Koveah Itim", "Working"];
const PREFERRED_HEAD_COVERING_OPTIONS = ["I don't mind", "Uncovered", "Wig", "Hat", "Scarf"];
const PREFERRED_RELIGIOUS_AFFILIATION_OPTIONS = ["I don't mind", ...RELIGIOUS_AFFILIATION_OPTIONS];
const WILLING_TO_RELOCATE_OPTIONS = ["Yes", "No", "Maybe"];

export function ClientForm({ initialData, isEditing = false, onCancel }: ClientFormProps & { onCancel?: () => void }) {
    const router = useRouter();
    const { addClient, updateClient, clients } = useClients();

    const [ageInputType, setAgeInputType] = useState<"dob" | "age">("age");
    const [ageValue, setAgeValue] = useState<string>("");

    const [formData, setFormData] = useState<Partial<Client>>({
        fullName: "",
        email: "",
        phone: "",
        dob: "",
        location: "",
        gender: "Male",
        height: "",
        eyeColor: "",
        hairColor: "",
        photoUrl: "",
        ethnicity: "",
        tribalStatus: "",
        religiousAffiliation: [],
        learningStatus: "",
        maritalStatus: "",
        languages: [],
        familyBackground: "",
        education: "",
        occupation: "",
        smoking: "",
        headCovering: "",
        hobbies: "",
        personality: "",
        medicalHistory: false,
        medicalHistoryDetails: "",
        lookingFor: "",
        willingToRelocate: "",
        ageGapPreference: [],
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        references: "",
        notes: "",
        // status field removed
    });

    useEffect(() => {
        if (initialData) {
            // Safe handling for potentially legacy data structure (string vs string[])
            const safeAgeGap = Array.isArray(initialData.ageGapPreference)
                ? initialData.ageGapPreference
                : (initialData.ageGapPreference ? [initialData.ageGapPreference as unknown as string] : []);

            setFormData({
                ...initialData,
                ageGapPreference: safeAgeGap
            });

            if (initialData.dob) {
                setAgeInputType("dob");
                setAgeValue(calculateAge(initialData.dob).toString());
            }
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: Partial<Client>) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleMultiSelectChange = (name: string, selected: string[]) => {
        setFormData((prev: Partial<Client>) => ({
            ...prev,
            [name]: selected,
        }));
    };

    const handleMedicalHistoryChange = (value: boolean) => {
        setFormData((prev: Partial<Client>) => ({
            ...prev,
            medicalHistory: value,
            // Clear details if switching to No
            medicalHistoryDetails: value ? prev.medicalHistoryDetails : "",
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData((prev: Partial<Client>) => ({
                    ...prev,
                    photoUrl: reader.result as string,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const [showMatchModal, setShowMatchModal] = useState(false);
    const [showNoMatchModal, setShowNoMatchModal] = useState(false);
    const [foundMatches, setFoundMatches] = useState<Client[]>([]);

    const [newlyCreatedClientId, setNewlyCreatedClientId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for array fields
        // Calculate DOB if needed
        let finalFormData = { ...formData };
        if (ageInputType === "age" && ageValue) {
            const age = parseInt(ageValue);
            if (!isNaN(age)) {
                const currentYear = new Date().getFullYear();
                const birthYear = currentYear - age;
                finalFormData.dob = `${birthYear}-01-01`; // Approximation
            }
        }

        // Validate mandatory fields
        if (!finalFormData.fullName || !finalFormData.phone || !finalFormData.dob) {
            alert("Please fill in the mandatory fields: Full Name, Phone, and Age/DOB.");
            return;
        }

        try {
            // Upload Image if needed (if it's a base64 string)
            if (finalFormData.photoUrl && finalFormData.photoUrl.startsWith("data:image")) {
                const uploadedUrl = await uploadImage(finalFormData.photoUrl);
                if (uploadedUrl) {
                    finalFormData.photoUrl = uploadedUrl;
                } else {
                    // Decide: Fail or continue with base64?
                    // Let's continue with base64 for now so we don't block saving if Cloudinary fails/isn't set up
                    // But warn user
                    console.warn("Image upload failed, saving as base64 (not recommended for production)");
                }
            }
        } catch (e) {
            console.error("Image processing error", e);
        }

        try {
            if (isEditing && initialData?.id) {
                await updateClient(initialData.id, finalFormData);
                if (onCancel) {
                    onCancel();
                } else {
                    router.push("/clients");
                }
            } else {
                // Add first and capture the new client object (which now has an ID)
                // We cast the result to Client because we updated the context signature
                // Add first and capture the new client object (which now has an ID)
                // We cast the result to Client because we updated the context signature
                const newClient = await addClient(finalFormData as Omit<Client, "id" | "createdAt">);

                // Set the ID for the deep link
                setNewlyCreatedClientId(newClient.id);

                // Find matches for the new client
                const matches = findMatches(newClient, clients);

                if (matches.length > 0) {
                    setFoundMatches(matches.slice(0, 3));
                    setShowMatchModal(true);
                } else {
                    setShowNoMatchModal(true);
                }
            }
        } catch (error) {
            console.error("Failed to save client:", error);
        }
    };

    // Dev Utility
    const fillDummyData = () => {
        setFormData({
            ...formData,
            fullName: "Test Client " + Math.floor(Math.random() * 1000),
            email: "test" + Math.floor(Math.random() * 1000) + "@example.com",
            phone: "1234567890",
            dob: "1995-05-15",
            location: "Jerusalem",
            gender: "Female",
            height: "165",
            eyeColor: "Brown",
            hairColor: "Brown",
            ethnicity: "Ashkenazi",
            tribalStatus: "Yisrael",
            religiousAffiliation: ["Modern Orthodox"],
            learningStatus: "Working",
            maritalStatus: "Single",
            languages: ["English", "Hebrew"],
            familyBackground: "Nice family",
            education: "Degree",
            occupation: "Developer",
            smoking: "No",
            headCovering: "Flexible", // Female specific default
            hobbies: "Coding, hiking",
            personality: "Friendly",
            medicalHistory: false,
            lookingFor: "Someone nice",
            willingToRelocate: "Yes",
            ageGapPreference: ["1-2 years", "3-5 years"],
            preferredEthnicities: ["Ashkenazi"],
            preferredHashkafos: ["Modern Orthodox"],
            preferredLearningStatus: ["Working"],
            preferredHeadCovering: ["I don't mind"],
            references: "Ref 1",
            notes: "Note 1"
        });
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-950 p-8 rounded-xl border shadow-sm space-y-6">

                <Section title="Basic Information">
                    <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
                    <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
                    <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+1 234 567 8900" />

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Age / Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="radio"
                                    checked={ageInputType === "age"}
                                    onChange={() => setAgeInputType("age")}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                Age
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="radio"
                                    checked={ageInputType === "dob"}
                                    onChange={() => setAgeInputType("dob")}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                Exact Date of Birth
                            </label>
                        </div>
                        {ageInputType === "age" ? (
                            <input
                                type="number"
                                value={ageValue}
                                onChange={(e) => setAgeValue(e.target.value)}
                                placeholder="Enter age (e.g. 25)"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                            />
                        ) : (
                            <input
                                type="date"
                                name="dob"
                                value={formData.dob}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-red-500 dark:bg-gray-900 dark:border-gray-700"
                            />
                        )}
                    </div>

                    <Input label="Current Location" name="location" value={formData.location} onChange={handleChange} placeholder="City, Country" />
                    <Select label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={GENDER_OPTIONS} />
                </Section>

                <Section title="Appearance">
                    <Input label="Height (cm)" name="height" type="number" value={formData.height} onChange={handleChange} />
                    <Select label="Eye Color" name="eyeColor" value={formData.eyeColor} onChange={handleChange} options={EYE_COLOR_OPTIONS} />
                    <Select label="Hair Color" name="hairColor" value={formData.hairColor} onChange={handleChange} options={HAIR_COLOR_OPTIONS} />

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Photo
                        </label>
                        <div className="flex items-center gap-4">
                            {formData.photoUrl && (
                                <img src={formData.photoUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover border" />
                            )}
                            <label className="cursor-pointer">
                                <span className="inline-flex items-center justify-center rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    Upload Photo
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </Section>

                <Section title="Background">
                    <Select label="Ethnicity" name="ethnicity" value={formData.ethnicity} onChange={handleChange} options={ETHNICITY_OPTIONS} />
                    <Select label="Tribal Status" name="tribalStatus" value={formData.tribalStatus} onChange={handleChange} options={TRIBAL_STATUS_OPTIONS} />

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Religious Affiliation
                        </label>
                        <MultiSelect
                            options={RELIGIOUS_AFFILIATION_OPTIONS}
                            selected={formData.religiousAffiliation || []}
                            onChange={(selected) => handleMultiSelectChange("religiousAffiliation", selected)}
                        />
                    </div>

                    <Select label="Learning Status" name="learningStatus" value={formData.learningStatus} onChange={handleChange} options={LEARNING_STATUS_OPTIONS} />
                    <Select label="Marital Status" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} options={MARITAL_STATUS_OPTIONS} />

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Languages Spoken
                        </label>
                        <MultiSelect
                            options={LANGUAGES_OPTIONS}
                            selected={formData.languages || []}
                            onChange={(selected) => handleMultiSelectChange("languages", selected)}
                        />
                    </div>
                    <TextArea label="Family Background" name="familyBackground" value={formData.familyBackground} onChange={handleChange} rows={2} />
                    <Input label="Education History" name="education" value={formData.education} onChange={handleChange} />
                    <Input label="Current Occupation" name="occupation" value={formData.occupation} onChange={handleChange} />
                    <Select label="Smoking" name="smoking" value={formData.smoking} onChange={handleChange} options={SMOKING_OPTIONS} />
                    <Select label="Head Covering (Women Only)" name="headCovering" value={formData.headCovering} onChange={handleChange} options={HEAD_COVERING_OPTIONS} />
                </Section>

                <Section title="Personal">
                    <TextArea label="Hobbies and Interests" name="hobbies" value={formData.hobbies} onChange={handleChange} />
                    <TextArea label="Personality Description" name="personality" value={formData.personality} onChange={handleChange} />

                    <div className="col-span-full">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Medical History
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="medicalHistory"
                                    checked={formData.medicalHistory === true}
                                    onChange={() => handleMedicalHistoryChange(true)}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                <span>Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="medicalHistory"
                                    checked={formData.medicalHistory === false}
                                    onChange={() => handleMedicalHistoryChange(false)}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                <span>No</span>
                            </label>
                        </div>
                    </div>

                    {formData.medicalHistory && (
                        <TextArea
                            label="Medical History Details"
                            name="medicalHistoryDetails"
                            value={formData.medicalHistoryDetails}
                            onChange={handleChange}
                            placeholder="Please provide details..."
                        />
                    )}
                </Section>

                <Section title="Match Preferences">
                    <TextArea label="Looking For" name="lookingFor" value={formData.lookingFor} onChange={handleChange} placeholder="Describe partner and relationship..." />
                    <Select label="Willing to Relocate?" name="willingToRelocate" value={formData.willingToRelocate} onChange={handleChange} options={WILLING_TO_RELOCATE_OPTIONS} />

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Age Gap Preference
                        </label>
                        <MultiSelect
                            options={AGE_GAP_OPTIONS}
                            selected={formData.ageGapPreference || []}
                            onChange={(selected) => handleMultiSelectChange("ageGapPreference", selected)}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Preferred Ethnicities
                        </label>
                        <MultiSelect
                            options={PREFERRED_ETHNICITY_OPTIONS}
                            selected={formData.preferredEthnicities || []}
                            onChange={(selected) => handleMultiSelectChange("preferredEthnicities", selected)}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Preferred Hashkafos
                        </label>
                        <MultiSelect
                            options={PREFERRED_RELIGIOUS_AFFILIATION_OPTIONS}
                            selected={formData.preferredHashkafos || []}
                            onChange={(selected) => handleMultiSelectChange("preferredHashkafos", selected)}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Preferred Learning Status (Women Only)
                        </label>
                        <MultiSelect
                            options={PREFERRED_LEARNING_STATUS_OPTIONS}
                            selected={formData.preferredLearningStatus || []}
                            onChange={(selected) => handleMultiSelectChange("preferredLearningStatus", selected)}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Preferred Head Covering (Men Only)
                        </label>
                        <MultiSelect
                            options={PREFERRED_HEAD_COVERING_OPTIONS}
                            selected={formData.preferredHeadCovering || []}
                            onChange={(selected) => handleMultiSelectChange("preferredHeadCovering", selected)}
                        />
                    </div>
                </Section>

                <Section title="Admin & Notes">
                    <TextArea label="References" name="references" value={formData.references} onChange={handleChange} placeholder="Name and Contact Info" />
                    <TextArea label="Additional Notes" name="notes" value={formData.notes} onChange={handleChange} />
                    <div className="pt-2">
                        <button type="button" onClick={fillDummyData} className="text-xs text-gray-400 hover:text-gray-600 underline">
                            Quick Fill (Dev Only)
                        </button>
                    </div>
                </Section>

                <div className="flex justify-end gap-4 pt-6 border-t">
                    <button
                        type="button"
                        onClick={() => onCancel ? onCancel() : router.back()}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                        {isEditing ? "Update Client" : "Add Client"}
                    </button>
                </div>
            </form>
            {/* Suggested Matches Modal */}
            {
                showMatchModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border dark:border-gray-800 animate-in fade-in zoom-in duration-300">
                            <div className="p-6 text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                    <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Success! Match Candidates Found</h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    We found {foundMatches.length} potential matches based on the profile you just created.
                                </p>

                                <div className="mt-6 space-y-3 text-left">
                                    {foundMatches.map(match => (
                                        <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border dark:border-gray-700">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">{match.fullName}</p>
                                                <p className="text-xs text-gray-500">{match.location} • {calculateAge(match.dob)} yo</p>
                                            </div>
                                            <Link href={`/clients/${match.id}`} className="text-sm font-medium text-red-600 hover:underline">
                                                View
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 border-t bg-gray-50 dark:bg-gray-900/50 flex gap-3">
                                <button
                                    onClick={() => router.push("/")}
                                    type="button"
                                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                >
                                    Go to Dashboard
                                </button>
                                <button
                                    onClick={() => router.push(newlyCreatedClientId ? `/matching?clientId=${newlyCreatedClientId}&source=new_client` : "/matching")}
                                    type="button"
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm"
                                >
                                    See All Matches
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* No Match Modal */}
            {
                showNoMatchModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border dark:border-gray-800 animate-in fade-in zoom-in duration-300">
                            <div className="p-6 text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">No Immediate Matches</h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    It looks like your requirements are a bit too narrow so far. No results found. Keep on adding more people, and maybe you'll find something.
                                </p>
                            </div>
                            <div className="p-6 border-t bg-gray-50 dark:bg-gray-900/50 flex gap-3">
                                <button
                                    onClick={() => router.push("/clients")}
                                    type="button"
                                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                >
                                    Back to Clients
                                </button>
                                <button
                                    onClick={() => router.push(newlyCreatedClientId ? `/clients/${newlyCreatedClientId}` : "/clients")}
                                    type="button"
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm"
                                >
                                    View Profile
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}


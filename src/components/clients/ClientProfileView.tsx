import { Client } from "@/lib/mockData";
import { Client } from "@/lib/mockData";
import Image from "next/image";
import { MapPin, Briefcase, Ruler, Heart, BookOpen, GraduationCap, Globe, Users, FileText } from "lucide-react";

interface ClientProfileViewProps {
    client: Client;
    onEdit: () => void;
    onDelete: () => void;
}

const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 mb-2">
            <Icon className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
            {children}
        </div>
    </div>
);

const Field = ({ label, value }: { label: string; value: string | string[] | boolean | undefined }) => {
    if (value === undefined || value === null || value === "") return null;

    let displayValue: React.ReactNode = value;

    if (Array.isArray(value)) {
        if (value.length === 0) return null;
        displayValue = value.join(", ");
    } else if (typeof value === "boolean") {
        displayValue = value ? "Yes" : "No";
    }

    return (
        <div>
            <span className="block text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                {label}
            </span>
            <span className="block text-gray-900 dark:text-gray-100 font-medium text-base">
                {displayValue}
            </span>
        </div>
    );
};

export function ClientProfileView({ client, onEdit, onDelete }: ClientProfileViewProps) {
    const calculateAge = (dob: string) => {
        if (!dob) return "N/A";
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Top Card */}
            <div className="bg-white dark:bg-gray-950 p-8 rounded-xl border shadow-sm flex flex-col md:flex-row gap-8 items-start">
                <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
                    {client.photoUrl ? (
                        <Image
                            src={client.photoUrl}
                            alt={client.fullName}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 128px, 160px"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-4xl">?</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-4 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{client.fullName}</h1>
                            <div className="flex flex-wrap gap-4 mt-2 text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" /> {client.location}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Briefcase className="h-4 w-4" /> {client.occupation}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium">
                                    {calculateAge(client.dob)} y/o • {client.gender}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onEdit}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to delete this client?")) {
                                        onDelete();
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Delete
                            </button>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-600 dark:text-gray-300 italic">"{client.personality}"</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Section title="Appearance" icon={Ruler}>
                    <Field label="Height" value={`${client.height} cm`} />
                    <Field label="Eye Color" value={client.eyeColor} />
                    <Field label="Hair Color" value={client.hairColor} />
                    <Field label="Vision" value={client.headCovering === "Glasses" ? "Glasses" : undefined} />
                </Section>

                <Section title="Background & Heritage" icon={Globe}>
                    <Field label="Ethnicity" value={client.ethnicity} />
                    <Field label="Tribal Status" value={client.tribalStatus} />
                    <Field label="Languages" value={client.languages} />
                    <Field label="Family" value={client.familyBackground} />
                </Section>

                <Section title="Religious & Personal" icon={BookOpen}>
                    <Field label="Affiliation" value={client.religiousAffiliation} />
                    <Field label="Learning Status" value={client.learningStatus} />
                    <Field label="Head Covering" value={client.headCovering} />
                    <Field label="Smoking" value={client.smoking} />
                </Section>

                <Section title="Education & Work" icon={GraduationCap}>
                    <Field label="Education" value={client.education} />
                    <Field label="Occupation" value={client.occupation} />
                    <Field label="Hobbies" value={client.hobbies} />
                </Section>

                <Section title="Medical" icon={Heart}>
                    <Field label="Medical History" value={client.medicalHistory} />
                    {client.medicalHistory && (
                        <Field label="Details" value={client.medicalHistoryDetails} />
                    )}
                </Section>

                <Section title="The Search" icon={Users}>
                    <div className="col-span-full">
                        <Field label="Looking For" value={client.lookingFor} />
                    </div>
                    <Field label="Age Gap Preference" value={client.ageGapPreference} />
                    <Field label="Willing to Relocate" value={client.willingToRelocate} />
                    <Field label="Preferred Ethnicities" value={client.preferredEthnicities} />
                    <Field label="Preferred Hashkafos" value={client.preferredHashkafos} />
                </Section>

                <Section title="Admin Notes" icon={FileText}>
                    <div className="col-span-full">
                        <Field label="References" value={client.references} />
                    </div>
                    <div className="col-span-full">
                        <Field label="Internal Notes" value={client.notes} />
                    </div>
                </Section>
            </div>
        </div>
    );
}

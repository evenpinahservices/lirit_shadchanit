/**
 * Flattens AI-extracted form data (with optional { value, confidence, sourceQuote }) into
 * a flat object suitable for PendingClient/Client (e.g. createPendingClient).
 */
function extractValue(field: unknown): unknown {
    if (field === null || field === undefined) return field;
    if (typeof field === "object" && !Array.isArray(field) && field !== null && "value" in (field as object)) {
        return extractValue((field as { value: unknown }).value);
    }
    if (Array.isArray(field)) {
        return field.map((item) => {
            if (typeof item === "object" && item !== null && "value" in item) {
                return (item as { value: unknown }).value;
            }
            return item;
        });
    }
    return field;
}

/** Known Client/PendingClient top-level keys (excluding id, createdAt) */
const CLIENT_KEYS = [
    "fullName", "email", "phone", "dob", "location", "gender",
    "height", "eyeColor", "hairColor", "photoUrl", "galleryImages",
    "ethnicity", "tribalStatus", "religiousAffiliation", "learningStatus", "maritalStatus", "children",
    "languages", "familyBackground", "education", "occupationTitle", "occupationDescription", "smoking", "headCovering", "religiousDetailsFreeText",
    "hobbies", "personality", "medicalHistory", "medicalHistoryDetails",
    "willingToRelocate", "ageGapPreference", "preferredEthnicities", "preferredHashkafos", "preferredLearningStatus", "preferredHeadCovering", "preferencesFreeText",
    "references", "notes", "resumeRawText", "active", "status", "formLanguage",
] as const;

export interface FlattenAiPayload {
    formData: Record<string, unknown>;
    galleryUrls: string[];
    profilePhotoUrl: string | null;
}

/**
 * Returns a flat record suitable for createPendingClient from AI form data + gallery + profile photo.
 * Ensures required fields (fullName, dob, gender) have fallbacks.
 */
export function flattenAiFormDataForPending(payload: FlattenAiPayload): Record<string, unknown> {
    const { formData, galleryUrls, profilePhotoUrl } = payload;
    const flat: Record<string, unknown> = {};

    for (const key of CLIENT_KEYS) {
        const raw = formData[key];
        if (raw === undefined) continue;
        const value = extractValue(raw);
        if (value === undefined || value === null || value === "") continue;
        if (Array.isArray(value)) {
            flat[key] = value;
        } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            // resumeRawText can be { value: string }; store the string
            if (key === "resumeRawText" && typeof (value as Record<string, unknown>).value === "string") {
                flat[key] = (value as Record<string, unknown>).value;
            }
            // Skip other nested objects (e.g. fatherDetails) for DB
        } else {
            flat[key] = value;
        }
    }

    flat.galleryImages = galleryUrls.length > 0 ? galleryUrls : (flat.galleryImages as string[] | undefined) ?? [];
    if (profilePhotoUrl) {
        flat.photoUrl = profilePhotoUrl;
    }

    // Coerce boolean fields (AI may return "No"/"Yes" strings)
    if (flat.medicalHistory !== undefined) {
        const v = String(flat.medicalHistory).toLowerCase();
        flat.medicalHistory = v === "true" || v === "yes" || v === "1";
    }
    if (flat.active !== undefined) {
        const v = String(flat.active).toLowerCase();
        flat.active = v !== "false" && v !== "no" && v !== "0" && v !== "inactive";
    }

    // If dob is missing but AI extracted an age, derive birth year from age
    if (!flat.dob || String(flat.dob).trim() === "") {
        const rawAge = formData.age;
        const ageValue = rawAge != null && typeof rawAge === "object" && "value" in (rawAge as object)
            ? (rawAge as { value: unknown }).value
            : rawAge;
        const ageNum = Number(ageValue);
        if (ageNum && ageNum >= 16 && ageNum <= 120) {
            flat.dob = String(new Date().getFullYear() - Math.floor(ageNum));
        }
    }

    // Required fields with fallbacks for draft
    if (!flat.fullName || String(flat.fullName).trim() === "") {
        flat.fullName = "Draft";
    }
    if (!flat.dob || String(flat.dob).trim() === "") {
        flat.dob = new Date().getFullYear().toString();
    }
    if (!flat.gender || (flat.gender !== "Male" && flat.gender !== "Female")) {
        flat.gender = "Male";
    }

    return flat;
}

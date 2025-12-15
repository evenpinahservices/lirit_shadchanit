
import * as z from "zod";

export interface User {
    id: string;
    username: string;
    name: string;
    role: "admin" | "user";
    password?: string;
}

export interface Client {
    id: string;
    // Basic Info
    fullName: string;
    email: string;
    phone: string;
    dob: string; // Date of Birth
    location: string; // City, Country
    gender: "Male" | "Female";

    // Appearance
    height: number; // in cm
    eyeColor: string;
    hairColor: string;
    photoUrl?: string;

    // Background
    ethnicity: string; // Single-select
    tribalStatus: string; // Drop-down
    religiousAffiliation: string[]; // Multi-select
    learningStatus: string; // Single-select
    maritalStatus: string;
    children?: number;
    languages: string[]; // Multi-select
    familyBackground: string;
    education: string;
    occupation: string;
    smoking: string; // Drop-down
    headCovering: string; // Drop-down

    // Personal
    hobbies: string | string[]; // Can be string (comma sep) or array
    personality: string;
    medicalHistory: boolean | string; // Yes/No can be boolean or string "Yes"/"No"
    medicalHistoryDetails?: string; // Optional explanation if Yes

    // Preferences / Match Criteria
    lookingFor: string;
    willingToRelocate: string; // Yes/No/Maybe
    ageGapPreference: string | string[]; // Single or Multi
    preferredEthnicities: string | string[]; // Single or Multi
    preferredHashkafos: string | string[]; // Single or Multi
    preferredLearningStatus: string | string[]; // Single or Multi
    preferredHeadCovering: string[]; // Multi-select
    expectedHeadCovering?: string; // For men's preference logic if needed

    // Admin / Meta
    references: string;
    notes: string;
    active?: boolean; // For form compatibility
    status?: "Active" | "Inactive" | "Matched"; // Deprecated
    createdAt: string;
}

// Zod Schema for Client Form
export const ClientSchema = z.object({
    fullName: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email").or(z.literal("")),
    phone: z.string().min(9, "Phone number is required"),
    dob: z.string().min(1, "Date of birth is required"),
    gender: z.enum(["Male", "Female"]),
    location: z.string().min(2, "Location is required"),

    height: z.coerce.number().min(100, "Invalid height"),
    eyeColor: z.string(),
    hairColor: z.string(),
    photoUrl: z.string().optional(),

    religiousAffiliation: z.union([z.string(), z.array(z.string())]).transform(val => Array.isArray(val) ? val : [val]),
    ethnicity: z.string(),
    tribalStatus: z.string().optional().default(""),
    maritalStatus: z.string(),
    children: z.coerce.number().optional().default(0),
    languages: z.union([z.string(), z.array(z.string())]).transform(val => Array.isArray(val) ? val : String(val).split(",").map(s => s.trim()).filter(Boolean)),
    familyBackground: z.string().optional().default(""),
    education: z.string().optional().default(""),
    occupation: z.string().optional().default(""),
    learningStatus: z.string().optional().default(""),
    headCovering: z.string().optional().default(""),
    smoking: z.string().optional().default(""),

    personality: z.string().optional().default(""),
    hobbies: z.union([z.string(), z.array(z.string())]).transform(val => Array.isArray(val) ? val : String(val).split(",").map(s => s.trim()).filter(Boolean)),
    medicalHistory: z.union([z.boolean(), z.string()]).transform(val => val === true || val === "Yes"),
    medicalHistoryDetails: z.string().optional().default(""),

    lookingFor: z.string().optional().default(""),
    ageGapPreference: z.union([z.string(), z.array(z.string())]).transform(val => Array.isArray(val) ? val : [String(val)]),
    willingToRelocate: z.string().optional().default(""),
    preferredEthnicities: z.union([z.string(), z.array(z.string())]).transform(val => Array.isArray(val) ? val : String(val).split(",").map(s => s.trim()).filter(Boolean)),
    preferredHashkafos: z.union([z.string(), z.array(z.string())]).transform(val => Array.isArray(val) ? val : String(val).split(",").map(s => s.trim()).filter(Boolean)),
    preferredLearningStatus: z.union([z.string(), z.array(z.string())]).optional().transform(val => Array.isArray(val) ? val : typeof val === 'string' ? [val] : []),
    preferredHeadCovering: z.array(z.string()).optional().default([]),
    expectedHeadCovering: z.string().optional().default(""),

    references: z.string().optional().default(""),
    notes: z.string().optional().default(""),
    active: z.boolean().optional(),
});


export interface Match {
    id: string;
    clientId: string;
    matchedClientId: string;
    score: number;
    reason: string;
    status: "Pending" | "Approved" | "Rejected";
}

export const MOCK_USERS: User[] = [
    { id: "1", username: "LiritAdam", name: "Lirit Adam", role: "admin", password: "Admin" },
];

// Helper Arrays for Random Generation
const MALE_NAMES = ["David", "Moshe", "Yosef", "Avraham", "Yitzchak", "Yaakov", "Chaim", "Shlomo", "Menachem", "Dovid", "Ariel", "Daniel", "Michael", "Eli", "Netanel", "Yehuda", "Simcha", "Tuvia", "Gavriel", "Binyamin", "Meir", "Shimon", "Levi", "Ezra", "Natan", "Akiva", "Baruch", "Eliezer", "Hillel", "Shmuel"];
const FEMALE_NAMES = ["Sarah", "Rivka", "Rachel", "Leah", "Chana", "Miriam", "Esther", "Devorah", "Yael", "Tamar", "Ayala", "Noa", "Shira", "Tziporah", "Elisheva", "Michal", "Avigail", "Rut", "Naomi", "Dina", "Batya", "Geula", "Hadassah", "Yehudit", "Malka", "Shoshana", "Penina", "Bracha", "Adina", "Tehilla"];
const LAST_NAMES = ["Cohen", "Levi", "Shapiro", "Friedman", "Katz", "Goldstein", "Stern", "Rosenberg", "Klein", "Weiss", "Mizrachi", "Azoulay", "Biton", "Peretz", "Hassan", "Abutbul", "Gabai", "Amar", "Ohana", "Edri", "Schwartz", "Feldman", "Epstein", "Gottlieb", "Levin", "Green", "Brown", "Silver", "Rubin", "Segal"];
const LOCATIONS = ["Jerusalem, Israel", "Tel Aviv, Israel", "Bnei Brak, Israel", "Lakewood, NJ", "Brooklyn, NY", "London, UK", "Manchester, UK", "Monsey, NY", "Five Towns, NY", "Chicago, IL", "Los Angeles, CA", "Miami, FL", "Efrat, Israel", "Raanana, Israel", "Bet Shemesh, Israel", "Petach Tikva, Israel", "Haifa, Israel", "Be'er Sheva, Israel", "Ashdod, Israel", "Netanya, Israel"];

const ETHNICITIES = ["Ashkenazi", "Sephardi", "Mizrahi", "Yemenite", "Ethiopian"];
const HASHKAFOS = ["Haredi", "Hardal", "Dati Leumi", "Modern Orthodox", "Yeshivish American", "Yeshivish Litvish", "Yeshivish Hasidish", "Chabad", "Masorti", "Traditional", "Secular"];
const PROFESSIONS = ["Accountant", "Lawyer", "Doctor", "Nurse", "Student", "Teacher", "Rebbi", "Programmer", "Engineer", "Architect", "Designer", "Social Worker", "Psychologist", "Business Owner", "Sales", "Real Estate", "Therapist", "Actuary", "Dentist", "Consultant"];
const HOBBIES_LIST = ["Reading", "Hiking", "Music", "Cooking", "Traveling", "Learning Torah", "Sports", "Art", "Writing", "Volunteering", "Photography", "Gardening", "Chess", "History", "Swimming", "Running"];
const LEARNING_STATUS = ["Full Time", "Half Time", "Koveah Itim", "Working", "N/A"];
const HEAD_COVERING_FEMALE = ["Uncovered", "Wig", "Hat", "Scarf", "Flexible"];
const PREFERRED_HEAD_COVERING_MALE = ["Uncovered", "Wig", "Hat", "Scarf", "I don't mind"];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomElements = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateMockClients = (count: number): Client[] => {
    const clients: Client[] = [];
    for (let i = 0; i < count; i++) {
        const gender = Math.random() > 0.5 ? "Male" : "Female";
        const isMale = gender === "Male";
        const firstName = isMale ? getRandomElement(MALE_NAMES) : getRandomElement(FEMALE_NAMES);
        const lastName = getRandomElement(LAST_NAMES);
        const age = getRandomInt(19, 45);
        const birthYear = new Date().getFullYear() - age;
        const dob = `${birthYear}-${getRandomInt(1, 12).toString().padStart(2, '0')}-${getRandomInt(1, 28).toString().padStart(2, '0')}`;

        let headCovering = "";
        let preferredHeadCovering: string[] = [];

        if (isMale) {
            headCovering = getRandomElement(["Kippah", "Black Hat", "None", "Kippah Seruga"]);
            preferredHeadCovering = Math.random() > 0.3 ? [getRandomElement(PREFERRED_HEAD_COVERING_MALE)] : ["I don't mind"];
        } else {
            headCovering = getRandomElement(HEAD_COVERING_FEMALE);
            preferredHeadCovering = [];
        }

        const client: Client = {
            id: (i + 1).toString(),
            fullName: `${firstName} ${lastName}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
            phone: `+1-555-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`,
            dob: dob,
            location: getRandomElement(LOCATIONS),
            gender: gender,
            height: getRandomInt(155, 190), // Changed to number
            eyeColor: getRandomElement(["Brown", "Blue", "Green", "Hazel", "Grey", "Other"]),
            hairColor: getRandomElement(["Black", "Brown", "Blond", "Red", "Bald"]),
            ethnicity: getRandomElement(ETHNICITIES),
            tribalStatus: isMale ? getRandomElement(["Cohen", "Levi", "Yisrael"]) : "Yisrael",
            religiousAffiliation: getRandomElements(HASHKAFOS, 1),
            learningStatus: getRandomElement(LEARNING_STATUS) || "Working",
            maritalStatus: getRandomElement(["Single", "Divorced", "Widowed"]),
            children: getRandomInt(0, 5), // Added children
            languages: getRandomElements(["English", "Hebrew", "French", "Spanish", "Yiddish"], getRandomInt(1, 3)),
            familyBackground: getRandomElement(["Baal Teshuva", "FFB", "Modern", "Traditional"]),
            education: getRandomElement(["High School", "Seminary", "Yeshiva", "Bachelor's", "Master's", "PhD"]),
            occupation: getRandomElement(PROFESSIONS),
            smoking: Math.random() > 0.9 ? "Yes" : "No",
            headCovering: headCovering,
            hobbies: getRandomElements(HOBBIES_LIST, getRandomInt(2, 4)), // Keep as array
            personality: getRandomElement(["Quiet", "Outgoing", "Serious", "Funny", "Intellectual", "Kind", "Energetic"]),
            medicalHistory: Math.random() > 0.9,
            medicalHistoryDetails: "Minor allergy",
            lookingFor: "Someone compatible with similar values",
            willingToRelocate: getRandomElement(["Yes", "No", "Maybe"]),
            ageGapPreference: [getRandomElement(["1-2 years", "3-5 years", "5-10 years"])],
            preferredEthnicities: Math.random() > 0.3 ? ["I don't mind"] : getRandomElements(ETHNICITIES, 2),
            preferredHashkafos: getRandomElements(HASHKAFOS, 2),
            preferredLearningStatus: getRandomElements(["Full Time", "Half Time", "Working", "I don't mind"], 2),
            preferredHeadCovering: preferredHeadCovering,
            references: `Rabbi ${getRandomElement(LAST_NAMES)}`,
            notes: "Generated mock client",
            active: true,
            createdAt: new Date().toISOString().split("T")[0],
        };
        clients.push(client);
    }
    return clients;
};


const testClient: Client = {
    id: "test-long-list",
    fullName: "Test Client Long List",
    email: "test.long@example.com",
    phone: "555-0000",
    dob: "1995-01-01",
    location: "Jerusalem, Israel",
    gender: "Female",
    height: 165,
    eyeColor: "Brown",
    hairColor: "Black",
    ethnicity: "Ashkenazi",
    tribalStatus: "Yisrael",
    religiousAffiliation: ["Yeshivish Litvish"],
    learningStatus: "Working",
    maritalStatus: "Single",
    children: 0,
    languages: ["English", "Hebrew"],
    familyBackground: "FFB",
    education: "Seminary",
    occupation: "Teacher",
    smoking: "No",
    headCovering: "Wig",
    hobbies: ["Reading"],
    personality: "Quiet",
    medicalHistory: false,
    lookingFor: "Someone nice",
    willingToRelocate: "No", // Dealbreaker 1
    ageGapPreference: ["1-2 years", "3-5 years"], // Dealbreaker 2
    preferredEthnicities: ["Ashkenazi", "Sephardi", "Yemenite", "Convert", "Mixed", "Ashkenazi (Strict)", "Sephardi (Strict)", "Yemenite (Strict)", "Other"],
    preferredHashkafos: ["Yeshivish Litvish", "Yeshivish Hasidish", "Chabad", "Modern Orthodox", "Hardal", "Chassidish (General)", "Chassidish (Gur)", "Chassidish (Belz)", "Chassidish (Satmar)", "Chassidish (Vizhnitz)", "Litvish (Modern)", "Litvish (Yeshivish)", "Carlebach", "Breslov"],
    preferredLearningStatus: ["Full Time", "Working & Learning", "Working", "Student", "Retired"],
    preferredHeadCovering: ["Kippah", "Black Hat", "None", "Kippah Sruga", "Baseball Cap", "Fedora", "Shtreimel", "Any"], // Dealbreaker 6
    expectedHeadCovering: "Wig",
    references: "None",
    notes: "For testing scrolling",
    active: true,
    createdAt: new Date().toISOString().split("T")[0],
};

export const MOCK_CLIENTS: Client[] = [testClient, ...generateMockClients(100)];


export const MOCK_MATCHES: Match[] = [];

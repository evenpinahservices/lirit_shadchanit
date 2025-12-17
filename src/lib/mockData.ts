
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
    // lookingFor removed
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

    // lookingFor removed
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

    // Ensure 50/50 gender split
    const maleCount = Math.ceil(count / 2);
    const femaleCount = count - maleCount;

    const generateClient = (i: number, forcedGender: "Male" | "Female"): Client => {
        const gender = forcedGender;
        const isMale = gender === "Male";
        const firstName = isMale ? getRandomElement(MALE_NAMES) : getRandomElement(FEMALE_NAMES);
        const lastName = getRandomElement(LAST_NAMES);

        // Age clusters: 19-24, 25-30, 31-40, 41-45
        const ageCluster = getRandomElement([
            { min: 19, max: 24 },
            { min: 25, max: 30 },
            { min: 31, max: 40 },
            { min: 41, max: 45 }
        ]);
        const age = getRandomInt(ageCluster.min, ageCluster.max);
        const birthYear = new Date().getFullYear() - age;
        const dob = `${birthYear}-${getRandomInt(1, 12).toString().padStart(2, '0')}-${getRandomInt(1, 28).toString().padStart(2, '0')}`;

        // Location clusters: 30% Jerusalem, 20% Tel Aviv, 15% Lakewood, rest random
        let location: string;
        const locationRoll = Math.random();
        if (locationRoll < 0.3) {
            location = "Jerusalem, Israel";
        } else if (locationRoll < 0.5) {
            location = "Tel Aviv, Israel";
        } else if (locationRoll < 0.65) {
            location = "Lakewood, NJ";
        } else {
            location = getRandomElement(LOCATIONS);
        }

        let headCovering = "";
        let preferredHeadCovering: string[] = [];

        if (isMale) {
            headCovering = "N/A"; // Male head covering defaults to N/A
            // Men prefer female head covering
            preferredHeadCovering = Math.random() > 0.4
                ? [getRandomElement(HEAD_COVERING_FEMALE)]
                : ["I don't mind"];
        } else {
            headCovering = getRandomElement(HEAD_COVERING_FEMALE);
            preferredHeadCovering = []; // Women don't ask about male head covering anymore
        }

        // Vary preference strictness for matching tests
        const isStrict = Math.random() > 0.6; // 40% are strict

        const preferredEthnicities = isStrict
            ? getRandomElements(ETHNICITIES, getRandomInt(1, 2))
            : ["I don't mind"];

        const preferredHashkafos = isStrict
            ? getRandomElements(HASHKAFOS, getRandomInt(1, 3))
            : getRandomElements(HASHKAFOS, getRandomInt(2, 4));

        const preferredLearningStatus = isStrict
            ? [getRandomElement(LEARNING_STATUS)]
            : ["I don't mind"];

        // Age gap preference - vary strictness
        const ageGapPreference = isStrict
            ? [getRandomElement(["1-2 years", "3-5 years"])]
            : [getRandomElement(["5-10 years", "I don't mind"])];

        // Relocation - cluster to test location matching
        const willingToRelocate = isStrict ? "No" : getRandomElement(["Yes", "Maybe"]);

        const client: Client = {
            id: `gen-${i + 1}`,
            fullName: `${firstName} ${lastName}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
            phone: `+1-555-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`,
            dob: dob,
            location: location,
            gender: gender,
            height: getRandomInt(155, 190),
            eyeColor: getRandomElement(["Brown", "Blue", "Green", "Hazel", "Grey", "Other"]),
            hairColor: getRandomElement(["Black", "Brown", "Blonde", "Red", "Bald"]),
            ethnicity: getRandomElement(ETHNICITIES),
            tribalStatus: isMale ? getRandomElement(["Cohen", "Levi", "Yisrael"]) : "Yisrael",
            religiousAffiliation: getRandomElements(HASHKAFOS, 1),
            learningStatus: getRandomElement(LEARNING_STATUS) || "Working",
            maritalStatus: getRandomElement(["Single", "Divorced", "Widowed"]),
            children: getRandomInt(0, 3),
            languages: getRandomElements(["English", "Hebrew", "French", "Spanish", "Yiddish"], getRandomInt(1, 3)),
            familyBackground: getRandomElement(["Baal Teshuva", "FFB", "Modern", "Traditional"]),
            education: getRandomElement(["High School", "Seminary", "Yeshiva", "Bachelor's", "Master's", "PhD"]),
            occupation: getRandomElement(PROFESSIONS),
            smoking: Math.random() > 0.9 ? "Yes" : "No",
            headCovering: headCovering,
            hobbies: getRandomElements(HOBBIES_LIST, getRandomInt(2, 4)),
            personality: getRandomElement(["Quiet", "Outgoing", "Serious", "Funny", "Intellectual", "Kind", "Energetic"]),
            medicalHistory: Math.random() > 0.9,
            medicalHistoryDetails: "Minor allergy",
            // lookingFor removed
            willingToRelocate: willingToRelocate,
            ageGapPreference: ageGapPreference,
            preferredEthnicities: preferredEthnicities,
            preferredHashkafos: preferredHashkafos,
            preferredLearningStatus: preferredLearningStatus,
            preferredHeadCovering: preferredHeadCovering,
            expectedHeadCovering: isMale ? getRandomElement(["Wig", "Tichel", "I don't mind"]) : "",
            references: `Rabbi ${getRandomElement(LAST_NAMES)}`,
            notes: "Auto-generated personality description for testing purposes.",
            active: true,
            createdAt: new Date().toISOString().split("T")[0],
        };
        return client;
    };

    // Generate males
    for (let i = 0; i < maleCount; i++) {
        clients.push(generateClient(i, "Male"));
    }
    // Generate females
    for (let i = 0; i < femaleCount; i++) {
        clients.push(generateClient(maleCount + i, "Female"));
    }

    // Shuffle to mix genders
    return clients.sort(() => 0.5 - Math.random());
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
    // lookingFor: "Someone nice", - removed
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

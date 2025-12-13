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
    height: string; // in cm
    eyeColor: string;
    hairColor: string;
    photoUrl?: string;

    // Background
    ethnicity: string; // Single-select
    tribalStatus: string; // Drop-down
    religiousAffiliation: string[]; // Multi-select
    learningStatus: string; // Single-select
    maritalStatus: string;
    languages: string[]; // Multi-select
    familyBackground: string;
    education: string;
    occupation: string;
    smoking: string; // Drop-down
    headCovering: string; // Drop-down

    // Personal
    hobbies: string;
    personality: string;
    medicalHistory: boolean; // Yes/No
    medicalHistoryDetails?: string; // Optional explanation if Yes

    // Preferences / Match Criteria
    lookingFor: string;
    willingToRelocate: string; // Yes/No/Maybe
    ageGapPreference: string[]; // Multi-select: 1-2, 3-5, 5-10
    preferredEthnicities: string[]; // Multi-select
    preferredHashkafos: string[]; // Multi-select
    preferredLearningStatus: string[]; // Multi-select
    preferredHeadCovering: string[]; // Multi-select

    // Admin / Meta
    references: string;
    notes: string;
    status?: "Active" | "Inactive" | "Matched"; // Deprecated
    createdAt: string;
}

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

// Helper Arrays for Random Generation - STRICTLY ALIGNED WITH ClientForm.tsx
const MALE_NAMES = ["David", "Moshe", "Yosef", "Avraham", "Yitzchak", "Yaakov", "Chaim", "Shlomo", "Menachem", "Dovid", "Ariel", "Daniel", "Michael", "Eli", "Netanel", "Yehuda", "Simcha", "Tuvia", "Gavriel", "Binyamin", "Meir", "Shimon", "Levi", "Ezra", "Natan", "Akiva", "Baruch", "Eliezer", "Hillel", "Shmuel"];
const FEMALE_NAMES = ["Sarah", "Rivka", "Rachel", "Leah", "Chana", "Miriam", "Esther", "Devorah", "Yael", "Tamar", "Ayala", "Noa", "Shira", "Tziporah", "Elisheva", "Michal", "Avigail", "Rut", "Naomi", "Dina", "Batya", "Geula", "Hadassah", "Yehudit", "Malka", "Shoshana", "Penina", "Bracha", "Adina", "Tehilla"];
const LAST_NAMES = ["Cohen", "Levi", "Shapiro", "Friedman", "Katz", "Goldstein", "Stern", "Rosenberg", "Klein", "Weiss", "Mizrachi", "Azoulay", "Biton", "Peretz", "Hassan", "Abutbul", "Gabai", "Amar", "Ohana", "Edri", "Schwartz", "Feldman", "Epstein", "Gottlieb", "Levin", "Green", "Brown", "Silver", "Rubin", "Segal"];
const LOCATIONS = ["Jerusalem, Israel", "Tel Aviv, Israel", "Bnei Brak, Israel", "Lakewood, NJ", "Brooklyn, NY", "London, UK", "Manchester, UK", "Monsey, NY", "Five Towns, NY", "Chicago, IL", "Los Angeles, CA", "Miami, FL", "Efrat, Israel", "Raanana, Israel", "Bet Shemesh, Israel", "Petach Tikva, Israel", "Haifa, Israel", "Be'er Sheva, Israel", "Ashdod, Israel", "Netanya, Israel"];

// Valid Options from ClientForm.tsx
const ETHNICITIES = ["Ashkenazi", "Sephardi", "Mizrahi", "Yemenite", "Ethiopian"];
const HASHKAFOS = ["Haredi", "Hardal", "Dati Leumi", "Modern Orthodox", "Yeshivish American", "Yeshivish Litvish", "Yeshivish Hasidish", "Chabad", "Masorti", "Traditional", "Secular"];
const PROFESSIONS = ["Accountant", "Lawyer", "Doctor", "Nurse", "Student", "Teacher", "Rebbi", "Programmer", "Engineer", "Architect", "Designer", "Social Worker", "Psychologist", "Business Owner", "Sales", "Real Estate", "Therapist", "Actuary", "Dentist", "Consultant"];
const HOBBIES_LIST = ["Reading", "Hiking", "Music", "Cooking", "Traveling", "Learning Torah", "Sports", "Art", "Writing", "Volunteering", "Photography", "Gardening", "Chess", "History", "Swimming", "Running"];
const LEARNING_STATUS = ["Full Time", "Half Time", "Koveah Itim", "Working", "N/A"];
const HEAD_COVERING_FEMALE = ["Uncovered", "Wig", "Hat", "Scarf", "Flexible"];
const PREFERRED_HEAD_COVERING_MALE = ["Uncovered", "Wig", "Hat", "Scarf", "I don't mind"]; // For what the man wants the woman to wear

// Random Helper
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomElements = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generator Function
const generateMockClients = (count: number): Client[] => {
    const clients: Client[] = [];
    for (let i = 0; i < count; i++) {
        const gender = Math.random() > 0.5 ? "Male" : "Female";
        const isMale = gender === "Male";
        const firstName = isMale ? getRandomElement(MALE_NAMES) : getRandomElement(FEMALE_NAMES);
        const lastName = getRandomElement(LAST_NAMES);
        const age = getRandomInt(19, 45);
        const birthYear = new Date().getFullYear() - age;
        const dob = `${birthYear}-${getRandomInt(1, 12).toString().padStart(2, '0')}-${getRandomInt(1, 28).toString().padStart(2, '0')}`;

        // Head Covering Logic
        let headCovering = "";
        let preferredHeadCovering: string[] = [];

        if (isMale) {
            headCovering = getRandomElement(["Kippah", "Black Hat", "None", "Kippah Seruga"]);
            // Men select what they want the woman to wear
            preferredHeadCovering = Math.random() > 0.3 ? [getRandomElement(PREFERRED_HEAD_COVERING_MALE)] : ["I don't mind"];
        } else {
            // Women select what they wear
            headCovering = getRandomElement(HEAD_COVERING_FEMALE);
            // Women DO NOT select preferred head covering in the current form (it says Men Only), so we leave it empty.
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
            height: getRandomInt(155, 190).toString(),
            eyeColor: getRandomElement(["Brown", "Blue", "Green", "Hazel", "Grey", "Other"]),
            hairColor: getRandomElement(["Black", "Brown", "Blond", "Red", "Bald"]),
            ethnicity: getRandomElement(ETHNICITIES),
            tribalStatus: isMale ? getRandomElement(["Cohen", "Levi", "Yisrael"]) : "Yisrael",
            religiousAffiliation: getRandomElements(HASHKAFOS, 1),
            learningStatus: getRandomElement(LEARNING_STATUS) || "Working",
            maritalStatus: getRandomElement(["Single", "Divorced", "Widowed"]),
            languages: getRandomElements(["English", "Hebrew", "French", "Spanish", "Yiddish"], getRandomInt(1, 3)),
            familyBackground: getRandomElement(["Baal Teshuva", "FFB", "Modern", "Traditional"]),
            education: getRandomElement(["High School", "Seminary", "Yeshiva", "Bachelor's", "Master's", "PhD"]),
            occupation: getRandomElement(PROFESSIONS),
            smoking: Math.random() > 0.9 ? "Yes" : "No",
            headCovering: headCovering,
            hobbies: getRandomElements(HOBBIES_LIST, getRandomInt(2, 4)).join(", "),
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
            createdAt: new Date().toISOString().split("T")[0],
        };
        clients.push(client);
    }
    return clients;
};

export const MOCK_CLIENTS: Client[] = generateMockClients(100);

export const MOCK_MATCHES: Match[] = [];

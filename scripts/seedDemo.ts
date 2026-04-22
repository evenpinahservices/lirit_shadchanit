/**
 * Seeds the demo user and demo database clients.
 * Run with: npx tsx scripts/seedDemo.ts
 *
 * Creates:
 *   - User  { username: "demo", password: "demo" }  in the main DB
 *   - 6 sample clients with photos                  in the "demo" DB
 */

import mongoose, { Schema, Connection } from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env.local");
    process.exit(1);
}

// ── Schemas ────────────────────────────────────────────────────────────────

const UserSchema = new Schema(
    {
        username: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        role: { type: String, default: "user" },
        password: { type: String, required: true },
        dbName: { type: String },
    },
    { timestamps: true }
);

const ClientSchema = new Schema(
    {
        fullName: { type: String, required: true },
        email: String,
        phone: String,
        dob: { type: String, required: true },
        location: String,
        gender: { type: String, enum: ["Male", "Female"], required: true },
        height: Number,
        eyeColor: String,
        hairColor: String,
        photoUrl: String,
        galleryImages: { type: [String], default: [] },
        ethnicity: String,
        tribalStatus: String,
        religiousAffiliation: { type: [String], default: [] },
        learningStatus: String,
        headCovering: String,
        religiousDetailsFreeText: String,
        maritalStatus: String,
        children: { type: Number, default: 0 },
        languages: { type: [String], default: [] },
        familyBackground: String,
        education: String,
        occupationTitle: String,
        occupationDescription: String,
        smoking: String,
        hobbies: String,
        personality: String,
        medicalHistory: { type: Boolean, default: false },
        willingToRelocate: String,
        ageGapPreference: { type: [String], default: [] },
        preferredEthnicities: { type: [String], default: [] },
        preferredHashkafos: { type: [String], default: [] },
        preferredLearningStatus: { type: [String], default: [] },
        preferredHeadCovering: { type: [String], default: [] },
        references: String,
        notes: String,
        active: { type: Boolean, default: true },
        formLanguage: { type: String, default: "en" },
        createdAt: String,
    },
    { timestamps: true }
);

// ── Demo clients data ──────────────────────────────────────────────────────

const DEMO_CLIENTS = [
    {
        fullName: "David Cohen",
        email: "david.cohen@example.com",
        phone: "+1-212-555-0101",
        dob: "1997-03-14",
        location: "Jerusalem, Israel",
        gender: "Male",
        height: 178,
        eyeColor: "Brown",
        hairColor: "Black",
        photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
        ethnicity: "Ashkenazi",
        tribalStatus: "Levi",
        religiousAffiliation: ["Yeshivish Litvish"],
        learningStatus: "Koveah Itim",
        headCovering: "N/A",
        maritalStatus: "Single",
        children: 0,
        languages: ["English", "Hebrew"],
        familyBackground: "FFB",
        education: "Bachelor's",
        occupationTitle: "Accountant",
        occupationDescription: "CPA at a mid-size firm in Jerusalem.",
        smoking: "No",
        hobbies: "Learning Torah, Chess, Hiking",
        personality: "Serious",
        medicalHistory: false,
        willingToRelocate: "Maybe",
        ageGapPreference: ["1-2 years", "3-5 years"],
        preferredEthnicities: ["I don't mind"],
        preferredHashkafos: ["Yeshivish Litvish", "Hardal"],
        preferredLearningStatus: ["Koveah Itim", "Half Time"],
        preferredHeadCovering: ["Wig", "Hat"],
        references: "Rabbi Stern",
        notes: "Looking for a serious, family-oriented partner.",
        active: true,
        formLanguage: "en",
    },
    {
        fullName: "Yosef Shapiro",
        email: "yosef.shapiro@example.com",
        phone: "+1-732-555-0202",
        dob: "1993-07-22",
        location: "Lakewood, NJ",
        gender: "Male",
        height: 182,
        eyeColor: "Hazel",
        hairColor: "Brown",
        photoUrl: "https://randomuser.me/api/portraits/men/45.jpg",
        ethnicity: "Ashkenazi",
        tribalStatus: "Yisrael",
        religiousAffiliation: ["Yeshivish American"],
        learningStatus: "Full Time",
        headCovering: "N/A",
        maritalStatus: "Divorced",
        children: 1,
        languages: ["English", "Yiddish"],
        familyBackground: "FFB",
        education: "Yeshiva",
        occupationTitle: "Rebbi",
        occupationDescription: "Teaches in a local yeshiva.",
        smoking: "No",
        hobbies: "Learning Torah, Music, Volunteering",
        personality: "Outgoing",
        medicalHistory: false,
        willingToRelocate: "No",
        ageGapPreference: ["3-5 years"],
        preferredEthnicities: ["Ashkenazi"],
        preferredHashkafos: ["Yeshivish American", "Yeshivish Litvish"],
        preferredLearningStatus: ["Full Time", "Half Time"],
        preferredHeadCovering: ["Wig"],
        references: "Rabbi Goldstein",
        notes: "Has a wonderful young son. Looking for a warm, nurturing partner.",
        active: true,
        formLanguage: "en",
    },
    {
        fullName: "Ariel Mizrachi",
        email: "ariel.mizrachi@example.com",
        phone: "+972-50-555-0303",
        dob: "1999-11-05",
        location: "Tel Aviv, Israel",
        gender: "Male",
        height: 175,
        eyeColor: "Brown",
        hairColor: "Black",
        photoUrl: "https://randomuser.me/api/portraits/men/67.jpg",
        ethnicity: "Sephardi",
        tribalStatus: "Cohen",
        religiousAffiliation: ["Dati Leumi"],
        learningStatus: "Koveah Itim",
        headCovering: "N/A",
        maritalStatus: "Single",
        children: 0,
        languages: ["Hebrew", "French"],
        familyBackground: "Traditional",
        education: "Bachelor's",
        occupationTitle: "Engineer",
        occupationDescription: "Software engineer at a startup.",
        smoking: "No",
        hobbies: "Running, Photography, Traveling",
        personality: "Energetic",
        medicalHistory: false,
        willingToRelocate: "Yes",
        ageGapPreference: ["I don't mind"],
        preferredEthnicities: ["I don't mind"],
        preferredHashkafos: ["Dati Leumi", "Modern Orthodox"],
        preferredLearningStatus: ["I don't mind"],
        preferredHeadCovering: ["I don't mind"],
        references: "Rabbi Ben-David",
        notes: "Active, loves Israel and the outdoors.",
        active: true,
        formLanguage: "en",
    },
    {
        fullName: "Sarah Friedman",
        email: "sarah.friedman@example.com",
        phone: "+1-212-555-0404",
        dob: "2000-05-18",
        location: "Brooklyn, NY",
        gender: "Female",
        height: 163,
        eyeColor: "Blue",
        hairColor: "Brown",
        photoUrl: "https://randomuser.me/api/portraits/women/44.jpg",
        ethnicity: "Ashkenazi",
        tribalStatus: "Yisrael",
        religiousAffiliation: ["Yeshivish Litvish"],
        learningStatus: "N/A",
        headCovering: "Uncovered",
        maritalStatus: "Single",
        children: 0,
        languages: ["English", "Hebrew"],
        familyBackground: "FFB",
        education: "Bachelor's",
        occupationTitle: "Teacher",
        occupationDescription: "Elementary school teacher in Brooklyn.",
        smoking: "No",
        hobbies: "Reading, Cooking, Art",
        personality: "Kind",
        medicalHistory: false,
        willingToRelocate: "Maybe",
        ageGapPreference: ["3-5 years"],
        preferredEthnicities: ["I don't mind"],
        preferredHashkafos: ["Yeshivish Litvish", "Yeshivish American"],
        preferredLearningStatus: ["Full Time", "Koveah Itim"],
        preferredHeadCovering: [],
        references: "Mrs. Weiss",
        notes: "Sweet, family-oriented, close with her family.",
        active: true,
        formLanguage: "en",
    },
    {
        fullName: "Rivka Katz",
        email: "rivka.katz@example.com",
        phone: "+1-732-555-0505",
        dob: "1996-09-30",
        location: "Lakewood, NJ",
        gender: "Female",
        height: 167,
        eyeColor: "Green",
        hairColor: "Blonde",
        photoUrl: "https://randomuser.me/api/portraits/women/26.jpg",
        ethnicity: "Ashkenazi",
        tribalStatus: "Yisrael",
        religiousAffiliation: ["Yeshivish American"],
        learningStatus: "N/A",
        headCovering: "Wig",
        maritalStatus: "Divorced",
        children: 0,
        languages: ["English"],
        familyBackground: "FFB",
        education: "Seminary",
        occupationTitle: "Social Worker",
        occupationDescription: "Licensed social worker helping families.",
        smoking: "No",
        hobbies: "Volunteering, Gardening, Music",
        personality: "Quiet",
        medicalHistory: false,
        willingToRelocate: "No",
        ageGapPreference: ["3-5 years", "5-10 years"],
        preferredEthnicities: ["Ashkenazi"],
        preferredHashkafos: ["Yeshivish American"],
        preferredLearningStatus: ["Full Time"],
        preferredHeadCovering: [],
        references: "Rabbi Klein",
        notes: "Warm and compassionate. Looking for stability.",
        active: true,
        formLanguage: "en",
    },
    {
        fullName: "Noa Peretz",
        email: "noa.peretz@example.com",
        phone: "+972-54-555-0606",
        dob: "2001-01-12",
        location: "Ra'anana, Israel",
        gender: "Female",
        height: 160,
        eyeColor: "Brown",
        hairColor: "Black",
        photoUrl: "https://randomuser.me/api/portraits/women/68.jpg",
        ethnicity: "Sephardi",
        tribalStatus: "Yisrael",
        religiousAffiliation: ["Dati Leumi"],
        learningStatus: "N/A",
        headCovering: "Hat",
        maritalStatus: "Single",
        children: 0,
        languages: ["Hebrew", "English"],
        familyBackground: "Traditional",
        education: "Bachelor's",
        occupationTitle: "Nurse",
        occupationDescription: "Registered nurse at a hospital in the center.",
        smoking: "No",
        hobbies: "Swimming, Traveling, Writing",
        personality: "Funny",
        medicalHistory: false,
        willingToRelocate: "Yes",
        ageGapPreference: ["I don't mind"],
        preferredEthnicities: ["I don't mind"],
        preferredHashkafos: ["Dati Leumi", "Modern Orthodox", "Traditional"],
        preferredLearningStatus: ["I don't mind"],
        preferredHeadCovering: [],
        references: "Mrs. Mizrahi",
        notes: "Adventurous, loves people and life.",
        active: true,
        formLanguage: "en",
    },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function getModel(conn: Connection, name: string, schema: Schema) {
    return conn.models[name] || conn.model(name, schema);
}

async function seed() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI as string);
    const mainConn = mongoose.connection;
    const demoConn = mainConn.useDb("demo", { useCache: true });

    const User = await getModel(mainConn, "User", UserSchema);
    const DemoClient = await getModel(demoConn, "Client", ClientSchema);

    // Upsert demo user in the main DB
    const hashedPassword = await bcrypt.hash("demo", 10);
    const demoUser = await (User as any).findOneAndUpdate(
        { username: "demo" },
        {
            username: "demo",
            name: "Demo",
            role: "user",
            password: hashedPassword,
            dbName: "demo",
        },
        { upsert: true, new: true }
    );
    console.log(`Demo user ready (id: ${demoUser._id})`);

    // Clear existing demo clients and re-seed
    await (DemoClient as any).deleteMany({});
    const today = new Date().toISOString().split("T")[0];
    const docs = DEMO_CLIENTS.map((c) => ({ ...c, createdAt: today }));
    await (DemoClient as any).insertMany(docs);
    console.log(`Inserted ${docs.length} demo clients into the "demo" database`);

    await mongoose.disconnect();
    console.log("Done! Login with  username: demo  password: demo");
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});

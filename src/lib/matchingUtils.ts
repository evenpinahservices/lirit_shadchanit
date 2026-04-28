import { Client } from "./mockData";
import { areLocationsCompatible, parseHebrewYearToNumber, detectClientLanguage } from "./utils";
import { compareLocationsEnhanced } from "./locationMapping";

export const calculateAge = (dob: string): number => {
    if (!dob) return NaN;

    // Year-only: "1985"
    if (/^\d{4}$/.test(dob)) {
        return new Date().getFullYear() - parseInt(dob, 10);
    }

    // Hebrew date: "Hebrew: ה אייר תשס״ח"
    if (dob.includes("Hebrew:")) {
        const parts = dob.trim().split(" ");
        const hebrewYearStr = parts[parts.length - 1];
        let numericYear = parseInt(hebrewYearStr, 10);
        if (isNaN(numericYear) || numericYear < 1000) {
            numericYear = parseHebrewYearToNumber(hebrewYearStr);
        }
        if (!isNaN(numericYear) && numericYear > 1000) {
            return new Date().getFullYear() - (numericYear - 3760);
        }
        return NaN;
    }

    // Standard date: "YYYY-MM-DD"
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return NaN;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
};

const WILDCARD_PHRASES = [
    "any", "all", "flexible", "doesn't matter", "i don't mind",
    "n/a", "not applicable", "all ages", "any gap", "any range",
];

function isWildcard(val: string): boolean {
    const v = val.toLowerCase().trim();
    return WILDCARD_PHRASES.some((w) => v.includes(w));
}

function normalizeArr(val: string | string[] | undefined | null): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return [val];
}

// ── Ethnicity ────────────────────────────────────────────────────────────────

const ETH_MAP: Record<string, string> = {
    sephardi: "sephardi", sefardi: "sephardi", mizrachi: "sephardi", mizrahi: "sephardi",
    ashkenazi: "ashkenazi", ashkenaz: "ashkenazi",
    yemenite: "yemenite", yemeni: "yemenite",
    chassidic: "chassidic", chasidic: "chassidic", hasidic: "chassidic",
};

function ethGroup(e: string): string {
    return ETH_MAP[e.toLowerCase().trim()] ?? e.toLowerCase().trim();
}

function sameEthGroup(a: string, b: string): boolean {
    return ethGroup(a) === ethGroup(b);
}

// ── Age gap ──────────────────────────────────────────────────────────────────

function ageGapAllowed(prefs: string[], actualGap: number): boolean {
    if (prefs.length === 0 || prefs.some(isWildcard)) return true;
    return prefs.some((p) => {
        if (p.includes("+")) {
            const min = parseInt(p);
            return !isNaN(min) && actualGap >= min;
        }
        const m = p.match(/(\d+)\s*-\s*(\d+)/);
        if (m) return actualGap >= parseInt(m[1]) && actualGap <= parseInt(m[2]);
        return false;
    });
}

// ── Level 1: baseline (bidirectional) ────────────────────────────────────────
// Passes only when ALL community defaults are met on both sides.

function checkLevel1(a: Client, b: Client): boolean {
    const male = a.gender === "Male" ? a : b;
    const female = a.gender === "Female" ? a : b;

    // Divorced ↔ divorced only (strict, no expansion)
    const aDiv = a.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    const bDiv = b.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    if (aDiv !== bDiv) return false;

    // Same country / willing to relocate (use locationEnglish when available — no translation needed)
    if (!areLocationsCompatible(
        a.locationEnglish || a.location || "", b.locationEnglish || b.location || "",
        a.willingToRelocate, b.willingToRelocate
    )) return false;

    // Same ethnicity group (skip if either is missing)
    if (a.ethnicity && b.ethnicity && !sameEthGroup(a.ethnicity, b.ethnicity)) return false;

    // Default age gap: boy ≤ 3 yrs older, girl ≤ 1 yr older
    const mAge = calculateAge(male.dob);
    const fAge = calculateAge(female.dob);
    const ageDiff = mAge - fAge; // positive = male older
    if (ageDiff > 3 || ageDiff < -1) return false;

    // Haskafa: any overlap (liberal, bidirectional)
    const aAff = normalizeArr(a.religiousAffiliation);
    const bAff = normalizeArr(b.religiousAffiliation);
    if (aAff.length > 0 && bAff.length > 0 && !aAff.some((h) => bAff.includes(h))) return false;

    // Head covering: male's preference vs female's value
    const headPrefs = normalizeArr(male.preferredHeadCovering);
    if (headPrefs.length > 0 && !headPrefs.some(isWildcard)) {
        if (!female.headCovering) return false;
        if (female.headCovering !== "Flexible" && !headPrefs.includes(female.headCovering)) return false;
    }

    // Learning status: female's preference vs male's value
    const learnPrefs = normalizeArr(female.preferredLearningStatus);
    if (learnPrefs.length > 0 && !learnPrefs.some(isWildcard)) {
        if (!male.learningStatus) return false;
        if (!learnPrefs.includes(male.learningStatus)) return false;
    }

    return true;
}

// ── Level 2: personal expansion (bidirectional) ──────────────────────────────
// Hard rules always apply. Ethnicity and age gap are relaxed via personal prefs.
// Head covering and learning status are not checked — Level 2 is a broader match.

function checkLevel2(a: Client, b: Client): boolean {
    const male = a.gender === "Male" ? a : b;
    const female = a.gender === "Female" ? a : b;

    // Hard rules (always strict)
    const aDiv = a.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    const bDiv = b.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    if (aDiv !== bDiv) return false;

    if (!areLocationsCompatible(
        a.locationEnglish || a.location || "", b.locationEnglish || b.location || "",
        a.willingToRelocate, b.willingToRelocate
    )) return false;

    // Haskafa overlap still required
    const aAff = normalizeArr(a.religiousAffiliation);
    const bAff = normalizeArr(b.religiousAffiliation);
    if (aAff.length > 0 && bAff.length > 0 && !aAff.some((h) => bAff.includes(h))) return false;

    // Ethnicity: if different groups, both sides' personal prefs must allow it
    if (a.ethnicity && b.ethnicity && !sameEthGroup(a.ethnicity, b.ethnicity)) {
        const aEthPrefs = normalizeArr(a.preferredEthnicities);
        const bEthPrefs = normalizeArr(b.preferredEthnicities);
        const aOk =
            aEthPrefs.length === 0 ||
            aEthPrefs.some(isWildcard) ||
            aEthPrefs.some((e) => sameEthGroup(e, b.ethnicity!));
        const bOk =
            bEthPrefs.length === 0 ||
            bEthPrefs.some(isWildcard) ||
            bEthPrefs.some((e) => sameEthGroup(e, a.ethnicity!));
        if (!aOk || !bOk) return false;
    }

    // Age gap: both sides' personal prefs must allow the actual gap
    const mAge = calculateAge(male.dob);
    const fAge = calculateAge(female.dob);
    const absGap = Math.abs(mAge - fAge);
    const aGapPrefs = normalizeArr(a.ageGapPreference);
    const bGapPrefs = normalizeArr(b.ageGapPreference);
    if (!ageGapAllowed(aGapPrefs, absGap)) return false;
    if (!ageGapAllowed(bGapPrefs, absGap)) return false;

    return true;
}

// ── Weighted scoring ─────────────────────────────────────────────────────────
// Max possible score: age(3) + hashkafa(4) + location(4) + ethnicity(2) + knownAge(1) = 14
// Hard filters (deal breakers) still gate inclusion; scoring only determines order.

// Group 0 = Chareidi, 1 = Dati, 2 = Traditional/BT, 3 = Secular
const HASHKAFA_GROUP: Record<string, number> = {
    "Haredi": 0, "Yeshivish American": 0, "Yeshivish Litvish": 0,
    "Yeshivish Hasidish": 0, "Chabad": 0,
    "Hardal": 1, "Dati Leumi": 1, "Modern Orthodox": 1,
    "Baal Teshuva": 2, "Masorti": 2, "Traditional": 2,
    "Secular": 3,
};

function hashkafaScore(a: Client, b: Client): number {
    const aAff = normalizeArr(a.religiousAffiliation);
    const bAff = normalizeArr(b.religiousAffiliation);
    if (aAff.length === 0 || bAff.length === 0) return 0;
    const overlaps = aAff.filter(h => bAff.includes(h)).length;
    if (overlaps >= 2) return 4;
    if (overlaps === 1) return 3;
    // Level-2 pairs may have no exact overlap — score by closest group distance
    let minDist = Infinity;
    for (const ah of aAff) {
        for (const bh of bAff) {
            const ag = HASHKAFA_GROUP[ah];
            const bg = HASHKAFA_GROUP[bh];
            if (ag !== undefined && bg !== undefined) minDist = Math.min(minDist, Math.abs(ag - bg));
        }
    }
    return minDist === 1 ? 1 : 0;
}

function ageScore(male: Client, female: Client): number {
    const mAge = calculateAge(male.dob);
    const fAge = calculateAge(female.dob);
    if (isNaN(mAge) || isNaN(fAge)) return 0;
    const gap = Math.abs(mAge - fAge);
    if (gap <= 1) return 3;
    if (gap <= 2) return 2;
    if (gap <= 3) return 1;
    if (gap <= 5) return 0;
    return -1;
}

function locationScore(client: Client, candidate: Client): number {
    const loc1 = client.locationEnglish || client.location || "";
    const loc2 = candidate.locationEnglish || candidate.location || "";
    if (!loc1 || !loc2) return 0;
    if (compareLocationsEnhanced(loc1, loc2)) return 4; // same city
    if (areLocationsCompatible(loc1, loc2)) return 1;   // same country
    return 0;
}

function ethnicityScore(a: Client, b: Client): number {
    if (!a.ethnicity || !b.ethnicity) return 0;
    return sameEthGroup(a.ethnicity, b.ethnicity) ? 2 : 0;
}

export function scoreMatch(client: Client, candidate: Client): number {
    const male = client.gender === "Male" ? client : candidate;
    const female = client.gender === "Female" ? client : candidate;
    let score = 0;
    score += ageScore(male, female);
    score += hashkafaScore(client, candidate);
    score += locationScore(client, candidate);
    score += ethnicityScore(client, candidate);
    const age = calculateAge(candidate.dob || "");
    if (!isNaN(age) && age >= 0 && age <= 120) score += 1;
    return score;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface MatchResult {
    level1: Client[]; // all baseline matches (uncapped — UI decides display limit)
    level2: Client[]; // personal expansion matches (candidates that failed baseline)
}

export function findMatchesWithLevels(
    client: Client,
    allClients: Client[],
    dismissedIds: Set<string>
): MatchResult {
    const level1: Client[] = [];
    const level2: Client[] = [];

    const clientLang = detectClientLanguage(client);

    // Pre-filter to opposite-gender active non-dismissed candidates before scoring.
    // Halves the comparison set and avoids per-iteration guard checks.
    const candidates = allClients.filter(
        (c) =>
            c.id !== client.id &&
            c.active !== false &&
            !dismissedIds.has(c.id) &&
            c.gender !== client.gender
    );

    for (const candidate of candidates) {

        // Hebrew ↔ English pairs are never shown on the first pass; they fall to Level 2
        const mixedLanguages = detectClientLanguage(candidate) !== clientLang;

        if (!mixedLanguages && checkLevel1(client, candidate)) {
            level1.push(candidate);
        } else if (checkLevel2(client, candidate)) {
            level2.push(candidate);
        }
    }

    level1.sort((a, b) => scoreMatch(client, b) - scoreMatch(client, a));
    level2.sort((a, b) => scoreMatch(client, b) - scoreMatch(client, a));

    return { level1, level2 };
}

// Backward-compat shim used elsewhere in the codebase
export function findMatches(client: Client, allClients: Client[]): Client[] {
    const { level1, level2 } = findMatchesWithLevels(client, allClients, new Set());
    return [...level1, ...level2];
}

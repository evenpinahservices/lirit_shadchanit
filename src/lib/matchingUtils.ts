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

// ── Hashkafa groups ───────────────────────────────────────────────────────────
// Defined early — used by both hard filters and scoring.
// Groups: 0 = Chareidi, 1 = Dati, 2 = Traditional/BT, 3 = Secular
const HASHKAFA_GROUP: Record<string, number> = {
    "Haredi": 0, "Yeshivish American": 0, "Yeshivish Litvish": 0,
    "Yeshivish Hasidish": 0, "Chabad": 0,
    "Hardal": 1, "Dati Leumi": 1, "Modern Orthodox": 1,
    "Baal Teshuva": 2, "Masorti": 2, "Traditional": 2,
    "Secular": 3,
};

// True if at least one hashkafa pair falls in the same group.
// Unknown/missing hashkafa on either side → don't filter (benefit of the doubt).
function sameHashkafaGroup(a: Client, b: Client): boolean {
    const aAff = normalizeArr(a.religiousAffiliation);
    const bAff = normalizeArr(b.religiousAffiliation);
    if (aAff.length === 0 || bAff.length === 0) return true;
    for (const ah of aAff) {
        for (const bh of bAff) {
            const ag = HASHKAFA_GROUP[ah];
            const bg = HASHKAFA_GROUP[bh];
            if (ag === undefined || bg === undefined) return true; // unknown → allow
            if (ag === bg) return true;
        }
    }
    return false;
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

// For gaps above the hard limit: both sides must have explicit (non-empty, non-wildcard)
// age gap preferences that accommodate the actual gap.
function ageGapExplicitlyAllowed(prefs: string[], actualGap: number): boolean {
    if (prefs.length === 0 || prefs.some(isWildcard)) return false;
    return ageGapAllowed(prefs, actualGap);
}

// ── Level 1: baseline (bidirectional) ────────────────────────────────────────
// All community defaults must be met. Hard filters:
//   • divorced ↔ divorced only
//   • location compatible
//   • same ethnicity (never relaxed)
//   • woman ≤ 1yr older than man (absolute hard limit, never relaxed)
//   • man ≤ 3yr older than woman (relaxable in Level 2 with explicit prefs)
//   • same hashkafa group (Chareidi, Dati, Traditional/BT — never cross-group)
//   • head covering and learning status preferences

function checkLevel1(a: Client, b: Client): boolean {
    const male = a.gender === "Male" ? a : b;
    const female = a.gender === "Female" ? a : b;

    // Divorced ↔ divorced only
    const aDiv = a.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    const bDiv = b.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    if (aDiv !== bDiv) return false;

    // Location: same country, or both explicitly willing to relocate
    if (!areLocationsCompatible(
        a.locationEnglish || a.location || "", b.locationEnglish || b.location || "",
        a.willingToRelocate, b.willingToRelocate
    )) return false;

    // Ethnicity: hard filter — never match different groups
    if (a.ethnicity && b.ethnicity && !sameEthGroup(a.ethnicity, b.ethnicity)) return false;

    // Age gap: woman may be at most 1yr older than man (hard limit).
    // Man may be at most 3yr older than woman at baseline.
    const mAge = calculateAge(male.dob);
    const fAge = calculateAge(female.dob);
    if (!isNaN(mAge) && !isNaN(fAge)) {
        if (fAge - mAge > 1) return false; // woman too much older — never allowed
        if (mAge - fAge > 3) return false; // man too much older at baseline
    }

    // Hashkafa: must be in the same group — never pair Chareidi with Dati, Dati with Traditional, etc.
    if (!sameHashkafaGroup(a, b)) return false;

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
// Same hard filters as Level 1 for ethnicity and hashkafa (never relaxed).
// Age gap > 3 yrs only allowed when BOTH sides have explicit preferences permitting it.
// Head covering and learning status not re-checked (broader match).

function checkLevel2(a: Client, b: Client): boolean {
    const male = a.gender === "Male" ? a : b;
    const female = a.gender === "Female" ? a : b;

    // Divorced ↔ divorced only
    const aDiv = a.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    const bDiv = b.maritalStatus?.toLowerCase().includes("divorced") ?? false;
    if (aDiv !== bDiv) return false;

    // Location
    if (!areLocationsCompatible(
        a.locationEnglish || a.location || "", b.locationEnglish || b.location || "",
        a.willingToRelocate, b.willingToRelocate
    )) return false;

    // Ethnicity: always a hard filter — no relaxation in broader matching
    if (a.ethnicity && b.ethnicity && !sameEthGroup(a.ethnicity, b.ethnicity)) return false;

    // Hashkafa: same group required even in broader matching
    if (!sameHashkafaGroup(a, b)) return false;

    // Age gap: woman >1yr older is always blocked (even in personal expansion).
    // Man >3yr older only passes if BOTH sides have explicit preferences allowing it.
    const mAge = calculateAge(male.dob);
    const fAge = calculateAge(female.dob);
    if (!isNaN(mAge) && !isNaN(fAge)) {
        if (fAge - mAge > 1) return false; // absolute hard limit — never relaxable
        const manGap = mAge - fAge;
        if (manGap > 3) {
            const aGapPrefs = normalizeArr(a.ageGapPreference);
            const bGapPrefs = normalizeArr(b.ageGapPreference);
            if (!ageGapExplicitlyAllowed(aGapPrefs, manGap)) return false;
            if (!ageGapExplicitlyAllowed(bGapPrefs, manGap)) return false;
        }
    }

    return true;
}

// ── Weighted scoring ─────────────────────────────────────────────────────────
// Max possible score: age(3) + hashkafa(4) + location(4) + ethnicity(2) + knownAge(1) = 14
// Hard filters gate inclusion; scoring only determines order within each level.

function hashkafaScore(a: Client, b: Client): number {
    const aAff = normalizeArr(a.religiousAffiliation);
    const bAff = normalizeArr(b.religiousAffiliation);
    if (aAff.length === 0 || bAff.length === 0) return 0;
    const overlaps = aAff.filter(h => bAff.includes(h)).length;
    if (overlaps >= 2) return 4; // multiple shared hashkafot
    if (overlaps === 1) return 3; // one exact match
    // Same group but different subtypes (e.g. Haredi + Chabad — both Chareidi).
    // Cross-group pairs are blocked by the hard filter so can't reach here.
    return 2;
}

function ageScore(male: Client, female: Client): number {
    const mAge = calculateAge(male.dob);
    const fAge = calculateAge(female.dob);
    if (isNaN(mAge) || isNaN(fAge)) return 0;
    const gap = Math.abs(mAge - fAge);
    if (gap <= 1) return 3;
    if (gap <= 2) return 2;
    if (gap <= 3) return 1;
    return 0; // >3yr only reachable via level2 personal prefs
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
    const candidates = allClients.filter(
        (c) =>
            c.id !== client.id &&
            c.active !== false &&
            !dismissedIds.has(c.id) &&
            c.gender !== client.gender
    );

    for (const candidate of candidates) {
        // Hebrew ↔ English pairs fall to Level 2 (different form language)
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

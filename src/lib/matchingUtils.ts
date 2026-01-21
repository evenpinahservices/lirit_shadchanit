import { Client } from "./mockData";
import { areLocationsCompatible } from "./utils";

export const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export function findMatches(client: Client, allClients: Client[]): Client[] {
    const clientAge = calculateAge(client.dob);

    return allClients.filter((candidate) => {
        if (candidate.id === client.id) return false; // Don't match with self

        // 1. Gender: Always needs to be opposite gender
        if (client.gender === "Male" && candidate.gender !== "Female") return false;
        if (client.gender === "Female" && candidate.gender !== "Male") return false;

        // 2. Location matching: Same country = match, cross-country requires relocation
        // All Hebrew locations are stored with English backend, so matching is English to English
        const locationsCompatible = areLocationsCompatible(
            client.location || "",
            candidate.location || "",
            client.willingToRelocate,
            candidate.willingToRelocate
        );
        if (!locationsCompatible) return false;

        // Helper for wildcard checks
        const isWildcard = (val: string | undefined | null) => {
            if (!val) return false;
            const v = String(val).toLowerCase().trim();
            return ["any", "all", "flexible", "doesn't matter", "i don't mind", "n/a", "not applicable", "all ages", "any gap", "any range"].some(w => v.includes(w));
        };

        // Helper to normalize preference arrays (handle strings, arrays, undefined, null)
        const normalizePrefs = (prefs: string | string[] | undefined | null): string[] => {
            if (!prefs) return [];
            if (Array.isArray(prefs)) return prefs.filter(p => p != null && p !== "");
            if (typeof prefs === "string") return [prefs];
            return [];
        };

        // 3. Age Gap Limit
        const candidateAge = calculateAge(candidate.dob);
        const ageDiff = Math.abs(clientAge - candidateAge);
        const gapPrefs = normalizePrefs(client.ageGapPreference);

        if (gapPrefs.length > 0 && !gapPrefs.some(p => isWildcard(p))) {
            const hasMatch = gapPrefs.some(pref => {
                if (pref.includes("+")) {
                    const min = parseInt(pref);
                    return !isNaN(min) && ageDiff >= min;
                }
                const matches = pref.match(/(\d+)\s*-\s*(\d+)/);
                if (matches) {
                    const min = parseInt(matches[1]);
                    const max = parseInt(matches[2]);
                    return ageDiff >= min && ageDiff <= max;
                }
                return false;
            });

            if (!hasMatch) return false;
        }

        // 4. Ethnicity (all values stored in English, matching is English to English)
        const ethnicityPrefs = normalizePrefs(client.preferredEthnicities);
        if (ethnicityPrefs.length > 0 && !ethnicityPrefs.some(p => isWildcard(p))) {
            const candEthnicities = Array.isArray(candidate.ethnicity) 
                ? candidate.ethnicity.filter(e => e != null && e !== "")
                : (candidate.ethnicity ? [candidate.ethnicity] : []);
            if (candEthnicities.length === 0) return false; // Candidate has no ethnicity, can't match
            const hasMatch = candEthnicities.some(e => ethnicityPrefs.includes(e));
            if (!hasMatch) return false;
        }

        // 5. Hashkafa (all values stored in English, matching is English to English)
        const hashkafaPrefs = normalizePrefs(client.preferredHashkafos);
        if (hashkafaPrefs.length > 0 && !hashkafaPrefs.some(p => isWildcard(p))) {
            const candAffiliations = Array.isArray(candidate.religiousAffiliation)
                ? candidate.religiousAffiliation.filter(aff => aff != null && aff !== "")
                : (candidate.religiousAffiliation ? [candidate.religiousAffiliation] : []);
            if (candAffiliations.length === 0) return false; // Candidate has no hashkafa, can't match
            const hasMatch = candAffiliations.some(aff => hashkafaPrefs.includes(aff));
            if (!hasMatch) return false;
        }

        // 6. Learning Status (all values stored in English, matching is English to English)
        const learningStatusPrefs = normalizePrefs(client.preferredLearningStatus);
        if (learningStatusPrefs.length > 0 && !learningStatusPrefs.some(p => isWildcard(p))) {
            const candStatus = Array.isArray(candidate.learningStatus)
                ? candidate.learningStatus.filter(s => s != null && s !== "")
                : (candidate.learningStatus ? [candidate.learningStatus] : []);
            if (candStatus.length === 0) return false; // Candidate has no learning status, can't match
            const hasMatch = candStatus.some(s => learningStatusPrefs.includes(s));
            if (!hasMatch) return false;
        }

        // 7. Head Covering Once Married (all values stored in English, matching is English to English)
        const headCoveringPrefs = normalizePrefs(client.preferredHeadCovering);
        if (headCoveringPrefs.length > 0 && !headCoveringPrefs.some(p => isWildcard(p))) {
            // Only check head covering once married match if candidate is female
            if (candidate.gender === "Female") {
                const candidateCovering = candidate.headCovering;
                if (!candidateCovering || candidateCovering === "") {
                    // Candidate has no head covering once married specified - can't match specific preference
                    return false;
                }
                // If candidate has "Flexible", they match any preference
                if (candidateCovering === "Flexible") {
                    // Flexible matches any preference - continue
                } else if (!headCoveringPrefs.includes(candidateCovering)) {
                    // Candidate has specific covering that's not in preferences
                    return false;
                }
            }
            // For male candidates, skip head covering once married check (always matches)
        }

        return true;
    });
}

import { Client } from "./mockData";

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

        // 2. Relocation
        const clientRelocate = client.willingToRelocate?.toLowerCase();
        const candidateRelocate = candidate.willingToRelocate?.toLowerCase();
        const sameLocation = client.location.toLowerCase().trim() === candidate.location.toLowerCase().trim();

        if (!sameLocation) {
            if (clientRelocate === "no" && candidateRelocate === "no") return false;
        }

        // Helper for wildcard checks
        const isWildcard = (val: string) => {
            const v = val.toLowerCase().trim();
            return ["any", "all", "flexible", "doesn't matter", "i don't mind", "n/a", "not applicable", "all ages", "any gap", "any range"].some(w => v.includes(w));
        };

        // 3. Age Gap Limit
        const candidateAge = calculateAge(candidate.dob);
        const ageDiff = Math.abs(clientAge - candidateAge);
        const gapPrefs = Array.isArray(client.ageGapPreference)
            ? client.ageGapPreference
            : (client.ageGapPreference ? [client.ageGapPreference] : []);

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

        // 4. Ethnicity
        if (client.preferredEthnicities && client.preferredEthnicities.length > 0) {
            const prefs = Array.isArray(client.preferredEthnicities) ? client.preferredEthnicities : [client.preferredEthnicities];
            if (!prefs.some(p => isWildcard(p))) {
                const candEthnicities = Array.isArray(candidate.ethnicity) ? candidate.ethnicity : [candidate.ethnicity];
                const hasMatch = candEthnicities.some(e => prefs.includes(e));
                if (!hasMatch) return false;
            }
        }

        // 5. Hashkafa
        if (client.preferredHashkafos && client.preferredHashkafos.length > 0) {
            const prefs = Array.isArray(client.preferredHashkafos) ? client.preferredHashkafos : [client.preferredHashkafos];
            if (!prefs.some(p => isWildcard(p))) {
                const candAffiliations = Array.isArray(candidate.religiousAffiliation) ? candidate.religiousAffiliation : [candidate.religiousAffiliation];
                const hasMatch = candAffiliations.some(aff => prefs.includes(aff));
                if (!hasMatch) return false;
            }
        }

        // 6. Learning Status
        if (client.preferredLearningStatus && client.preferredLearningStatus.length > 0) {
            const prefs = Array.isArray(client.preferredLearningStatus) ? client.preferredLearningStatus : [client.preferredLearningStatus];
            if (!prefs.some(p => isWildcard(p))) {
                const candStatus = Array.isArray(candidate.learningStatus) ? candidate.learningStatus : [candidate.learningStatus];
                const hasMatch = candStatus.some(s => prefs.includes(s));
                if (!hasMatch) return false;
            }
        }

        // 7. Head Covering
        if (client.preferredHeadCovering && client.preferredHeadCovering.length > 0) {
            const prefs = Array.isArray(client.preferredHeadCovering) ? client.preferredHeadCovering : [client.preferredHeadCovering];
            if (!prefs.some(p => isWildcard(p))) {
                if (!prefs.includes(candidate.headCovering) && candidate.headCovering !== "Flexible") return false;
            }
        }

        // 8. Expected Head Covering (for male clients expecting female head covering)
        if (client.expectedHeadCovering && client.expectedHeadCovering.length > 0) {
            const expected = client.expectedHeadCovering;
            if (!isWildcard(expected)) {
                // Only apply if candidate is female (checking male's preference for wife's covering)
                if (candidate.gender === "Female" && candidate.headCovering !== expected && candidate.headCovering !== "Flexible") {
                    return false;
                }
            }
        }

        return true;
    });
}

import { findMatches, calculateAge } from '../matchingUtils';
import { Client } from '../mockData';

describe('Matching Logic Tests', () => {
  // Helper function to create a basic client
  const createClient = (overrides: Partial<Client>): Client => {
    const today = new Date();
    const defaultDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
    
    return {
      id: 'test-1',
      fullName: 'Test Client',
      email: 'test@example.com',
      phone: '123-456-7890',
      dob: defaultDob,
      location: 'Jerusalem, Israel',
      gender: 'Male',
      height: 175,
      eyeColor: 'Brown',
      hairColor: 'Black',
      ethnicity: 'Ashkenazi',
      tribalStatus: 'Yisrael',
      religiousAffiliation: ['Modern Orthodox'],
      learningStatus: 'Working - Not Learning',
      headCovering: 'N/A',
      maritalStatus: 'Single',
      children: 0,
      languages: ['English', 'Hebrew'],
      familyBackground: 'FFB',
      education: 'Bachelor\'s',
      occupation: 'Teacher',
      smoking: 'No',
      hobbies: 'Reading, Sports',
      personality: 'Kind and outgoing',
      medicalHistory: false,
      willingToRelocate: 'Maybe',
      ageGapPreference: ['1-2 years'],
      preferredEthnicities: ['Ashkenazi'],
      preferredHashkafos: ['Modern Orthodox'],
      preferredLearningStatus: ['Working - Not Learning'],
      preferredHeadCovering: ['Wig'],
      references: 'Rabbi Cohen',
      notes: 'Test client',
      createdAt: today.toISOString().split('T')[0],
      ...overrides,
    };
  };

  // Helper function to create a candidate that matches a client's preferences
  const createMatchingCandidate = (client: Client, overrides: Partial<Client>): Client => {
    const today = new Date();
    const clientDob = new Date(client.dob);
    // Create candidate with same age or within age gap preference
    const candidateDob = new Date(clientDob.getFullYear() - 1, clientDob.getMonth(), clientDob.getDate()).toISOString().split('T')[0];
    
    // Determine matching values based on client preferences
    const matchingEthnicity = Array.isArray(client.preferredEthnicities) && client.preferredEthnicities.length > 0 && !client.preferredEthnicities.some(p => p.toLowerCase().includes("don't mind") || p.toLowerCase() === "any")
      ? client.preferredEthnicities[0]
      : 'Ashkenazi';
    
    const matchingHashkafa = Array.isArray(client.preferredHashkafos) && client.preferredHashkafos.length > 0 && !client.preferredHashkafos.some(p => p.toLowerCase().includes("don't mind") || p.toLowerCase() === "any")
      ? client.preferredHashkafos[0]
      : 'Modern Orthodox';
    
    const matchingLearningStatus = Array.isArray(client.preferredLearningStatus) && client.preferredLearningStatus.length > 0 && !client.preferredLearningStatus.some(p => p.toLowerCase().includes("don't mind") || p.toLowerCase() === "any")
      ? client.preferredLearningStatus[0]
      : 'Working - Not Learning';
    
    const matchingHeadCovering = Array.isArray(client.preferredHeadCovering) && client.preferredHeadCovering.length > 0 && !client.preferredHeadCovering.some(p => p.toLowerCase().includes("don't mind") || p.toLowerCase() === "any")
      ? client.preferredHeadCovering[0]
      : 'Wig';

    return createClient({
      id: 'test-candidate',
      gender: client.gender === 'Male' ? 'Female' : 'Male',
      dob: candidateDob,
      ethnicity: matchingEthnicity,
      religiousAffiliation: [matchingHashkafa],
      learningStatus: matchingLearningStatus,
      headCovering: matchingHeadCovering,
      location: client.location,
      willingToRelocate: client.willingToRelocate,
      ...overrides,
    });
  };

  describe('Gender Matching (Non-Negotiable)', () => {
    test('should match opposite gender only', () => {
      // Create client with no strict preferences to test gender matching in isolation
      const maleClient = createClient({ 
        gender: 'Male',
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const femaleCandidate = createClient({ 
        id: 'test-2', 
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });
      const maleCandidate = createClient({ 
        id: 'test-3', 
        gender: 'Male',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'N/A'
      });

      const matches = findMatches(maleClient, [femaleCandidate, maleCandidate]);
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('test-2');
      expect(matches[0].gender).toBe('Female');
    });

    test('should not match same gender', () => {
      const femaleClient = createClient({ gender: 'Female' });
      const femaleCandidate = createClient({ 
        id: 'test-2', 
        gender: 'Female' 
      });

      const matches = findMatches(femaleClient, [femaleCandidate]);
      expect(matches).toHaveLength(0);
    });

    test('should not match with self', () => {
      const client = createClient({ id: 'test-1' });
      const sameClient = createClient({ id: 'test-1', gender: 'Female' });

      const matches = findMatches(client, [sameClient]);
      expect(matches).toHaveLength(0);
    });
  });

  describe('Location and Relocation Matching', () => {
    test('should match when both are in same location', () => {
      const client = createClient({ 
        location: 'Jerusalem, Israel',
        willingToRelocate: 'No',
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        location: 'Jerusalem, Israel',
        willingToRelocate: 'No',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should match when locations are different but one is willing to relocate', () => {
      const client = createClient({ 
        location: 'Jerusalem, Israel',
        willingToRelocate: 'Yes',
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        location: 'Tel Aviv, Israel',
        willingToRelocate: 'No',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should not match when locations differ and both unwilling to relocate', () => {
      const client = createClient({ 
        location: 'Jerusalem, Israel',
        willingToRelocate: 'No'
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        location: 'Tel Aviv, Israel',
        willingToRelocate: 'No',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0);
    });

    test('should match Hebrew and English location names', () => {
      const client = createClient({ 
        location: 'Jerusalem, Israel',
        willingToRelocate: 'No',
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        location: 'ירושלים',
        willingToRelocate: 'No',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Age Gap Preference Matching', () => {
    test('should match when age gap is within preferred range (1-2 years)', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 26, 0, 1).toISOString().split('T')[0]; // 1 year difference

      const client = createClient({ 
        dob: clientDob,
        ageGapPreference: ['1-2 years']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should match when age gap is within preferred range (3-5 years)', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 28, 0, 1).toISOString().split('T')[0]; // 3 year difference

      const client = createClient({ 
        dob: clientDob,
        ageGapPreference: ['3-5 years']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should not match when age gap exceeds preferred range', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 30, 0, 1).toISOString().split('T')[0]; // 5 year difference

      const client = createClient({ 
        dob: clientDob,
        ageGapPreference: ['1-2 years']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0);
    });

    test('should match when age gap preference is "I don\'t mind"', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 35, 0, 1).toISOString().split('T')[0]; // 10 year difference

      const client = createClient({ 
        dob: clientDob,
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should handle age gap preference with "+" notation (minimum)', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 28, 0, 1).toISOString().split('T')[0]; // 3 year difference

      const client = createClient({ 
        dob: clientDob,
        ageGapPreference: ['3+']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Ethnicity Matching', () => {
    test('should match when candidate ethnicity is in preferred list', () => {
      const client = createClient({ 
        preferredEthnicities: ['Ashkenazi', 'Sephardi'],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createMatchingCandidate(client, {
        id: 'test-2',
        ethnicity: 'Ashkenazi'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should not match when candidate ethnicity is not in preferred list', () => {
      const client = createClient({ 
        preferredEthnicities: ['Ashkenazi']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Sephardi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0);
    });

    test('should match when preference is "I don\'t mind"', () => {
      const client = createClient({ 
        preferredEthnicities: ["I don't mind"],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createMatchingCandidate(client, {
        id: 'test-2',
        ethnicity: 'Yemenite'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should handle array of preferred ethnicities', () => {
      const client = createClient({ 
        preferredEthnicities: ['Ashkenazi', 'Sephardi'],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const ashkenaziCandidate = createMatchingCandidate(client, {
        id: 'test-2',
        ethnicity: 'Ashkenazi'
      });
      const sephardiCandidate = createMatchingCandidate(client, {
        id: 'test-3',
        ethnicity: 'Sephardi'
      });
      const yemeniteCandidate = createMatchingCandidate(client, {
        id: 'test-4',
        ethnicity: 'Yemenite'
      });

      const matches = findMatches(client, [ashkenaziCandidate, sephardiCandidate, yemeniteCandidate]);
      expect(matches).toHaveLength(2);
      expect(matches.map(m => m.ethnicity)).toContain('Ashkenazi');
      expect(matches.map(m => m.ethnicity)).toContain('Sephardi');
    });
  });

  describe('Hashkafa (Religious Affiliation) Matching', () => {
    test('should match when candidate hashkafa is in preferred list', () => {
      const client = createClient({ 
        preferredHashkafos: ['Modern Orthodox', 'Dati Leumi'],
        preferredEthnicities: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should not match when candidate hashkafa is not in preferred list', () => {
      const client = createClient({ 
        preferredHashkafos: ['Modern Orthodox']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Haredi'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0);
    });

    test('should match when preference is "I don\'t mind"', () => {
      const client = createClient({ 
        preferredHashkafos: ["I don't mind"],
        preferredEthnicities: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Chabad'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should handle multiple religious affiliations in candidate', () => {
      const client = createClient({ 
        preferredHashkafos: ['Modern Orthodox'],
        preferredEthnicities: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox', 'Dati Leumi'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Learning Status Matching', () => {
    test('should match when candidate learning status is in preferred list', () => {
      const client = createClient({ 
        preferredLearningStatus: ['Working - Not Learning', 'Full Time'],
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should not match when candidate learning status is not in preferred list', () => {
      const client = createClient({ 
        preferredLearningStatus: ['Full Time']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0);
    });

    test('should match when preference is "I don\'t mind"', () => {
      const client = createClient({ 
        preferredLearningStatus: ["I don't mind"],
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Half Time',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Head Covering Once Married Matching', () => {
    test('should match when female candidate head covering once married is in preferred list', () => {
      const client = createClient({ 
        preferredHeadCovering: ['Wig', 'Hat'],
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should match when female candidate has "Flexible" head covering once married', () => {
      const client = createClient({ 
        preferredHeadCovering: ['Wig'],
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Flexible'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should not match when female candidate head covering once married is not in preferred list', () => {
      const client = createClient({ 
        preferredHeadCovering: ['Wig']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Hat'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0);
    });

    test('should match when preference is "I don\'t mind"', () => {
      const client = createClient({ 
        preferredHeadCovering: ["I don't mind"],
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Scarf'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should not check head covering once married for male candidates', () => {
      const client = createClient({ 
        gender: 'Female',
        preferredHeadCovering: ['Wig'],
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Male',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'N/A'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1); // Should match because head covering once married check is skipped for males
    });
  });

  describe('Age and Date of Birth Handling', () => {
    test('should calculate age correctly from DOB', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      const age = calculateAge(dob.toISOString().split('T')[0]);
      expect(age).toBe(25);
    });

    test('should handle age calculation with different months', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 25, today.getMonth() + 1, today.getDate());
      const age = calculateAge(dob.toISOString().split('T')[0]);
      expect(age).toBe(24); // Not yet birthday this year
    });

    test('should use DOB for age gap calculation', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 30, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 28, 0, 1).toISOString().split('T')[0];

      const client = createClient({ 
        dob: clientDob,
        ageGapPreference: ['1-2 years']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Combined Criteria Tests', () => {
    test('should match when all criteria are satisfied', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 26, 0, 1).toISOString().split('T')[0];

      const client = createClient({ 
        dob: clientDob,
        location: 'Jerusalem, Israel',
        willingToRelocate: 'No',
        ageGapPreference: ['1-2 years'],
        preferredEthnicities: ['Ashkenazi'],
        preferredHashkafos: ['Modern Orthodox'],
        preferredLearningStatus: ['Working - Not Learning'],
        preferredHeadCovering: ['Wig']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        location: 'Jerusalem, Israel',
        willingToRelocate: 'No',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should not match when any non-negotiable criterion fails', () => {
      const client = createClient({ 
        preferredEthnicities: ['Ashkenazi']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Sephardi', // Wrong ethnicity
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0);
    });
  });

  describe('Edge Cases and Wildcards', () => {
    test('should handle empty preference arrays', () => {
      const client = createClient({ 
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1); // Should match when preferences are empty
    });

    test('should handle various wildcard phrases', () => {
      const wildcards = ["I don't mind", "Any", "All", "Flexible", "Doesn't matter", "N/A", "Not applicable"];
      
      wildcards.forEach(wildcard => {
        const client = createClient({ 
          preferredEthnicities: [wildcard],
          preferredHashkafos: [],
          preferredLearningStatus: [],
          preferredHeadCovering: [],
          ageGapPreference: ["I don't mind"]
        });
        const candidate = createClient({ 
          id: 'test-2',
          gender: 'Female',
          ethnicity: 'Yemenite',
          religiousAffiliation: ['Modern Orthodox'],
          learningStatus: 'Working - Not Learning',
          headCovering: 'Wig'
        });

        const matches = findMatches(client, [candidate]);
        expect(matches).toHaveLength(1);
      });
    });

    test('should handle single string preference (not array)', () => {
      const client = createClient({ 
        preferredEthnicities: 'Ashkenazi' as any, // Simulating single string
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should handle undefined/null preferences gracefully', () => {
      const client = createClient({ 
        preferredEthnicities: undefined as any,
        preferredHashkafos: undefined as any,
        preferredLearningStatus: undefined as any,
        preferredHeadCovering: undefined as any,
        ageGapPreference: undefined as any
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1); // Should match when preferences are undefined
    });
  });

  describe('Hebrew to English Matching Verification', () => {
    // Note: Based on the data extraction prompt, selection fields should always be stored in English.
    // However, we test that the matching logic works correctly with English values.
    // If Hebrew values somehow get into the system, they won't match - this is expected behavior
    // since the matching uses exact string comparison for selection fields.

    test('should match using English values for ethnicity (as per data extraction rules)', () => {
      const client = createClient({ 
        preferredEthnicities: ['Ashkenazi'], // English value
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi', // English value (as per extraction rules)
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should match using English values for hashkafa', () => {
      const client = createClient({ 
        preferredHashkafos: ['Modern Orthodox'], // English value
        preferredEthnicities: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'], // English value
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should match using English values for learning status', () => {
      const client = createClient({ 
        preferredLearningStatus: ['Working - Not Learning'], // English value
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning', // English value
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should match using English values for head covering once married', () => {
      const client = createClient({ 
        preferredHeadCovering: ['Wig'], // English value
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig' // English value
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });

    test('should verify location matching handles Hebrew to English translation', () => {
      const client = createClient({ 
        location: 'Jerusalem, Israel', // English
        willingToRelocate: 'No',
        preferredEthnicities: [],
        preferredHashkafos: [],
        preferredLearningStatus: [],
        preferredHeadCovering: [],
        ageGapPreference: ["I don't mind"]
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        location: 'ירושלים', // Hebrew - should match via locationMapping
        willingToRelocate: 'No',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Age and Date of Birth as Separate Fields', () => {
    // Note: The current implementation uses DOB to calculate age.
    // If age becomes a separate field in the future, the matching logic may need updates.
    // For now, we verify that DOB-based age calculation works correctly.

    test('should calculate age from DOB correctly for matching', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 30, 5, 15).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 28, 5, 15).toISOString().split('T')[0];

      const clientAge = calculateAge(clientDob);
      const candidateAge = calculateAge(candidateDob);
      const ageDiff = Math.abs(clientAge - candidateAge);

      // Age calculation depends on current date, so we check it's approximately correct
      expect(clientAge).toBeGreaterThanOrEqual(29);
      expect(clientAge).toBeLessThanOrEqual(31);
      expect(candidateAge).toBeGreaterThanOrEqual(27);
      expect(candidateAge).toBeLessThanOrEqual(29);
      expect(ageDiff).toBe(2);
    });

    test('should handle age gap calculation with different birth months', () => {
      const today = new Date();
      // Client born in January, candidate born in December of same year
      const clientDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 25, 11, 31).toISOString().split('T')[0];

      const clientAge = calculateAge(clientDob);
      const candidateAge = calculateAge(candidateDob);
      const ageDiff = Math.abs(clientAge - candidateAge);

      // Both should be 25, but if today is before candidate's birthday, candidate might be 24
      expect(ageDiff).toBeLessThanOrEqual(1);
    });

    test('should match when age gap is calculated correctly from DOB', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 27, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 29, 0, 1).toISOString().split('T')[0]; // 2 year gap

      const client = createClient({ 
        dob: clientDob,
        ageGapPreference: ['1-2 years']
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Non-Negotiable Criteria Enforcement', () => {
    test('should enforce gender as non-negotiable (always opposite)', () => {
      const client = createClient({ gender: 'Male' });
      const sameGenderCandidate = createClient({ 
        id: 'test-2',
        gender: 'Male', // Same gender - should not match
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [sameGenderCandidate]);
      expect(matches).toHaveLength(0);
    });

    test('should enforce age gap as non-negotiable when specified', () => {
      const today = new Date();
      const clientDob = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const candidateDob = new Date(today.getFullYear() - 35, 0, 1).toISOString().split('T')[0]; // 10 year gap

      const client = createClient({ 
        dob: clientDob,
        ageGapPreference: ['1-2 years'] // Strict preference
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        dob: candidateDob,
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0); // Should not match due to age gap
    });

    test('should enforce ethnicity as non-negotiable when specified', () => {
      const client = createClient({ 
        preferredEthnicities: ['Ashkenazi'] // Strict preference
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Sephardi', // Different ethnicity
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0); // Should not match
    });

    test('should enforce hashkafa as non-negotiable when specified', () => {
      const client = createClient({ 
        preferredHashkafos: ['Modern Orthodox'] // Strict preference
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Haredi'], // Different hashkafa
        learningStatus: 'Working - Not Learning',
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0); // Should not match
    });

    test('should enforce learning status as non-negotiable when specified', () => {
      const client = createClient({ 
        preferredLearningStatus: ['Working - Not Learning'] // Strict preference
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Full Time', // Different learning status
        headCovering: 'Wig'
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0); // Should not match
    });

    test('should enforce head covering as non-negotiable when specified', () => {
      const client = createClient({ 
        preferredHeadCovering: ['Wig'] // Strict preference
      });
      const candidate = createClient({ 
        id: 'test-2',
        gender: 'Female',
        ethnicity: 'Ashkenazi',
        religiousAffiliation: ['Modern Orthodox'],
        learningStatus: 'Working - Not Learning',
        headCovering: 'Hat' // Different head covering once married
      });

      const matches = findMatches(client, [candidate]);
      expect(matches).toHaveLength(0); // Should not match
    });
  });
});

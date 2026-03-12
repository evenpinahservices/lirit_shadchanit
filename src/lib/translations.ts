// Form translations for Hebrew and English

export type FormLanguage = "en" | "he";

export const translations = {
  en: {
    // Step titles
    steps: {
      basicInfo: "Basic Info",
      appearance: "Appearance",
      background: "Background",
      religiousDetails: "Religious Details",
      personal: "Personal",
      preferences: "Preferences",
      admin: "Admin",
    },

    // Form labels
    labels: {
      fullName: "Full Name (Hebrew/English)",
      email: "Email",
      phone: "Phone",
      dob: "Date of Birth",
      gender: "Gender",
      location: "Location",
      height: "Height (cm)",
      eyeColor: "Eye Color",
      hairColor: "Hair Color",
      profilePhoto: "Profile Photo",
      galleryImages: "Gallery Images",
      ethnicity: "Ethnicity",
      tribalStatus: "Tribal Status",
      maritalStatus: "Marital Status",
      languages: "Languages",
      familyBackground: "Family Background",
      education: "Education",
      occupationTitle: "Occupation - Title",
      occupationDescription: "Occupation - Description",
      religiousAffiliation: "Religious Affiliation",
      learningStatus: "If applicable, what is your learning status?",
      headCovering: "If applicable, how will you cover your hair once married?",
      religiousDetailsFreeText: "Additional Religious Details",
      smoking: "Do you smoke?",
      hobbies: "Hobbies",
      personality: "Personality Description",
      medicalHistory: "Medical History?",
      medicalHistoryDetails: "Please explain:",
      ageGapPreference: "Age Gap Preference",
      willingToRelocate: "Willing to Relocate",
      preferredEthnicities: "Preferred Ethnicities",
      preferredHashkafos: "Preferred Hashkafos",
      preferredLearningStatus: "What learning status are you looking for in a husband?",
      preferredHeadCovering: "What head covering would you like your wife to have?",
      preferencesFreeText: "What You Are Looking For",
      references: "References (Name & Phone)",
      notes: "Internal Notes",
      resumeRawText: "Resume Raw Text",
    },

    // Placeholders
    placeholders: {
      fullName: "e.g. David Cohen",
      email: "david@example.com",
      phone: "050-123-4567",
      location: "City, Neighborhood",
      occupationTitle: "e.g. Teacher, Developer",
      occupationDescription: "e.g. Works as a software developer with 5 years of experience...",
      education: "e.g. BA in Psychology, MA in Education",
      familyBackground: "Describe family background, upbringing, values...",
      personality: "Describe the personality...",
      hobbies: "Enter hobbies (e.g., Reading, Sports, Music)...",
      selectLanguages: "Select languages...",
      selectAffiliations: "Select affiliations...",
      selectAgeGap: "Select age gap preference...",
      selectEthnicities: "Select preferred ethnicities...",
      selectHashkafos: "Select preferred hashkafos...",
      selectLearningStatus: "Select learning status in a spouse...",
      selectHeadCovering: "Select how you want your wife to cover her hair...",
      religiousDetailsFreeText: "Describe any additional religious details, practices, or background...",
      preferencesFreeText: "Describe what you are looking for in a match...",
      resumeRawText: "Raw text extracted from resume images will appear here...",
    },

    // Buttons
    buttons: {
      next: "Next",
      back: "Back",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving...",
      submit: "Submit Client",
      update: "Update Client",
      uploadPhoto: "Upload New Photo",
      add: "Add",
      delete: "Delete",
      devFill: "Dev Fill",
      autoFill: "Auto-Fill",
    },

    // Date modes
    dateMode: {
      gregorian: "Gregorian",
      yearOnly: "Year Only",
      hebrew: "Hebrew",
    },

    // Messages
    messages: {
      step: "Step",
      of: "of",
      noImage: "No Img",
      uploadLimit: "JPG, PNG up to 10MB",
      selectOption: "Select...",
    },

    // Confirmation modal
    confirmation: {
      deleteImageTitle: "Delete Image",
      deleteProfileMessage: "Are you sure you want to delete the profile photo? This action cannot be undone.",
      deleteGalleryMessage: "Are you sure you want to delete this image? This action cannot be undone.",
    },

    // Profile view labels
    profileView: {
      appearance: "Appearance",
      backgroundHeritage: "Background & Heritage",
      religiousPersonal: "Religious & Personal",
      educationWork: "Education & Work",
      medical: "Medical",
      theSearch: "The Search",
      adminNotes: "Admin Notes",
      height: "Height",
      eyeColor: "Eye Color",
      hairColor: "Hair Color",
      vision: "Vision",
      ethnicity: "Ethnicity",
      tribalStatus: "Tribal Status",
      languages: "Languages",
      family: "Family",
      affiliation: "Affiliation",
      learningStatus: "If applicable, what is your learning status?",
      headCovering: "If applicable, how will you cover your hair once married?",
      smoking: "Do you smoke?",
      hobbies: "Hobbies",
      education: "Education",
      occupation: "Occupation",
      medicalHistory: "Medical History",
      details: "Details",
      ageGapPreference: "Age Gap Preference",
      willingToRelocate: "Willing to Relocate",
      preferredEthnicities: "Preferred Ethnicities",
      preferredHashkafos: "Preferred Hashkafos",
      preferencesFreeText: "What You Are Looking For",
      references: "References",
      internalNotes: "Internal Notes",
    },

    // Options (these are the VALUES stored in the database - always English)
    options: {
      gender: [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
      ],
      religiousAffiliation: [
        { value: "Haredi", label: "Haredi" },
        { value: "Hardal", label: "Hardal" },
        { value: "Dati Leumi", label: "Dati Leumi" },
        { value: "Modern Orthodox", label: "Modern Orthodox" },
        { value: "Yeshivish American", label: "Yeshivish American" },
        { value: "Yeshivish Litvish", label: "Yeshivish Litvish" },
        { value: "Yeshivish Hasidish", label: "Yeshivish Hasidish" },
        { value: "Chabad", label: "Chabad" },
        { value: "Masorti", label: "Masorti" },
        { value: "Traditional", label: "Traditional" },
        { value: "Secular", label: "Secular" },
      ],
      ethnicity: [
        { value: "Ashkenazi", label: "Ashkenazi" },
        { value: "Sephardi", label: "Sephardi" },
        { value: "Yemenite", label: "Yemenite" },
        { value: "Ethiopian", label: "Ethiopian" },
        { value: "Convert", label: "Convert" },
        { value: "Other", label: "Other" },
      ],
      tribalStatus: [
        { value: "Cohen", label: "Cohen" },
        { value: "Levi", label: "Levi" },
        { value: "Yisrael", label: "Yisrael" },
        { value: "Bat Cohen", label: "Bat Cohen" },
        { value: "Bat Levi", label: "Bat Levi" },
        { value: "Bat Yisrael", label: "Bat Yisrael" },
        { value: "Convert", label: "Convert" },
      ],
      maritalStatus: [
        { value: "Single", label: "Single" },
        { value: "Divorced", label: "Divorced" },
        { value: "Divorced with Kids", label: "Divorced with Kids" },
        { value: "Widowed", label: "Widowed" },
        { value: "Widowed with Kids", label: "Widowed with Kids" },
      ],
      learningStatus: [
        { value: "Full Time", label: "Full Time" },
        { value: "Half Time", label: "Half Time" },
        { value: "Koveah Itim", label: "Koveah Itim" },
        { value: "Working - Not Learning", label: "Working - Not Learning" },
        { value: "N/A", label: "N/A" },
      ],
      headCovering: [
        { value: "N/A", label: "N/A" },
        { value: "None", label: "None" },
        { value: "Wig", label: "Wig" },
        { value: "Tichel", label: "Tichel" },
        { value: "Hat", label: "Hat" },
        { value: "Scarf", label: "Scarf" },
        { value: "Flexible", label: "Flexible" },
      ],
      smoking: [
        { value: "No", label: "No" },
        { value: "Yes", label: "Yes" },
        { value: "Occasionally", label: "Occasionally" },
        { value: "Vape", label: "Vape" },
      ],
      languages: [
        { value: "English", label: "English" },
        { value: "Hebrew", label: "Hebrew" },
        { value: "French", label: "French" },
        { value: "Spanish", label: "Spanish" },
        { value: "Yiddish", label: "Yiddish" },
        { value: "Russian", label: "Russian" },
        { value: "Portuguese", label: "Portuguese" },
        { value: "German", label: "German" },
      ],
      eyeColor: [
        { value: "Brown", label: "Brown" },
        { value: "Blue", label: "Blue" },
        { value: "Green", label: "Green" },
        { value: "Hazel", label: "Hazel" },
        { value: "Grey", label: "Grey" },
        { value: "Other", label: "Other" },
      ],
      hairColor: [
        { value: "Black", label: "Black" },
        { value: "Brown", label: "Brown" },
        { value: "Blonde", label: "Blonde" },
        { value: "Red", label: "Red" },
        { value: "Grey", label: "Grey" },
        { value: "Bald", label: "Bald" },
        { value: "White", label: "White" },
        { value: "Other", label: "Other" },
      ],
      hobbies: [
        { value: "Reading", label: "Reading" },
        { value: "Hiking", label: "Hiking" },
        { value: "Music", label: "Music" },
        { value: "Cooking", label: "Cooking" },
        { value: "Traveling", label: "Traveling" },
        { value: "Learning Torah", label: "Learning Torah" },
        { value: "Sports", label: "Sports" },
        { value: "Art", label: "Art" },
        { value: "Writing", label: "Writing" },
        { value: "Volunteering", label: "Volunteering" },
        { value: "Photography", label: "Photography" },
        { value: "Gardening", label: "Gardening" },
        { value: "Chess", label: "Chess" },
        { value: "History", label: "History" },
        { value: "Swimming", label: "Swimming" },
        { value: "Running", label: "Running" },
      ],
      ageGapPreference: [
        { value: "I don't mind", label: "I don't mind" },
        { value: "1-2 years", label: "1-2 years" },
        { value: "3-5 years", label: "3-5 years" },
        { value: "5-10 years", label: "5-10 years" },
        { value: "Any", label: "Any" },
      ],
      willingToRelocate: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
        { value: "Maybe", label: "Maybe" },
      ],
      medicalHistory: [
        { value: "No", label: "No" },
        { value: "Yes", label: "Yes" },
      ],
    },
  },

  he: {
    // Step titles
    steps: {
      basicInfo: "פרטים בסיסיים",
      appearance: "מראה חיצוני",
      background: "רקע",
      religiousDetails: "פרטים דתיים",
      personal: "אישי",
      preferences: "העדפות",
      admin: "ניהול",
    },

    // Form labels
    labels: {
      fullName: "שם מלא (עברית/אנגלית)",
      email: "אימייל",
      phone: "טלפון",
      dob: "תאריך לידה",
      gender: "מגדר",
      location: "מיקום",
      height: "גובה (ס״מ)",
      eyeColor: "צבע עיניים",
      hairColor: "צבע שיער",
      profilePhoto: "תמונת פרופיל",
      galleryImages: "תמונות גלריה",
      ethnicity: "מוצא עדתי",
      tribalStatus: "שבט",
      maritalStatus: "מצב משפחתי",
      languages: "שפות",
      familyBackground: "רקע משפחתי",
      education: "השכלה",
      occupationTitle: "עיסוק - כותרת",
      occupationDescription: "עיסוק - תיאור",
      religiousAffiliation: "זרם דתי",
      learningStatus: "אם רלוונטי, מה סטטוס הלימוד שלך?",
      headCovering: "אם רלוונטי, איך תכסי את השיער לאחר הנישואין?",
      religiousDetailsFreeText: "פרטים דתיים נוספים",
      smoking: "האם אתה מעשן?",
      hobbies: "תחביבים",
      personality: "תיאור אישיות",
      medicalHistory: "היסטוריה רפואית?",
      medicalHistoryDetails: "נא לפרט:",
      ageGapPreference: "העדפת פער גילאים",
      willingToRelocate: "מוכן לגור בחו\"ל",
      preferredEthnicities: "מוצא עדתי מועדף",
      preferredHashkafos: "השקפה מועדפת",
      preferredLearningStatus: "איזה סטטוס לימוד את מחפשת בבעל?",
      preferredHeadCovering: "איזה כיסוי ראש היית רוצה שיהיה לאשתך?",
      preferencesFreeText: "מה אתה מחפש",
      references: "המלצות (שם וטלפון)",
      notes: "הערות פנימיות",
      resumeRawText: "טקסט גולמי מקורות חיים",
    },

    // Placeholders
    placeholders: {
      fullName: "לדוגמה: דוד כהן",
      email: "david@example.com",
      phone: "050-123-4567",
      location: "עיר, שכונה",
      occupationTitle: "לדוגמה: מורה, מפתח",
      occupationDescription: "לדוגמה: עובד כמפתח תוכנה עם 5 שנות ניסיון...",
      education: "לדוגמה: תואר ראשון בפסיכולוגיה, תואר שני בחינוך",
      familyBackground: "תאר/י רקע משפחתי, חינוך, ערכים...",
      personality: "תאר/י את האישיות...",
      hobbies: "הזן תחביבים (לדוגמה: קריאה, ספורט, מוזיקה)...",
      selectLanguages: "בחר שפות...",
      selectAffiliations: "בחר זרמים...",
      selectAgeGap: "בחר העדפת פער גילאים...",
      selectEthnicities: "בחר מוצא מועדף...",
      selectHashkafos: "בחר השקפה מועדפת...",
      selectLearningStatus: "בחר סטטוס לימוד תורה מועדף בבעל...",
      selectHeadCovering: "בחר איך אתה רוצה שאשתך תכסה את שערה...",
      religiousDetailsFreeText: "תאר/י פרטים דתיים נוספים, מנהגים או רקע...",
      preferencesFreeText: "תאר/י מה אתה מחפש/ת בזיווג...",
      resumeRawText: "טקסט גולמי שחולץ מתמונות קורות חיים יופיע כאן...",
    },

    // Buttons
    buttons: {
      next: "הבא",
      back: "חזרה",
      cancel: "ביטול",
      save: "שמור",
      saving: "שומר...",
      submit: "שמור לקוח",
      update: "עדכן לקוח",
      uploadPhoto: "העלה תמונה חדשה",
      add: "הוסף",
      delete: "מחק",
      devFill: "מילוי אוטומטי",
      autoFill: "מילוי חכם",
    },

    // Date modes
    dateMode: {
      gregorian: "לועזי",
      yearOnly: "שנה בלבד",
      hebrew: "עברי",
    },

    // Messages
    messages: {
      step: "שלב",
      of: "מתוך",
      noImage: "אין תמונה",
      uploadLimit: "JPG, PNG עד 10MB",
      selectOption: "בחר...",
    },

    // Confirmation modal
    confirmation: {
      deleteImageTitle: "מחיקת תמונה",
      deleteProfileMessage: "האם אתה בטוח שברצונך למחוק את תמונת הפרופיל? פעולה זו אינה ניתנת לביטול.",
      deleteGalleryMessage: "האם אתה בטוח שברצונך למחוק תמונה זו? פעולה זו אינה ניתנת לביטול.",
    },

    // Profile view labels
    profileView: {
      appearance: "מראה חיצוני",
      backgroundHeritage: "רקע ומורשת",
      religiousPersonal: "דתי ואישי",
      educationWork: "השכלה ועבודה",
      medical: "רפואי",
      theSearch: "החיפוש",
      adminNotes: "הערות ניהול",
      height: "גובה",
      eyeColor: "צבע עיניים",
      hairColor: "צבע שיער",
      vision: "ראייה",
      ethnicity: "מוצא עדתי",
      tribalStatus: "שבט",
      languages: "שפות",
      family: "משפחה",
      affiliation: "זרם",
      learningStatus: "אם רלוונטי, מה סטטוס הלימוד שלך?",
      headCovering: "אם רלוונטי, איך תכסי את השיער לאחר הנישואין?",
      smoking: "האם אתה מעשן?",
      hobbies: "תחביבים",
      education: "השכלה",
      occupation: "עיסוק",
      medicalHistory: "היסטוריה רפואית",
      details: "פרטים",
      ageGapPreference: "העדפת פער גילאים",
      willingToRelocate: "מוכן לגור בחו\"ל",
      preferredEthnicities: "מוצא עדתי מועדף",
      preferredHashkafos: "השקפה מועדפת",
      preferencesFreeText: "מה אתה מחפש",
      references: "המלצות",
      internalNotes: "הערות פנימיות",
    },

    // Options (value is always English for database, label is Hebrew for display)
    options: {
      gender: [
        { value: "Male", label: "זכר" },
        { value: "Female", label: "נקבה" },
      ],
      religiousAffiliation: [
        { value: "Haredi", label: "חרדי" },
        { value: "Hardal", label: "חרד״ל" },
        { value: "Dati Leumi", label: "דתי לאומי" },
        { value: "Modern Orthodox", label: "חרדי מודרני" },
        { value: "Yeshivish American", label: "ישיבתי אמריקאי" },
        { value: "Yeshivish Litvish", label: "ישיבתי ליטאי" },
        { value: "Yeshivish Hasidish", label: "ישיבתי חסידי" },
        { value: "Chabad", label: "חב״ד" },
        { value: "Masorti", label: "מסורתי (קונסרבטיבי)" },
        { value: "Traditional", label: "מסורתי" },
        { value: "Secular", label: "חילוני" },
      ],
      ethnicity: [
        { value: "Ashkenazi", label: "אשכנזי" },
        { value: "Sephardi", label: "ספרדי" },
        { value: "Yemenite", label: "תימני" },
        { value: "Ethiopian", label: "אתיופי" },
        { value: "Convert", label: "גר/גיורת" },
        { value: "Other", label: "אחר" },
      ],
      tribalStatus: [
        { value: "Cohen", label: "כהן" },
        { value: "Levi", label: "לוי" },
        { value: "Yisrael", label: "ישראל" },
        { value: "Bat Cohen", label: "בת כהן" },
        { value: "Bat Levi", label: "בת לוי" },
        { value: "Bat Yisrael", label: "בת ישראל" },
        { value: "Convert", label: "גר/גיורת" },
      ],
      maritalStatus: [
        { value: "Single", label: "רווק/ה" },
        { value: "Divorced", label: "גרוש/ה" },
        { value: "Divorced with Kids", label: "גרוש/ה עם ילדים" },
        { value: "Widowed", label: "אלמן/ה" },
        { value: "Widowed with Kids", label: "אלמן/ה עם ילדים" },
      ],
      learningStatus: [
        { value: "Full Time", label: "לומד במשרה מלאה" },
        { value: "Half Time", label: "לומד במשרה חלקית" },
        { value: "Koveah Itim", label: "קובע עיתים" },
        { value: "Working - Not Learning", label: "עובד - לא לומד" },
        { value: "N/A", label: "לא רלוונטי" },
      ],
      headCovering: [
        { value: "N/A", label: "לא רלוונטי" },
        { value: "None", label: "ללא" },
        { value: "Wig", label: "פאה" },
        { value: "Tichel", label: "מטפחת" },
        { value: "Hat", label: "כובע" },
        { value: "Scarf", label: "צעיף" },
        { value: "Flexible", label: "גמיש" },
      ],
      smoking: [
        { value: "No", label: "לא" },
        { value: "Yes", label: "כן" },
        { value: "Occasionally", label: "לפעמים" },
        { value: "Vape", label: "סיגריה אלקטרונית" },
      ],
      languages: [
        { value: "English", label: "אנגלית" },
        { value: "Hebrew", label: "עברית" },
        { value: "French", label: "צרפתית" },
        { value: "Spanish", label: "ספרדית" },
        { value: "Yiddish", label: "אידיש" },
        { value: "Russian", label: "רוסית" },
        { value: "Portuguese", label: "פורטוגזית" },
        { value: "German", label: "גרמנית" },
      ],
      eyeColor: [
        { value: "Brown", label: "חום" },
        { value: "Blue", label: "כחול" },
        { value: "Green", label: "ירוק" },
        { value: "Hazel", label: "אגוז" },
        { value: "Grey", label: "אפור" },
        { value: "Other", label: "אחר" },
      ],
      hairColor: [
        { value: "Black", label: "שחור" },
        { value: "Brown", label: "חום" },
        { value: "Blonde", label: "בלונד" },
        { value: "Red", label: "ג׳ינג׳י" },
        { value: "Grey", label: "אפור" },
        { value: "Bald", label: "קירח" },
        { value: "White", label: "לבן" },
        { value: "Other", label: "אחר" },
      ],
      hobbies: [
        { value: "Reading", label: "קריאה" },
        { value: "Hiking", label: "טיולים" },
        { value: "Music", label: "מוזיקה" },
        { value: "Cooking", label: "בישול" },
        { value: "Traveling", label: "נסיעות" },
        { value: "Learning Torah", label: "לימוד תורה" },
        { value: "Sports", label: "ספורט" },
        { value: "Art", label: "אומנות" },
        { value: "Writing", label: "כתיבה" },
        { value: "Volunteering", label: "התנדבות" },
        { value: "Photography", label: "צילום" },
        { value: "Gardening", label: "גינון" },
        { value: "Chess", label: "שחמט" },
        { value: "History", label: "היסטוריה" },
        { value: "Swimming", label: "שחייה" },
        { value: "Running", label: "ריצה" },
      ],
      ageGapPreference: [
        { value: "I don't mind", label: "לא משנה לי" },
        { value: "1-2 years", label: "1-2 שנים" },
        { value: "3-5 years", label: "3-5 שנים" },
        { value: "5-10 years", label: "5-10 שנים" },
        { value: "Any", label: "כל פער" },
      ],
      willingToRelocate: [
        { value: "Yes", label: "כן" },
        { value: "No", label: "לא" },
        { value: "Maybe", label: "אולי" },
      ],
      medicalHistory: [
        { value: "No", label: "לא" },
        { value: "Yes", label: "כן" },
      ],
    },
  },
};

// Helper function to get translation
export function t(lang: FormLanguage, path: string): string {
  const keys = path.split(".");
  let result: any = translations[lang];
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = result[key];
    } else {
      // Fallback to English if key not found
      result = translations.en;
      for (const k of keys) {
        if (result && typeof result === "object" && k in result) {
          result = result[k];
        } else {
          return path; // Return path if not found
        }
      }
      break;
    }
  }
  return typeof result === "string" ? result : path;
}

// Helper function to get options array
export function getOptions(lang: FormLanguage, optionKey: keyof typeof translations.en.options): { value: string; label: string }[] {
  return translations[lang].options[optionKey] || translations.en.options[optionKey] || [];
}

// Get option labels only (for MultiSelect that needs string arrays)
export function getOptionLabels(lang: FormLanguage, optionKey: keyof typeof translations.en.options): string[] {
  return getOptions(lang, optionKey).map(opt => opt.label);
}

// Get option values only
export function getOptionValues(optionKey: keyof typeof translations.en.options): string[] {
  return translations.en.options[optionKey].map(opt => opt.value);
}

// Map label to value (for when user selects Hebrew label, we need English value)
export function labelToValue(lang: FormLanguage, optionKey: keyof typeof translations.en.options, label: string): string {
  const options = getOptions(lang, optionKey);
  const found = options.find(opt => opt.label === label);
  return found ? found.value : label;
}

// Map value to label (for displaying English values in Hebrew)
export function valueToLabel(lang: FormLanguage, optionKey: keyof typeof translations.en.options, value: string): string {
  const options = getOptions(lang, optionKey);
  const found = options.find(opt => opt.value === value);
  return found ? found.label : value;
}

// Check if language is RTL
export function isRTL(lang: FormLanguage): boolean {
  return lang === "he";
}


import { Client } from "@/lib/mockData";

/**
 * Intelligently parses extracted text and populates client form fields
 */
export function parseTextToClientData(text: string): Partial<Client> {
    const data: Partial<Client> = {};
    const lowerText = text.toLowerCase();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Extract name (usually first line or contains common name patterns)
    const nameMatch = text.match(/(?:name|שם)[\s:]*([A-Za-z\u0590-\u05FF\s]+)/i) || 
                      lines[0]?.match(/^([A-Za-z\u0590-\u05FF\s]{2,})$/);
    if (nameMatch) {
        data.fullName = nameMatch[1].trim();
    }

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
        data.email = emailMatch[1];
    }

    // Extract phone (various formats)
    const phoneMatch = text.match(/(?:phone|טלפון|tel)[\s:]*([0-9\-\(\)\s\+]{7,})/i) ||
                       text.match(/(05[0-9]-?[0-9]{7})|(\+972[0-9\-]{9,})|([0-9]{3}-[0-9]{3}-[0-9]{4})/);
    if (phoneMatch) {
        data.phone = phoneMatch[1] || phoneMatch[2] || phoneMatch[3];
    }

    // Extract location
    const locationMatch = text.match(/(?:location|מיקום|city|עיר)[\s:]*([A-Za-z\u0590-\u05FF\s,]+)/i) ||
                         text.match(/(Jerusalem|Tel Aviv|Haifa|Beit Shemesh|Petach Tikva|Raanana|Modiin|ירושלים|תל אביב|חיפה)/i);
    if (locationMatch) {
        data.location = locationMatch[1].trim();
    }

    // Extract age or birth year
    const ageMatch = text.match(/(?:age|גיל)[\s:]*(\d{2})/i);
    const yearMatch = text.match(/(?:born|birth|year|שנת לידה)[\s:]*(\d{4})/i);
    if (ageMatch) {
        const age = parseInt(ageMatch[1]);
        const birthYear = new Date().getFullYear() - age;
        data.dob = `${birthYear}-01-01`;
    } else if (yearMatch) {
        data.dob = `${yearMatch[1]}-01-01`;
    }

    // Extract height
    const heightMatch = text.match(/(?:height|גובה)[\s:]*(\d{3})\s*(?:cm|ס"מ)?/i);
    if (heightMatch) {
        data.height = parseInt(heightMatch[1]);
    }

    // Extract occupation
    const occupationKeywords = ['teacher', 'doctor', 'lawyer', 'engineer', 'student', 'nurse', 'accountant', 'developer', 'programmer'];
    for (const keyword of occupationKeywords) {
        if (lowerText.includes(keyword)) {
            data.occupationTitle = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            break;
        }
    }

    // Extract education
    const educationKeywords = ['bachelor', 'master', 'phd', 'degree', 'seminary', 'yeshiva', 'university', 'college'];
    for (const keyword of educationKeywords) {
        if (lowerText.includes(keyword)) {
            data.education = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            break;
        }
    }

    // Extract languages
    const languages: string[] = [];
    const languageKeywords = ['english', 'hebrew', 'french', 'spanish', 'yiddish', 'russian'];
    for (const lang of languageKeywords) {
        if (lowerText.includes(lang)) {
            languages.push(lang.charAt(0).toUpperCase() + lang.slice(1));
        }
    }
    if (languages.length > 0) {
        data.languages = languages;
    }

    // Extract ethnicity
    const ethnicityKeywords = ['ashkenazi', 'sephardi', 'yemenite', 'ethiopian'];
    for (const eth of ethnicityKeywords) {
        if (lowerText.includes(eth)) {
            data.ethnicity = eth.charAt(0).toUpperCase() + eth.slice(1);
            break;
        }
    }

    // Extract religious affiliation
    const hashkafaKeywords = ['haredi', 'hardal', 'dati leumi', 'modern orthodox', 'yeshivish', 'chabad', 'masorti', 'traditional'];
    const affiliations: string[] = [];
    for (const hashkafa of hashkafaKeywords) {
        if (lowerText.includes(hashkafa)) {
            affiliations.push(hashkafa.charAt(0).toUpperCase() + hashkafa.slice(1));
        }
    }
    if (affiliations.length > 0) {
        data.religiousAffiliation = affiliations;
    }

    // Extract personality/hobbies from description
    const personalityMatch = text.match(/(?:personality|about|description)[\s:]*([^\n]{20,200})/i);
    if (personalityMatch) {
        data.personality = personalityMatch[1].trim();
    }

    return data;
}



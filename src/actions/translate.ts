"use server";

/**
 * Translates text from Hebrew to English
 * Supports multiple translation services
 */
export async function translateHebrewToEnglish(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
        return "";
    }

    // Check if Google Translate API is configured
    const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Option 1: Use Google Translate API (if API key is set)
    if (GOOGLE_TRANSLATE_API_KEY) {
        try {
            const response = await fetch(
                `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        q: text,
                        source: "he",
                        target: "en",
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                return data.data.translations[0].translatedText;
            }
        } catch (error) {
            console.error("Google Translate API error:", error);
            // Fall through to next option
        }
    }

    // Option 2: Use Gemini API for translation (if available)
    if (GEMINI_API_KEY) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Translate the following Hebrew text to English. Only return the translation, nothing else:\n\n${text}`
                            }]
                        }]
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (translatedText) {
                    return translatedText.trim();
                }
            }
        } catch (error) {
            console.error("Gemini translation error:", error);
            // Fall through to placeholder
        }
    }

    // Option 3: Placeholder (if no translation service is configured)
    console.warn("No translation service configured. Please set GOOGLE_TRANSLATE_API_KEY or GEMINI_API_KEY");
    return `[Translation needed: ${text}]`;
}

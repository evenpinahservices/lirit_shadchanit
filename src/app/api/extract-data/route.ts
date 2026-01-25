import { NextRequest, NextResponse } from "next/server";

// Read the prompt file - using dynamic import for serverless compatibility
async function getExtractionPrompt(): Promise<string> {
    try {
        // Try to read the prompt file
        const fs = await import("fs/promises");
        const path = await import("path");
        const promptPath = path.join(process.cwd(), "src", "prompts", "data-extraction-prompt.txt");
        const prompt = await fs.readFile(promptPath, "utf-8");
        return prompt;
    } catch (error) {
        console.error("Error reading prompt file:", error);
        // Fallback prompt - simplified version
        return `You are an expert Data Extraction Agent. Analyze the images and extract client information into JSON format.
Return a JSON object with all extracted fields. For fields with options, use the exact English values from the options list.
For open text fields, preserve the original language (Hebrew or English).
Each field should have: { "value": <extracted_value>, "confidence": 0.0-1.0, "sourceQuote": "string or null" }`;
    }
}

// Convert image to base64
async function imageToBase64(file: File): Promise<{ mimeType: string; data: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    return {
        mimeType: file.type || "image/jpeg",
        data: base64,
    };
}

// Extract JSON from Gemini response
function extractJSONFromResponse(text: string): any {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("JSON parse error:", e);
        }
    }
    throw new Error("No valid JSON found in response");
}

// Detect Hebrew in text
function containsHebrew(text: string): boolean {
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
}

// Detect language from extracted data based on majority of text
function detectLanguageFromJSON(jsonData: any): string {
    // Fields that typically contain text (Hebrew or English)
    const textFields = [
        "fullName",
        "location",
        "familyBackground",
        "education",
        "occupationTitle",
        "occupationDescription",
        "personality",
        "hobbies",
        "notes",
        "references",
        "preferencesFreeText",
        "medicalHistoryDetails",
        "religiousDetailsFreeText",
    ];

    let hebrewCharCount = 0;
    let englishCharCount = 0;
    let totalFieldsChecked = 0;

    // Count Hebrew vs English characters across all text fields
    for (const field of textFields) {
        if (jsonData[field]) {
            const value = jsonData[field];
            const text = typeof value === "object" && value.value ? String(value.value) : String(value);
            
            if (text && text.trim().length > 0) {
                totalFieldsChecked++;
                // Count Hebrew characters
                const hebrewMatches = text.match(/[\u0590-\u05FF]/g);
                const hebrewChars = hebrewMatches ? hebrewMatches.length : 0;
                
                // Count English characters (letters only, excluding numbers and punctuation)
                const englishMatches = text.match(/[a-zA-Z]/g);
                const englishChars = englishMatches ? englishMatches.length : 0;
                
                hebrewCharCount += hebrewChars;
                englishCharCount += englishChars;
            }
        }
    }

    // If we have text fields, determine language by majority
    if (totalFieldsChecked > 0) {
        // If Hebrew characters are majority, return Hebrew
        if (hebrewCharCount > englishCharCount) {
            return "he";
        }
        // If English characters are majority or equal, return English
        // (default to English if equal)
        return "en";
    }

    // Fallback: check if any field contains Hebrew (for edge cases)
    for (const field of textFields) {
        if (jsonData[field]) {
            const value = jsonData[field];
            const text = typeof value === "object" && value.value ? String(value.value) : String(value);
            if (text && containsHebrew(text)) {
                return "he";
            }
        }
    }
    
    return "en";
}

export async function POST(request: NextRequest) {
    // Require authentication and rate limiting (50 extractions per hour - expensive API)
    const { requireAuthAndRateLimit } = await import("@/lib/apiAuth");
    const authResult = await requireAuthAndRateLimit(request, 50, 3600000);
    if ("error" in authResult) {
        return authResult.error;
    }
    
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is not set in environment variables");
            return NextResponse.json(
                { 
                    success: false, 
                    error: "GEMINI_API_KEY environment variable is not set. Please add it in Vercel environment variables." 
                },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const resumeImages = formData.getAll("resume_images") as File[];
        const profileImage = formData.get("profile_image") as File | null;

        if (!resumeImages || resumeImages.length === 0) {
            return NextResponse.json(
                { success: false, error: "At least one resume image is required" },
                { status: 400 }
            );
        }

        // Prepare images for Gemini
        const imageParts: Array<{ mimeType: string; data: string }> = [];

        // Convert resume images
        for (const img of resumeImages) {
            const base64Image = await imageToBase64(img);
            imageParts.push(base64Image);
        }

        // Convert profile image if provided
        if (profileImage) {
            const base64Image = await imageToBase64(profileImage);
            imageParts.push(base64Image);
        }

        // Get extraction prompt
        const extractionPrompt = await getExtractionPrompt();

        // Prepare content for Gemini
        const contentParts: any[] = [{ text: extractionPrompt }];
        for (const img of imageParts) {
            contentParts.push({
                inlineData: {
                    mimeType: img.mimeType,
                    data: img.data,
                },
            });
        }

        // Call Gemini API - Try Gemini 3.0 Flash first, then fallback
        let geminiResponse: Response;
        try {
            // Try gemini-3-flash-preview first (Gemini 3.0 Flash)
            geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: contentParts,
                            },
                        ],
                    }),
                }
            );
            
            // If 404, try gemini-2.0-flash-exp
            if (geminiResponse.status === 404) {
                console.log("gemini-3-flash-preview not found, trying gemini-2.0-flash-exp");
                geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: contentParts,
                                },
                            ],
                        }),
                    }
                );
                
                // If still 404, try v1 API with gemini-1.5-flash (stable fallback)
                if (geminiResponse.status === 404) {
                    console.log("gemini-2.0-flash-exp not found, trying v1 API with gemini-1.5-flash");
                    geminiResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                contents: [
                                    {
                                        parts: contentParts,
                                    },
                                ],
                            }),
                        }
                    );
                }
            }
        } catch (error: any) {
            console.error("Gemini API fetch error:", error);
            return NextResponse.json(
                {
                    success: false,
                    error: `Failed to call Gemini API: ${error.message}`,
                },
                { status: 500 }
            );
        }

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API error:", errorText);
            return NextResponse.json(
                { success: false, error: `Gemini API error: ${errorText}` },
                { status: geminiResponse.status }
            );
        }

        const geminiData = await geminiResponse.json();
        const responseText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!responseText) {
            return NextResponse.json(
                { success: false, error: "No response from Gemini API" },
                { status: 500 }
            );
        }

        // Parse JSON from response
        let extractedData: any;
        try {
            extractedData = extractJSONFromResponse(responseText);
        } catch (error: any) {
            console.error("JSON parsing error:", error);
            return NextResponse.json(
                {
                    success: false,
                    error: `Failed to parse JSON from Gemini response: ${error.message}`,
                    raw_response: responseText.substring(0, 500),
                },
                { status: 500 }
            );
        }

        // Preserve nested structure with confidence data for color coding
        // The ClientForm's handleAutoFill function expects {value, confidence, sourceQuote} structure
        // Don't flatten - keep the nested structure so confidence can be extracted for color coding
        const processedData: any = {};
        
        // Process each field, preserving confidence data
        for (const [key, value] of Object.entries(extractedData)) {
            // Skip helper fields
            if (key.startsWith("_")) {
                continue;
            }
            
            // If it's already in the correct nested format, keep it
            if (typeof value === "object" && value !== null && "value" in value) {
                processedData[key] = value;
            } 
            // If it's a simple value, wrap it (no confidence data available)
            else {
                processedData[key] = {
                    value: value,
                    confidence: undefined,
                    sourceQuote: null
                };
            }
        }

        // Detect language
        const detectedLanguage = detectLanguageFromJSON(extractedData);
        // Add formLanguage as a simple value (not nested structure)
        processedData.formLanguage = detectedLanguage;

        return NextResponse.json({
            success: true,
            data: processedData, // Keep nested structure for confidence extraction
            language: detectedLanguage,
            raw_response: responseText.substring(0, 1000), // First 1000 chars for debugging
        });
    } catch (error: any) {
        console.error("Error in extract-data route:", error);
        console.error("Error stack:", error?.stack);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Failed to extract data",
                details: process.env.NODE_ENV === "development" ? error?.stack : undefined,
            },
            { status: 500 }
        );
    }
}

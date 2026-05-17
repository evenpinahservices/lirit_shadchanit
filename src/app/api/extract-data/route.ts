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

// Convert image to base64 (from File)
async function imageToBase64(file: File): Promise<{ mimeType: string; data: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    return {
        mimeType: file.type || "image/jpeg",
        data: base64,
    };
}

// Fetch image from URL and convert to base64 (avoids 413 by not sending body from client)
async function imageUrlToBase64(
    imageUrl: string,
    opts?: { maxBytes?: number }
): Promise<{ mimeType: string; data: string }> {
    const { IMAGE_MAX_BYTES, IMAGE_FETCH_TIMEOUT_MS } = await import("@/lib/constants");
    const limit = opts?.maxBytes ?? IMAGE_MAX_BYTES;

    if (!imageUrl.startsWith("https://")) {
        throw new Error("Image URL must be HTTPS");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

    let res: Response;
    try {
        res = await fetch(imageUrl, { cache: "no-store", signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }

    if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status}`);
    }

    // Reject before downloading if Content-Length already exceeds the limit
    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > limit) {
        throw new Error(`Image too large: ${contentLength} bytes (max ${limit})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > limit) {
        throw new Error(`Image too large: ${arrayBuffer.byteLength} bytes (max ${limit})`);
    }

    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    return { mimeType, data: base64 };
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

        const contentType = request.headers.get("content-type") || "";
        let imageParts: Array<{ mimeType: string; data: string }> = [];

        if (contentType.includes("application/json")) {
            const body = await request.json();

            // Support both single imageUrl and multiple imageUrls
            const urls: string[] = [];
            if (Array.isArray(body?.imageUrls)) {
                urls.push(...body.imageUrls.filter((u: unknown) => typeof u === "string"));
            } else if (typeof body?.imageUrl === "string") {
                urls.push(body.imageUrl);
            }

            if (urls.length === 0) {
                return NextResponse.json(
                    { success: false, error: "imageUrl (string) or imageUrls (string[]) is required" },
                    { status: 400 }
                );
            }

            const { IMAGE_MAX_BYTES, IMAGE_TOTAL_MAX_BYTES } = await import("@/lib/constants");
            let totalBytes = 0;
            const imageFetchTimings: { index: number; ms: number; kb: number }[] = [];
            for (let i = 0; i < urls.length; i++) {
                const tFetch = Date.now();
                const base64Image = await imageUrlToBase64(urls[i], { maxBytes: IMAGE_MAX_BYTES });
                const fetchMs = Date.now() - tFetch;
                const kb = Math.round(base64Image.data.length * 0.75 / 1024);
                imageFetchTimings.push({ index: i + 1, ms: fetchMs, kb });
                console.log(`[extract-data] image ${i + 1}/${urls.length} fetched in ${(fetchMs / 1000).toFixed(2)}s — ${kb} KB`);
                totalBytes += base64Image.data.length * 0.75; // base64 → raw byte estimate
                if (totalBytes > IMAGE_TOTAL_MAX_BYTES) {
                    return NextResponse.json(
                        { success: false, error: "Total image size exceeds limit." },
                        { status: 400 }
                    );
                }
                imageParts.push(base64Image);
            }
        } else {
            // FormData flow (legacy)
            const formData = await request.formData();
            const resumeImages = formData.getAll("resume_images") as File[];
            const profileImage = formData.get("profile_image") as File | null;

            if (!resumeImages || resumeImages.length === 0) {
                return NextResponse.json(
                    { success: false, error: "At least one resume image is required" },
                    { status: 400 }
                );
            }

            for (const img of resumeImages) {
                const base64Image = await imageToBase64(img);
                imageParts.push(base64Image);
            }
            if (profileImage) {
                const base64Image = await imageToBase64(profileImage);
                imageParts.push(base64Image);
            }
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

        // Call Gemini API with fallback chain
        const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-001"];
        let geminiResponse: Response | null = null;
        try {
            for (const model of geminiModels) {
                const attempt = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: contentParts }] }),
                    }
                );
                if (attempt.status !== 404) {
                    geminiResponse = attempt;
                    break;
                }
                console.log(`${model} not found, trying next model`);
            }
            if (!geminiResponse) {
                return NextResponse.json(
                    { success: false, error: "No Gemini model available. Check API key and model access." },
                    { status: 503 }
                );
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

        if (!geminiResponse!.ok) {
            const errorText = await geminiResponse!.text();
            console.error("Gemini API error:", errorText);
            return NextResponse.json(
                { success: false, error: `Gemini API error: ${errorText}` },
                { status: geminiResponse!.status }
            );
        }

        const geminiData = await geminiResponse!.json();
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

        // DEBUG: Log raw age/dob from AI to trace wrong-age issues (check server/terminal logs)
        const rawDob = extractedData.dob;
        const rawAge = extractedData.age;
        console.log("[Age/DOB debug] AI returned:", {
            dob: rawDob,
            dobValue: typeof rawDob === "object" && rawDob?.value != null ? rawDob.value : rawDob,
            age: rawAge,
            ageValue: typeof rawAge === "object" && rawAge?.value != null ? rawAge.value : rawAge,
        });

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
            data: processedData,
            language: detectedLanguage,
            raw_response: responseText.substring(0, 1000),
            _imageFetchTimings: imageFetchTimings,
            _debugAgeDob: {
                dob: rawDob,
                dobValue: typeof rawDob === "object" && rawDob?.value != null ? rawDob.value : rawDob,
                age: rawAge,
                ageValue: typeof rawAge === "object" && rawAge?.value != null ? rawAge.value : rawAge,
            },
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

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createPendingClient } from "@/actions/pendingClient";
import dbConnect from "@/lib/db";
import WhatsAppSessionModel from "@/models/WhatsAppSession";

// Session storage using MongoDB (persists across serverless invocations)
async function getSession(sender: string) {
    await dbConnect();
    let session = await WhatsAppSessionModel.findOne({ sender });
    
    if (!session) {
        session = await WhatsAppSessionModel.create({
            sender,
            images: [],
            timestamp: Date.now(),
            isWaitingConfirmation: false,
        });
        console.log(`[Session] Created new MongoDB session for ${sender}`);
    }
    
    return session;
}

async function updateSession(sender: string, updates: Partial<{ images: string[]; timestamp: number; isWaitingConfirmation: boolean }>) {
    await dbConnect();
    const session = await WhatsAppSessionModel.findOneAndUpdate(
        { sender },
        { ...updates, timestamp: Date.now() },
        { new: true, upsert: true }
    );
    return session;
}

async function deleteSession(sender: string) {
    await dbConnect();
    await WhatsAppSessionModel.deleteOne({ sender });
    console.log(`[Session] Deleted MongoDB session for ${sender}`);
}

async function hasSession(sender: string): Promise<boolean> {
    await dbConnect();
    const session = await WhatsAppSessionModel.findOne({ sender });
    return !!session;
}

// Twilio client initialization
function getTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
        throw new Error("Twilio credentials not configured");
    }
    
    return twilio(accountSid, authToken);
}

// Send WhatsApp message
async function sendWhatsAppMessage(to: string, body: string) {
    try {
        const client = getTwilioClient();
        const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
        
        const message = await client.messages.create({
            from,
            to,
            body,
        });
        
        console.log(`WhatsApp message sent: ${message.sid}`);
        return message.sid;
    } catch (error: any) {
        console.error("Error sending WhatsApp message:", error);
        throw error;
    }
}

// Download image from Twilio media URL
// The issue: raw fetch() can hang in Vercel serverless functions
// Solution: Use Twilio SDK's httpClient which is more reliable
async function downloadImageFromUrl(url: string): Promise<Buffer> {
    console.log(`[Download] Starting download from Twilio: ${url.substring(0, 80)}...`);
    const startTime = Date.now();
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
        throw new Error("Twilio credentials not configured");
    }
    
    try {
        // Use Twilio SDK's httpClient instead of raw fetch
        // This handles authentication and is more reliable in serverless
        const client = getTwilioClient();
        
        // The httpClient is accessible via client.httpClient
        // But actually, we can use the SDK's request method
        console.log(`[Download] Using Twilio SDK httpClient...`);
        
        // Make authenticated request using Twilio's httpClient
        const response = await (client as any).httpClient.request({
            method: 'GET',
            uri: url,
        });
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Download] Response received in ${elapsed}s (status: ${response.statusCode})`);
        
        if (response.statusCode !== 200) {
            throw new Error(`Failed to download image: ${response.statusCode} ${response.statusMessage}`);
        }
        
        console.log(`[Download] Converting response to buffer...`);
        // Response body should be a buffer or string
        const buffer = Buffer.isBuffer(response.body) 
            ? response.body 
            : Buffer.from(response.body);
        
        const sizeKB = (buffer.length / 1024).toFixed(1);
        console.log(`[Download] Image downloaded successfully (${sizeKB} KB)`);
        return buffer;
    } catch (error: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`[Download] Error after ${elapsed}s:`, error.message);
        console.error(`[Download] Error stack:`, error.stack);
        throw new Error(`Failed to download image: ${error.message}`);
    }
}

// Convert image to base64 for Gemini
async function imageToBase64(buffer: Buffer, mimeType: string = "image/jpeg"): Promise<{ mimeType: string; data: string }> {
    const base64 = buffer.toString("base64");
    return {
        mimeType,
        data: base64,
    };
}

// Get extraction prompt (reuse from extract-data)
async function getExtractionPrompt(): Promise<string> {
    try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const promptPath = path.join(process.cwd(), "src", "prompts", "data-extraction-prompt.txt");
        const prompt = await fs.readFile(promptPath, "utf-8");
        return prompt;
    } catch (error) {
        console.error("Error reading prompt file:", error);
        return `You are an expert Data Extraction Agent. Analyze the images and extract client information into JSON format.
Return a JSON object with all extracted fields. For fields with options, use the exact English values from the options list.
For open text fields, preserve the original language (Hebrew or English).
Each field should have: { "value": <extracted_value>, "confidence": 0.0-1.0, "sourceQuote": "string or null" }`;
    }
}

// Extract JSON from Gemini response
function extractJSONFromResponse(text: string): any {
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

// Detect language from extracted data
function detectLanguageFromJSON(jsonData: any): string {
    const textFields = [
        "fullName", "location", "familyBackground", "education",
        "occupation", "personality", "hobbies", "notes", "references",
        "preferencesFreeText", "medicalHistoryDetails",
    ];

    let hebrewCharCount = 0;
    let englishCharCount = 0;

    for (const field of textFields) {
        if (jsonData[field]) {
            const value = jsonData[field];
            const text = typeof value === "object" && value.value ? String(value.value) : String(value);
            
            if (text && text.trim().length > 0) {
                const hebrewMatches = text.match(/[\u0590-\u05FF]/g);
                const hebrewChars = hebrewMatches ? hebrewMatches.length : 0;
                
                const englishMatches = text.match(/[a-zA-Z]/g);
                const englishChars = englishMatches ? englishMatches.length : 0;
                
                hebrewCharCount += hebrewChars;
                englishCharCount += englishChars;
            }
        }
    }

    return hebrewCharCount > englishCharCount ? "he" : "en";
}

// Process images with Gemini (reuse logic from extract-data)
async function extractDataFromImages(imageUrls: string[]): Promise<any> {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
    }

    // Download and convert images
    const imageParts: Array<{ mimeType: string; data: string }> = [];
    console.log(`[Gemini] Downloading ${imageUrls.length} image(s)...`);
    
    for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        try {
            console.log(`[Gemini] Downloading image ${i + 1}/${imageUrls.length}...`);
            const imageBuffer = await downloadImageFromUrl(url);
            console.log(`[Gemini] Image ${i + 1} downloaded, converting to base64...`);
            const base64Image = await imageToBase64(imageBuffer);
            imageParts.push(base64Image);
            console.log(`[Gemini] Image ${i + 1} converted successfully`);
        } catch (error) {
            console.error(`[Gemini] Failed to download image ${i + 1} from ${url}:`, error);
            // Continue with other images
        }
    }
    
    console.log(`[Gemini] Successfully prepared ${imageParts.length} image(s) for Gemini API`);

    if (imageParts.length === 0) {
        throw new Error("No images could be downloaded");
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

    // Call Gemini API with timeout
    let geminiResponse: Response;
    const startTime = Date.now();
    const TIMEOUT_MS = 60000; // 60 seconds timeout
    
    try {
        console.log(`[Gemini] Calling Gemini API (model: gemini-3-flash-preview)...`);
        console.log(`[Gemini] Timeout set to ${TIMEOUT_MS / 1000}s`);
        
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Gemini API timeout after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS);
        });
        
        // Race between fetch and timeout
        const fetchPromise = fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [{ parts: contentParts }],
                }),
            }
        );
        
        geminiResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Gemini] Gemini API responded in ${elapsed}s (status: ${geminiResponse.status})`);

        // Fallback to gemini-2.0-flash-exp if 404
        if (geminiResponse.status === 404) {
            console.log("[Gemini] gemini-3-flash-preview not found, trying gemini-2.0-flash-exp");
            const fetchPromise2 = fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [{ parts: contentParts }],
                    }),
                }
            );
            geminiResponse = await Promise.race([fetchPromise2, timeoutPromise]) as Response;

            // Fallback to gemini-1.5-flash if still 404
            if (geminiResponse.status === 404) {
                console.log("[Gemini] gemini-2.0-flash-exp not found, trying gemini-1.5-flash");
                const fetchPromise3 = fetch(
                    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: [{ parts: contentParts }],
                        }),
                    }
                );
                geminiResponse = await Promise.race([fetchPromise3, timeoutPromise]) as Response;
            }
        }
    } catch (error: any) {
        console.error("[Gemini] Gemini API fetch error:", error);
        console.error("[Gemini] Error type:", error.constructor.name);
        console.error("[Gemini] Error message:", error.message);
        if (error.message.includes("timeout")) {
            throw new Error(`Gemini API timed out after ${TIMEOUT_MS / 1000} seconds. The images might be too large or the API is slow.`);
        }
        throw new Error(`Failed to call Gemini API: ${error.message}`);
    }

    if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!responseText) {
        throw new Error("No response from Gemini API");
    }

    // Parse JSON from response
    let extractedData: any;
    try {
        extractedData = extractJSONFromResponse(responseText);
    } catch (error: any) {
        console.error("JSON parsing error:", error);
        throw new Error(`Failed to parse JSON from Gemini response: ${error.message}`);
    }

    // Flatten nested structure for MongoDB (extract value from {value, confidence, sourceQuote})
    const flatData: any = {};
    for (const [key, value] of Object.entries(extractedData)) {
        if (key.startsWith("_")) {
            continue;
        }
        
        if (typeof value === "object" && value !== null && "value" in value) {
            flatData[key] = (value as any).value;
        } else {
            flatData[key] = value;
        }
    }

    // Detect language
    const detectedLanguage = detectLanguageFromJSON(extractedData);
    flatData.formLanguage = detectedLanguage;

    return flatData;
}

// Handle GET requests (webhook validation from Twilio)
export async function GET(request: NextRequest) {
    console.log("\n=== GET Request (Webhook Validation) ===");
    console.log("URL:", request.url);
    return NextResponse.json({ status: "OK" }, { status: 200 });
}

// Handle POST requests (WhatsApp messages from Twilio)
export async function POST(request: NextRequest) {
    try {
        console.log("\n=== WhatsApp Webhook Received ===");
        
        // Parse form data from Twilio
        const formData = await request.formData();
        const body = formData.get("Body")?.toString() || "";
        const sender = formData.get("From")?.toString() || "";
        const numMedia = parseInt(formData.get("NumMedia")?.toString() || "0");

        console.log("Sender:", sender);
        console.log("Message:", body);
        console.log("NumMedia:", numMedia);

        const twiml = new twilio.twiml.MessagingResponse();

        // Handle images
        if (numMedia > 0) {
            console.log(`[WhatsApp] Received ${numMedia} image(s) from ${sender}`);
            
            // Get or create session from MongoDB
            const session = await getSession(sender);
            const previousCount = session.images.length;
            const isNewSession = previousCount === 0;
            console.log(`[WhatsApp] Previous image count: ${previousCount}`);

            // Extract and store image URLs
            const newImageUrls: string[] = [];
            for (let i = 0; i < numMedia; i++) {
                const mediaUrl = formData.get(`MediaUrl${i}`)?.toString();
                if (mediaUrl) {
                    newImageUrls.push(mediaUrl);
                    console.log(`[WhatsApp] Stored image URL ${i + 1}: ${mediaUrl.substring(0, 50)}...`);
                }
            }

            // Update session in MongoDB with new images
            const updatedImages = [...session.images, ...newImageUrls];
            await updateSession(sender, {
                images: updatedImages,
                isWaitingConfirmation: false,
            });
            console.log(`[WhatsApp] Total images in session: ${updatedImages.length}`);

            const totalImages = session.images.length;

            // Different message for first batch vs additional batches
            let message: string;
            if (isNewSession || previousCount === 0) {
                // First batch of images - removed "Hi!" to avoid duplicate messages
                message = `Thank you for uploading these images. Keep sending if you have more. Type 'yes' or 'done' when finished to generate the profile. Also, write 'cancel' at any time to exit this process.`;
            } else {
                // Additional batch
                message = `I received another ${numMedia} image(s). Keep sending if you have more.`;
            }

            const immediateMsg = twiml.message(message);
            console.log(`[WhatsApp] Response sent. Session ID: ${sender}, Images stored: ${session.images.length}`);

            return new NextResponse(twiml.toString(), {
                status: 200,
                headers: { "Content-Type": "text/xml" },
            });
        }

        // Handle text messages
        const incomingMsg = body.trim().toLowerCase();
        console.log(`[WhatsApp] Processing text message: "${incomingMsg}"`);
        console.log(`[WhatsApp] Sender: ${sender}`);

        // Handle cancel command
        if (incomingMsg === "cancel") {
            const hasActiveSession = await hasSession(sender);
            if (hasActiveSession) {
                await deleteSession(sender);
                const msg = twiml.message("❌ Process cancelled. You can start over by sending images again.");
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            } else {
                const msg = twiml.message("No active session to cancel. Send images to start.");
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }
        }

        // Check if user is confirming upload (case-insensitive)
        if (incomingMsg === "yes" || incomingMsg === "done" || incomingMsg === "go" || incomingMsg === "y" || incomingMsg === "no" || incomingMsg === "n") {
            console.log(`[WhatsApp] User sent command: "${incomingMsg}"`);
            
            const hasActiveSession = await hasSession(sender);
            console.log(`[WhatsApp] Has session: ${hasActiveSession}`);
            
            if (!hasActiveSession) {
                console.log(`[WhatsApp] No session found for ${sender}`);
                const msg = twiml.message("⚠️ No images found. Please send images first, then type 'yes' or 'done'.");
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }

            const session = await getSession(sender);
            const images = session.images;
            console.log(`[WhatsApp] Session found. Image count: ${images.length}`);

            if (images.length === 0) {
                console.log(`[WhatsApp] Session exists but no images stored`);
                const msg = twiml.message("⚠️ No images found to process.");
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }

            // If waiting for confirmation and user says "no", allow them to continue
            if (session.isWaitingConfirmation && (incomingMsg === "no" || incomingMsg === "n")) {
                console.log(`[WhatsApp] User said 'no' to confirmation, allowing more uploads`);
                await updateSession(sender, { isWaitingConfirmation: false });
                const msg = twiml.message("Continue uploading images, and then press Yes or Done to proceed, or 'cancel' to exit.");
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }

            // If not waiting for confirmation, ask for confirmation first
            if (!session.isWaitingConfirmation) {
                console.log(`[WhatsApp] Asking for confirmation. Images: ${images.length}`);
                await updateSession(sender, { isWaitingConfirmation: true });
                const msg = twiml.message(
                    `You have sent ${images.length} image(s). Would you like to proceed with processing? Reply 'yes' to continue or 'no' to upload more images.`
                );
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }

            // User confirmed, proceed with processing
            console.log(`[WhatsApp] User confirmed processing. Starting with ${images.length} images`);
            await deleteSession(sender); // Clear session from MongoDB

            // Send confirmation message immediately (responds right away)
            const confirmationMsg = twiml.message(
                "✅ Received images. Processing resume now. I will send a message when this is done."
            );

            // Return confirmation immediately (don't wait for processing)
            const response = new NextResponse(twiml.toString(), {
                status: 200,
                headers: { "Content-Type": "text/xml" },
            });

            // Process images in background using waitUntil to keep function alive
            // This ensures Vercel doesn't kill the function before processing completes
            const processingPromise = (async () => {
                try {
                    console.log(`\n[WhatsApp] ===== STARTING PROCESSING =====`);
                    console.log(`[WhatsApp] Sender: ${sender}`);
                    console.log(`[WhatsApp] Image count: ${images.length}`);
                    console.log(`[WhatsApp] Image URLs:`, images);
                    
                    // Extract data from images (this may take a while)
                    console.log(`[WhatsApp] Step 1/3: Calling Gemini API to extract data...`);
                    const extractedData = await extractDataFromImages(images);
                    console.log(`[WhatsApp] Step 1/3: ✅ Data extraction complete`);
                    console.log(`[WhatsApp] Extracted fields:`, Object.keys(extractedData));
                    console.log(`[WhatsApp] Extracted name:`, extractedData.fullName || "Unknown");

                    // Save to MongoDB
                    console.log(`[WhatsApp] Step 2/3: Saving to MongoDB...`);
                    const pendingClient = await createPendingClient({
                        ...extractedData,
                        submittedAt: new Date().toISOString(),
                        submittedBy: sender,
                        source: "whatsapp",
                        sourceDescription: "Extracted from WhatsApp images",
                        status: "pending_approval",
                        active: true,
                        createdAt: new Date().toISOString().split("T")[0],
                    });
                    console.log(`[WhatsApp] Step 2/3: ✅ Saved to MongoDB`);
                    console.log(`[WhatsApp] Pending client ID: ${pendingClient.id}`);

                    // Generate edit link
                    const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.WEB_APP_URL || "http://localhost:3000";
                    const editLink = `${webAppUrl}/inbox/${pendingClient.id}`;

                    // Extract name
                    const name = extractedData.fullName || "Unknown";

                    // Send success message
                    console.log(`[WhatsApp] Step 3/3: Sending success message to ${sender}...`);
                    await sendWhatsAppMessage(
                        sender,
                        `✅ *Profile Drafted!*\n\nName: ${name}\n\nReview and Publish here: ${editLink}`
                    );
                    console.log(`[WhatsApp] Step 3/3: ✅ Success message sent`);
                    console.log(`[WhatsApp] ===== PROCESSING COMPLETE =====\n`);
                } catch (error: any) {
                    console.error(`\n[WhatsApp] ===== PROCESSING ERROR =====`);
                    console.error(`[WhatsApp] Sender: ${sender}`);
                    console.error(`[WhatsApp] Error:`, error);
                    console.error(`[WhatsApp] Error message:`, error.message);
                    console.error(`[WhatsApp] Error stack:`, error.stack);
                    const errorMsg = error.message || "Unknown error";
                    try {
                        await sendWhatsAppMessage(
                            sender,
                            `❌ Error processing images: ${errorMsg}\n\nPlease try again or contact support.`
                        );
                        console.error(`[WhatsApp] Error message sent to user`);
                    } catch (sendError) {
                        console.error(`[WhatsApp] Failed to send error message:`, sendError);
                    }
                    console.error(`[WhatsApp] ===== ERROR HANDLED =====\n`);
                }
            })();

            // Use waitUntil to keep the function alive during processing
            // This is a Vercel/Next.js feature that ensures background tasks complete
            if (typeof (request as any).waitUntil === 'function') {
                (request as any).waitUntil(processingPromise);
            } else {
                // Fallback: just start the promise (may not complete in serverless)
                processingPromise.catch(console.error);
            }

            return response;
        }

        // Handle "join" or "sign up" commands
        if (incomingMsg.includes("join") || incomingMsg.includes("sign up")) {
            const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.WEB_APP_URL || "http://localhost:3000";
            const link = `${webAppUrl}/clients/new`;
            const msg = twiml.message(
                `Welcome! Please fill out your profile here: ${link}\n\nOnce you click 'Approve' on the form, we will review it.`
            );

            return new NextResponse(twiml.toString(), {
                status: 200,
                headers: { "Content-Type": "text/xml" },
            });
        }

        // Default fallback
        const msg = twiml.message(
            "I didn't understand that. Send images to create a profile, or type 'Join' to sign up."
        );

        return new NextResponse(twiml.toString(), {
            status: 200,
            headers: { "Content-Type": "text/xml" },
        });
    } catch (error: any) {
        console.error("Error in WhatsApp webhook:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

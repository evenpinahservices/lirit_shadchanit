import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createPendingClient } from "@/actions/pendingClient";

// Session storage for image uploads (in-memory, resets on cold start)
// In production, consider using Vercel KV or Redis for persistence
const uploadSessions = new Map<string, { images: string[]; timestamp: number; isWaitingConfirmation: boolean }>();

// Clean up old sessions (older than 1 hour)
setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [sender, session] of uploadSessions.entries()) {
        if (session.timestamp < oneHourAgo) {
            uploadSessions.delete(sender);
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

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
async function downloadImageFromUrl(url: string): Promise<Buffer> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
        throw new Error("Twilio credentials not configured");
    }
    
    // Twilio media URLs require authentication
    const response = await fetch(url, {
        headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
    });
    
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
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
    
    for (const url of imageUrls) {
        try {
            const imageBuffer = await downloadImageFromUrl(url);
            const base64Image = await imageToBase64(imageBuffer);
            imageParts.push(base64Image);
        } catch (error) {
            console.error(`Failed to download image from ${url}:`, error);
            // Continue with other images
        }
    }

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

    // Call Gemini API
    let geminiResponse: Response;
    try {
        geminiResponse = await fetch(
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

        // Fallback to gemini-2.0-flash-exp if 404
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
                        contents: [{ parts: contentParts }],
                    }),
                }
            );

            // Fallback to gemini-1.5-flash if still 404
            if (geminiResponse.status === 404) {
                console.log("gemini-2.0-flash-exp not found, trying gemini-1.5-flash");
                geminiResponse = await fetch(
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
            }
        }
    } catch (error: any) {
        console.error("Gemini API fetch error:", error);
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
            // Initialize session if not exists
            const isNewSession = !uploadSessions.has(sender);
            if (isNewSession) {
                uploadSessions.set(sender, { images: [], timestamp: Date.now(), isWaitingConfirmation: false });
            }

            const session = uploadSessions.get(sender)!;
            const previousCount = session.images.length;

            // Extract and store image URLs
            for (let i = 0; i < numMedia; i++) {
                const mediaUrl = formData.get(`MediaUrl${i}`)?.toString();
                if (mediaUrl) {
                    session.images.push(mediaUrl);
                }
            }

            // Update timestamp and reset confirmation flag
            session.timestamp = Date.now();
            session.isWaitingConfirmation = false;

            const totalImages = session.images.length;

            // Different message for first batch vs additional batches
            let message: string;
            if (isNewSession || previousCount === 0) {
                // First batch of images
                message = `Hi! Thank you for uploading these images. Keep sending if you have more. Type 'yes' or 'done' when finished to generate the profile. Also, write 'cancel' at any time to exit this process.`;
            } else {
                // Additional batch
                message = `I received another ${numMedia} image(s). Keep sending if you have more.`;
            }

            const immediateMsg = twiml.message(message);

            return new NextResponse(twiml.toString(), {
                status: 200,
                headers: { "Content-Type": "text/xml" },
            });
        }

        // Handle text messages
        const incomingMsg = body.trim().toLowerCase();

        // Handle cancel command
        if (incomingMsg === "cancel" && uploadSessions.has(sender)) {
            uploadSessions.delete(sender);
            const msg = twiml.message("❌ Process cancelled. You can start over by sending images again.");
            return new NextResponse(twiml.toString(), {
                status: 200,
                headers: { "Content-Type": "text/xml" },
            });
        }

        // Check if user is confirming upload (case-insensitive)
        if ((incomingMsg === "yes" || incomingMsg === "done" || incomingMsg === "go" || incomingMsg === "y" || incomingMsg === "no" || incomingMsg === "n") && uploadSessions.has(sender)) {
            const session = uploadSessions.get(sender)!;
            const images = session.images;

            if (images.length === 0) {
                const msg = twiml.message("⚠️ No images found to process.");
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }

            // If waiting for confirmation and user says "no", allow them to continue
            if (session.isWaitingConfirmation && (incomingMsg === "no" || incomingMsg === "n")) {
                session.isWaitingConfirmation = false;
                const msg = twiml.message("Continue uploading images, and then press Yes or Done to proceed, or 'cancel' to exit.");
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }

            // If not waiting for confirmation, ask for confirmation first
            if (!session.isWaitingConfirmation) {
                session.isWaitingConfirmation = true;
                const msg = twiml.message(
                    `You have sent ${images.length} image(s). Would you like to proceed with processing? Reply 'yes' to continue or 'no' to upload more images.`
                );
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }

            // User confirmed, proceed with processing
            uploadSessions.delete(sender); // Clear session

            // Send confirmation message immediately (responds right away)
            const confirmationMsg = twiml.message(
                "✅ Received images. Processing resume now. I will send a message when this is done."
            );

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

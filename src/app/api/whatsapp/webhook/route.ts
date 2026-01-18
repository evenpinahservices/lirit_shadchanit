import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { v2 as cloudinary } from "cloudinary";
import { createPendingClient } from "@/actions/pendingClient";
import dbConnect from "@/lib/db";
import WhatsAppSessionModel from "@/models/WhatsAppSession";
import TwilioCostModel from "@/models/TwilioCost";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    } else {
        // Ensure images array exists (defensive check)
        if (!session.images || !Array.isArray(session.images)) {
            console.warn(`[Session] Session found but images array is invalid, resetting to empty array`);
            session.images = [];
            await session.save();
        }
        console.log(`[Session] Retrieved existing MongoDB session for ${sender} with ${session.images.length} images`);
    }
    
    return session;
}

async function updateSession(sender: string, updates: Partial<{ images: string[]; timestamp: number }>) {
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

// Default WhatsApp pricing (US rates - adjust for your country)
const DEFAULT_WHATSAPP_PRICING = {
    inboundText: 0.005,
    inboundMedia: 0.005,
    outboundText: 0.005,
    outboundMedia: 0.005,
};

// Send WhatsApp message and track cost
async function sendWhatsAppMessage(
    to: string,
    body: string,
    options?: { profileId?: string; messageType?: "text" | "media" }
) {
    try {
        const client = getTwilioClient();
        const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
        
        const message = await client.messages.create({
            from,
            to,
            body,
        });
        
        console.log(`WhatsApp message sent: ${message.sid}`);
        
        // Try to fetch actual cost from Twilio (may not be available immediately)
        let actualCost = DEFAULT_WHATSAPP_PRICING.outboundText;
        let currency = "USD";
        
        try {
            // Wait a bit for Twilio to process the message
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const messageDetails = await client.messages(message.sid).fetch();
            if (messageDetails.price) {
                actualCost = parseFloat(messageDetails.price) || DEFAULT_WHATSAPP_PRICING.outboundText;
                currency = messageDetails.priceUnit || "USD";
            }
        } catch (fetchError) {
            console.log(`Could not fetch message price immediately, using default: ${actualCost}`);
        }
        
        // Store cost in database
        try {
            await dbConnect();
            await TwilioCostModel.create({
                messageSid: message.sid,
                profileId: options?.profileId,
                sender: to,
                direction: "outbound",
                messageType: options?.messageType || "text",
                cost: actualCost,
                currency,
                date: new Date(),
                metadata: {
                    body: body.substring(0, 100), // Store first 100 chars
                    status: "sent",
                },
            });
        } catch (costError) {
            console.error("Failed to store cost:", costError);
            // Don't fail the message send if cost tracking fails
        }
        
        return message.sid;
    } catch (error: any) {
        console.error("Error sending WhatsApp message:", error);
        throw error;
    }
}

// Download image from Twilio media URL and upload to Cloudinary
// Returns Cloudinary URL for permanent storage
async function downloadAndUploadToCloudinary(twilioUrl: string): Promise<string> {
    console.log(`[Cloudinary] Starting download from Twilio: ${twilioUrl.substring(0, 80)}...`);
    const startTime = Date.now();
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
        throw new Error("Twilio credentials not configured");
    }
    
    try {
        // Twilio media URLs require Basic Auth with Account SID and Auth Token
        // Create Basic Auth header
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        
        console.log(`[Cloudinary] Downloading from Twilio with Basic Auth...`);
        
        // Use fetch with Basic Auth headers
        const response = await fetch(twilioUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
            },
        });
        
        const downloadElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Cloudinary] Downloaded in ${downloadElapsed}s (status: ${response.status})`);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Failed to download image: ${response.status} ${errorText}`);
        }
        
        // Convert to buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const sizeKB = (buffer.length / 1024).toFixed(1);
        console.log(`[Cloudinary] Image downloaded (${sizeKB} KB), uploading to Cloudinary...`);
        
        // Convert to base64 for Cloudinary
        const base64Data = `data:image/jpeg;base64,${buffer.toString("base64")}`;
        
        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(base64Data, {
            folder: "whatsapp_resumes",
            resource_type: "image",
            timeout: 120000,
        });
        
        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Cloudinary] Uploaded to Cloudinary in ${totalElapsed}s: ${uploadResult.secure_url}`);
        
        if (!uploadResult?.secure_url) {
            throw new Error("Cloudinary upload succeeded but no URL returned");
        }
        
        return uploadResult.secure_url;
    } catch (error: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`[Cloudinary] Error after ${elapsed}s:`, error.message);
        throw new Error(`Failed to download and upload image: ${error.message}`);
    }
}

// Download image from Cloudinary URL (public URLs, simple fetch)
async function downloadImageFromCloudinary(url: string): Promise<Buffer> {
    console.log(`[Download] Downloading from Cloudinary: ${url.substring(0, 80)}...`);
    const startTime = Date.now();
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to download from Cloudinary: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const sizeKB = (buffer.length / 1024).toFixed(1);
        
        console.log(`[Download] Downloaded from Cloudinary in ${elapsed}s (${sizeKB} KB)`);
        return buffer;
    } catch (error: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`[Download] Error after ${elapsed}s:`, error.message);
        throw new Error(`Failed to download from Cloudinary: ${error.message}`);
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

    // Download images from Cloudinary and convert for Gemini
    // Note: imageUrls now contain Cloudinary URLs (public, reliable)
    const imageParts: Array<{ mimeType: string; data: string }> = [];
    console.log(`[Gemini] Processing ${imageUrls.length} image(s) from Cloudinary...`);
    
    for (let i = 0; i < imageUrls.length; i++) {
        const cloudinaryUrl = imageUrls[i];
        try {
            console.log(`[Gemini] Downloading image ${i + 1}/${imageUrls.length} from Cloudinary...`);
            const imageBuffer = await downloadImageFromCloudinary(cloudinaryUrl);
            console.log(`[Gemini] Image ${i + 1} downloaded, converting to base64...`);
            const base64Image = await imageToBase64(imageBuffer);
            imageParts.push(base64Image);
            console.log(`[Gemini] Image ${i + 1} converted successfully`);
        } catch (error: any) {
            console.error(`[Gemini] Failed to download image ${i + 1} from ${cloudinaryUrl}:`, error.message);
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
            
            // Track inbound media message cost
            try {
                await dbConnect();
                const messageSid = formData.get("MessageSid")?.toString() || `inbound_${Date.now()}`;
                await TwilioCostModel.create({
                    messageSid,
                    sender,
                    direction: "inbound",
                    messageType: "media",
                    cost: DEFAULT_WHATSAPP_PRICING.inboundMedia * numMedia,
                    currency: "USD",
                    date: new Date(),
                    metadata: {
                        numMedia,
                        status: "received",
                    },
                });
            } catch (costError) {
                console.error("Failed to track inbound media cost:", costError);
            }
            
            // Get or create session from MongoDB
            const session = await getSession(sender);
            const previousCount = session.images ? session.images.length : 0;
            const isNewSession = previousCount === 0;
            console.log(`[WhatsApp] Session retrieved. Previous image count: ${previousCount}`);
            console.log(`[WhatsApp] Session images array:`, session.images);

            // Download images from Twilio and upload to Cloudinary immediately
            const newCloudinaryUrls: string[] = [];
            for (let i = 0; i < numMedia; i++) {
                const twilioMediaUrl = formData.get(`MediaUrl${i}`)?.toString();
                if (twilioMediaUrl) {
                    try {
                        console.log(`[WhatsApp] Processing image ${i + 1}/${numMedia}...`);
                        // Download from Twilio and upload to Cloudinary
                        const cloudinaryUrl = await downloadAndUploadToCloudinary(twilioMediaUrl);
                        newCloudinaryUrls.push(cloudinaryUrl);
                        console.log(`[WhatsApp] Image ${i + 1} uploaded to Cloudinary: ${cloudinaryUrl.substring(0, 50)}...`);
                    } catch (error: any) {
                        console.error(`[WhatsApp] Failed to process image ${i + 1}:`, error.message);
                        // Continue with other images
                    }
                }
            }

            // Update session in MongoDB with Cloudinary URLs (not Twilio URLs)
            const existingImages = session.images || [];
            const updatedImages = [...existingImages, ...newCloudinaryUrls];
            await updateSession(sender, {
                images: updatedImages,
            });
            console.log(`[WhatsApp] Total images in session: ${updatedImages.length} (all stored in Cloudinary)`);
            console.log(`[WhatsApp] Session images before update: ${existingImages.length}, New images: ${newCloudinaryUrls.length}, Total after: ${updatedImages.length}`);

            // Simple message: just tell them how many images and to type yes
            const totalImages = updatedImages.length;
            if (totalImages === 0) {
                console.error(`[WhatsApp] ERROR: No images stored! Session had ${session.images.length}, newCloudinaryUrls: ${newCloudinaryUrls.length}`);
                const message = `⚠️ No images were saved. Please try sending the images again.`;
                const immediateMsg = twiml.message(message);
                return new NextResponse(twiml.toString(), {
                    status: 200,
                    headers: { "Content-Type": "text/xml" },
                });
            }
            
            const message = `You have sent ${totalImages} image(s). Reply yes or done to proceed.`;
            
            twiml.message(message);
            const twimlResponse = twiml.toString();
            console.log(`[WhatsApp] Response sent. Session ID: ${sender}, Images stored: ${totalImages} (all in Cloudinary)`);
            console.log(`[WhatsApp] TwiML response: ${twimlResponse}`);

            return new NextResponse(twimlResponse, {
                status: 200,
                headers: { "Content-Type": "text/xml" },
            });
        }

        // Handle text messages
        const incomingMsg = body.trim().toLowerCase();
        console.log(`[WhatsApp] Processing text message: "${incomingMsg}"`);
        console.log(`[WhatsApp] Sender: ${sender}`);
        
        // Track inbound text message cost
        try {
            await dbConnect();
            const messageSid = formData.get("MessageSid")?.toString() || `inbound_${Date.now()}`;
            await TwilioCostModel.create({
                messageSid,
                sender,
                direction: "inbound",
                messageType: "text",
                cost: DEFAULT_WHATSAPP_PRICING.inboundText,
                currency: "USD",
                date: new Date(),
                metadata: {
                    body: incomingMsg,
                    status: "received",
                },
            });
        } catch (costError) {
            console.error("Failed to track inbound text cost:", costError);
        }

        // Check if user is confirming (case-insensitive: yes, y, done, go)
        if (incomingMsg === "yes" || incomingMsg === "done" || incomingMsg === "go" || incomingMsg === "y") {
            console.log(`[WhatsApp] User sent command: "${incomingMsg}"`);
            
            const hasActiveSession = await hasSession(sender);
            console.log(`[WhatsApp] Has session: ${hasActiveSession}`);
            
            if (!hasActiveSession) {
                console.log(`[WhatsApp] No session found for ${sender}`);
                const msg = twiml.message("⚠️ No images found. Please send images first, then type 'yes' to proceed.");
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

            // User confirmed, proceed with processing immediately (no confirmation step)
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
                    // Store Cloudinary image URLs in galleryImages so we can clean them up if rejected
                    console.log(`[WhatsApp] Step 2/3: Saving to MongoDB...`);
                    const pendingClient = await createPendingClient({
                        ...extractedData,
                        // Store original WhatsApp images in galleryImages for cleanup
                        galleryImages: images, // Cloudinary URLs from WhatsApp upload
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
                        `✅ *Profile Drafted!*\n\nName: ${name}\n\nReview and Publish here: ${editLink}`,
                        { profileId: pendingClient.id, messageType: "text" }
                    );
                    console.log(`[WhatsApp] Step 3/3: ✅ Success message sent`);
                    console.log(`[WhatsApp] ===== PROCESSING COMPLETE =====\n`);
                } catch (error: any) {
                    console.error(`\n[WhatsApp] ===== PROCESSING ERROR =====`);
                    console.error(`[WhatsApp] Sender: ${sender}`);
                    console.error(`[WhatsApp] Error:`, error);
                    console.error(`[WhatsApp] Error message:`, error.message);
                    console.error(`[WhatsApp] Error stack:`, error.stack);
                    
                    // Clean up uploaded images from Cloudinary on error
                    try {
                        const { deleteCloudinaryImages } = await import("@/lib/cloudinaryCleanup");
                        console.log(`[WhatsApp] Cleaning up ${images.length} image(s) from Cloudinary due to processing error`);
                        await deleteCloudinaryImages(images);
                    } catch (cleanupError) {
                        console.error(`[WhatsApp] Failed to cleanup images:`, cleanupError);
                    }
                    
                    const errorMsg = error.message || "Unknown error";
                    try {
                        await sendWhatsAppMessage(
                            sender,
                            `❌ Error processing images: ${errorMsg}\n\nPlease try again or contact support.`,
                            { messageType: "text" }
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

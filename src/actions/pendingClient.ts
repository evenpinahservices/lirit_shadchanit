"use server";

import dbConnect from "@/lib/db";
import PendingClientModel, { getPendingClientModel } from "@/models/PendingClient";
import FormTokenModel from "@/models/FormToken";
import { Client } from "@/lib/mockData";
import { revalidatePath } from "next/cache";
import { createClient } from "./client";
import crypto from "crypto";
import { deleteCloudinaryImages, extractImageUrls } from "@/lib/cloudinaryCleanup";
import { requireAuth } from "@/lib/serverAuth";
import { isValidObjectId } from "@/lib/validation";

// Type definition for PendingClient Input (excluding auto-generated fields)
type PendingClientInput = Omit<Client, "id" | "createdAt"> & {
    submittedAt?: string;
    submittedBy?: string;
    token?: string;
    source?: "client_form" | "whatsapp" | "admin_manual" | "admin_ai_draft";
    sourceDescription?: string;
    existingApprovedClientId?: string; // ID of approved client that will be overwritten
};

export async function getPendingClients(): Promise<(PendingClientInput & { id: string })[]> {
    try {
        const user = await requireAuth();
        const conn = await dbConnect(user.dbName);
        const Model = getPendingClientModel(conn);
        const pendingClients = await Model.find({}).sort({ submittedAt: -1 }).lean();

        return pendingClients.map((doc: any) => {
            const { _id, __v, ...rest } = doc;
            return {
                ...rest,
                id: _id.toString(),
                // Ensure arrays are arrays
                religiousAffiliation: doc.religiousAffiliation || [],
                languages: doc.languages || [],
                ageGapPreference: doc.ageGapPreference || [],
                preferredEthnicities: doc.preferredEthnicities || [],
                preferredHashkafos: doc.preferredHashkafos || [],
                preferredLearningStatus: doc.preferredLearningStatus || [],
                preferredHeadCovering: doc.preferredHeadCovering || [],
                formLanguage: doc.formLanguage || "en",
            } as PendingClientInput & { id: string };
        });
    } catch (error: any) {
        console.error("Error in getPendingClients:", error);
        throw new Error(error?.message || "Failed to fetch pending clients");
    }
}

export async function createPendingClient(data: PendingClientInput): Promise<PendingClientInput & { id: string }> {
  try {
    // Resolve which DB to save into:
    // - Authenticated admin actions land in the admin's own DB.
    // - External form submissions use the FormToken's ownerDbName (if set).
    let targetDbName: string | undefined;
    if (data.token) {
        const mainConn = await dbConnect();
        const tokenDoc = await FormTokenModel.findOne({ token: data.token }).lean();
        targetDbName = (tokenDoc as any)?.ownerDbName || undefined;
    } else {
        const { requireAuth: _requireAuth } = await import("@/lib/serverAuth");
        const user = await _requireAuth();
        targetDbName = user.dbName;
    }
    const conn = await dbConnect(targetDbName);
    const PendingModel = getPendingClientModel(conn);

    // Rate limiting: per-client identifier (email or phone) to avoid
    // blocking different clients who share the same form link.
    if (data.token) {
        const { checkRateLimit } = await import("@/lib/rateLimit");
        const identifier = data.email?.trim().toLowerCase() || data.phone?.trim() || data.token;
        const rateLimitKey = `form_submission:${identifier}`;
        const rateLimitResult = await checkRateLimit(rateLimitKey, 5, 30 * 60 * 1000); // 5 per 30 minutes
        
        if (!rateLimitResult.allowed) {
            throw new Error("Rate limit exceeded. Please wait before submitting again.");
        }
    }

    // Normalize email and phone for consistent lookup
    const normalizedData = {
        ...data,
        email: data.email?.trim().toLowerCase() || "",
        phone: data.phone?.trim() || "",
    };

    // Check if there's an existing approved client with this email/phone
    // This will be used to show overwrite warning during approval
    // If existingApprovedClientId is explicitly provided, use it (for client edits)
    // Otherwise, look it up by email/phone as a fallback
    let existingApprovedClientId: string | undefined = (normalizedData as any).existingApprovedClientId;
    
    // Always do a lookup as well to ensure we catch any matches, even if not explicitly provided
    if (normalizedData.email || normalizedData.phone) {
        const { getApprovedClientByIdentifier } = await import("./client");
        const existingApproved = await getApprovedClientByIdentifier(
            normalizedData.email || undefined,
            normalizedData.phone || undefined
        );
        if (existingApproved) {
            // Use explicitly provided ID if available, otherwise use the lookup result
            if (!existingApprovedClientId) {
                existingApprovedClientId = existingApproved.id;
            } else if (existingApprovedClientId !== existingApproved.id) {
                // If explicitly provided ID doesn't match lookup, log a warning but use explicit one
                console.warn("Mismatch between explicit existingApprovedClientId and lookup result:", {
                    explicit: existingApprovedClientId,
                    lookup: existingApproved.id
                });
            }
        }
    }
    
    console.log("createPendingClient - Final existingApprovedClientId:", existingApprovedClientId);

    // Determine source description if not provided
    let sourceDescription = normalizedData.sourceDescription;
    if (!sourceDescription) {
        switch (normalizedData.source) {
            case "client_form":
                sourceDescription = existingApprovedClientId 
                    ? "Resubmitted by client via form link (will overwrite approved profile)"
                    : "Submitted by client via form link";
                break;
            case "whatsapp":
                sourceDescription = "Extracted from WhatsApp images";
                break;
            case "admin_ai_draft":
                sourceDescription = "AI-generated form by admin";
                break;
            case "admin_manual":
            default:
                sourceDescription = "Manually created by admin";
                break;
        }
    }

    // Ensure existingApprovedClientId is preserved (it might be in normalizedData already)
    const finalExistingApprovedClientId = existingApprovedClientId || (normalizedData as any).existingApprovedClientId;
    
    const newPendingClient = new PendingModel({
        ...normalizedData,
        submittedAt: normalizedData.submittedAt || new Date().toISOString(),
        createdAt: new Date().toISOString().split("T")[0],
        source: normalizedData.source || "admin_manual",
        sourceDescription,
        existingApprovedClientId: finalExistingApprovedClientId,
    });

    console.log("Creating pending client with existingApprovedClientId:", finalExistingApprovedClientId);
    console.log("Pending client model data before save:", {
        email: newPendingClient.email,
        phone: newPendingClient.phone,
        existingApprovedClientId: (newPendingClient as any).existingApprovedClientId
    });
    
    const saved = await newPendingClient.save();
    const savedDoc = saved.toObject();
    console.log("Saved pending client with _id:", saved._id, "existingApprovedClientId:", (savedDoc as any).existingApprovedClientId);
    console.log("Full saved document keys:", Object.keys(savedDoc));
    const { _id, __v, ...rest } = saved.toObject();

    return {
        ...rest,
        id: saved.id,
    } as PendingClientInput & { id: string };
  } catch (error: any) {
    console.error("createPendingClient FAILED:", error?.message, error?.stack);
    console.error("Input data keys:", Object.keys(data));
    console.error("Input data snapshot:", JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        dob: data.dob,
        gender: data.gender,
        source: data.source,
    }));
    throw error;
  }
}

export async function approvePendingClient(pendingClientId: string, overwriteExisting: boolean = false): Promise<Client> {
    const user = await requireAuth();

    if (!isValidObjectId(pendingClientId)) {
        throw new Error("Invalid pending client ID");
    }

    const conn = await dbConnect(user.dbName);
    const PendingModel = getPendingClientModel(conn);

    const pendingClient = await PendingModel.findById(pendingClientId);
    if (!pendingClient) {
        throw new Error("Pending client not found");
    }

    const pendingData = pendingClient.toObject();
    let existingApprovedClientId = (pendingData as any).existingApprovedClientId;
    
    console.log("Approving pending client:", {
        pendingClientId,
        existingApprovedClientId,
        overwriteExisting,
        email: pendingData.email,
        phone: pendingData.phone,
        allKeys: Object.keys(pendingData)
    });
    
    // If existingApprovedClientId is not found in document, try lookup by email/phone as fallback
    if (!existingApprovedClientId && (pendingData.email || pendingData.phone)) {
        console.log("existingApprovedClientId not found in document, trying lookup by email/phone");
        const { getApprovedClientByIdentifier } = await import("./client");
        const existingApproved = await getApprovedClientByIdentifier(
            pendingData.email || undefined,
            pendingData.phone || undefined
        );
        if (existingApproved) {
            existingApprovedClientId = existingApproved.id;
            console.log("Found existing approved client via lookup:", existingApprovedClientId);
        }
    }
    
    // Convert pending client to regular client (exclude pending-specific fields)
    const { _id, __v, submittedAt, submittedBy, token, existingApprovedClientId: _, source, sourceDescription, ...clientData } = pendingData;
    
    // If there's an existing approved client, update it instead of creating new
    if (existingApprovedClientId) {
        if (!overwriteExisting) {
            // Should not happen if UI is correct, but handle gracefully
            throw new Error("Existing approved client found. Overwrite confirmation required.");
        }
        
        const { updateClient, getClients } = await import("./client");
        
        // Get the existing client to preserve createdAt
        const clients = await getClients();
        const existingClient = clients.find(c => c.id === existingApprovedClientId);
        
        if (!existingClient) {
            throw new Error(`Existing approved client not found with ID: ${existingApprovedClientId}`);
        }
        
        console.log("Updating existing approved client:", existingApprovedClientId);
        
        // Preserve createdAt from existing client, but update all other fields
        const updateData = {
            ...clientData,
            createdAt: existingClient.createdAt, // Preserve original creation date
        } as any;
        
        // Remove id field if it exists in clientData (shouldn't, but be safe)
        delete (updateData as any).id;
        
        await updateClient(existingApprovedClientId, updateData);
        
        // Get the updated client
        const updatedClients = await getClients();
        const updatedClient = updatedClients.find(c => c.id === existingApprovedClientId);
        
        if (!updatedClient) {
            throw new Error("Failed to retrieve updated client");
        }
        
        // Delete the pending client
        await PendingModel.findByIdAndDelete(pendingClientId);
        
        console.log("Successfully updated existing client:", existingApprovedClientId);
        
        revalidatePath("/inbox");
        revalidatePath("/clients");
        revalidatePath("/matching");
        
        return updatedClient;
    }
    
    // Create new client in the main database
    console.log("Creating new client (no existing approved client found)");
    const newClient = await createClient(clientData as any);
    
    // Delete the pending client
    await PendingClientModel.findByIdAndDelete(pendingClientId);
    
    console.log("Successfully created new client:", newClient.id);
    
    revalidatePath("/inbox");
    revalidatePath("/clients");
    revalidatePath("/matching");
    
    return newClient;
}

// Check if pending client will overwrite an existing approved client
export async function willOverwriteApprovedClient(pendingClientId: string): Promise<{ willOverwrite: boolean; existingClientId?: string }> {
    const user = await requireAuth();
    const conn = await dbConnect(user.dbName);
    const PendingModel = getPendingClientModel(conn);

    const pendingClient = await PendingModel.findById(pendingClientId).lean();
    if (!pendingClient) {
        console.log("willOverwriteApprovedClient: Pending client not found:", pendingClientId);
        return { willOverwrite: false };
    }
    
    // Log the entire document to see what fields are present
    console.log("willOverwriteApprovedClient: Full pending client document:", JSON.stringify(pendingClient, null, 2));
    
    const existingApprovedClientId = (pendingClient as any).existingApprovedClientId;
    console.log("willOverwriteApprovedClient: Checking pending client:", {
        pendingClientId,
        existingApprovedClientId,
        email: (pendingClient as any).email,
        phone: (pendingClient as any).phone,
        willOverwrite: !!existingApprovedClientId,
        allKeys: Object.keys(pendingClient as any)
    });
    
    // If existingApprovedClientId is not found, try to look it up by email/phone as fallback
    if (!existingApprovedClientId && ((pendingClient as any).email || (pendingClient as any).phone)) {
        console.log("willOverwriteApprovedClient: existingApprovedClientId not found, trying lookup by email/phone");
        const { getApprovedClientByIdentifier } = await import("./client");
        const existingApproved = await getApprovedClientByIdentifier(
            (pendingClient as any).email || undefined,
            (pendingClient as any).phone || undefined
        );
        if (existingApproved) {
            console.log("willOverwriteApprovedClient: Found existing approved client via lookup:", existingApproved.id);
            return {
                willOverwrite: true,
                existingClientId: existingApproved.id,
            };
        }
    }
    
    return {
        willOverwrite: !!existingApprovedClientId,
        existingClientId: existingApprovedClientId,
    };
}

export async function updatePendingClient(
    pendingClientId: string, 
    updates: Partial<PendingClientInput>
): Promise<PendingClientInput & { id: string }> {
    // Note: This is used by external forms, so we don't require auth here
    // But we validate the ObjectId for security
    
    // Validate ObjectId
    if (!isValidObjectId(pendingClientId)) {
        throw new Error("Invalid pending client ID");
    }
    
    await dbConnect();
    
    // Normalize email and phone if provided
    const normalizedUpdates: any = { ...updates };
    if (updates.email) {
        normalizedUpdates.email = updates.email.trim().toLowerCase();
    }
    if (updates.phone) {
        normalizedUpdates.phone = updates.phone.trim();
    }
    
    // Update submittedAt to current time
    normalizedUpdates.submittedAt = new Date().toISOString();
    
    const updated = await PendingClientModel.findByIdAndUpdate(
        pendingClientId,
        { $set: normalizedUpdates },
        { new: true }
    ).lean();
    
    if (!updated) {
        throw new Error("Pending client not found");
    }
    
    const { _id, __v, ...rest } = updated;
    return {
        ...rest,
        id: _id.toString(),
        religiousAffiliation: updated.religiousAffiliation || [],
        languages: updated.languages || [],
        ageGapPreference: updated.ageGapPreference || [],
        preferredEthnicities: updated.preferredEthnicities || [],
        preferredHashkafos: updated.preferredHashkafos || [],
        preferredLearningStatus: updated.preferredLearningStatus || [],
        preferredHeadCovering: updated.preferredHeadCovering || [],
        formLanguage: updated.formLanguage || "en",
    } as PendingClientInput & { id: string };
}

export async function rejectPendingClient(pendingClientId: string): Promise<void> {
    const user = await requireAuth();

    if (!isValidObjectId(pendingClientId)) {
        throw new Error("Invalid pending client ID");
    }

    const conn = await dbConnect(user.dbName);
    const PendingModel = getPendingClientModel(conn);

    const pendingClient = await PendingModel.findById(pendingClientId);
    if (!pendingClient) {
        throw new Error("Pending client not found");
    }

    const imageUrls = extractImageUrls(pendingClient.toObject());
    if (imageUrls.length > 0) {
        console.log(`[Reject] Deleting ${imageUrls.length} image(s) from Cloudinary for rejected pending client`);
        await deleteCloudinaryImages(imageUrls);
    }

    await PendingModel.findByIdAndDelete(pendingClientId);
    revalidatePath("/inbox");
}

export async function generateFormToken(): Promise<string> {
    const user = await requireAuth();

    await dbConnect();

    const token = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await FormTokenModel.create({
        token,
        expiresAt,
        usageCount: 0,
        maxUsage: 30,
        isActive: true,
        ownerUsername: user.username,
        ownerDbName: user.dbName,
    });

    return token;
}

/**
 * Validate a form token WITHOUT incrementing usage count.
 * Used when the client already validated in this browser session (e.g. page refresh).
 */
export async function validateTokenOnly(token: string): Promise<boolean> {
    await dbConnect();

    const tokenDoc = await FormTokenModel.findOne({ token, isActive: true });
    if (!tokenDoc) return false;
    if (new Date() > tokenDoc.expiresAt) {
        tokenDoc.isActive = false;
        await tokenDoc.save();
        return false;
    }
    if (tokenDoc.usageCount >= tokenDoc.maxUsage) {
        tokenDoc.isActive = false;
        await tokenDoc.save();
        return false;
    }
    return true;
}

/**
 * Validate a form token and increment usage count
 * Returns true if token is valid, false otherwise
 */
export async function validateAndIncrementToken(token: string): Promise<boolean> {
    await dbConnect();
    
    const tokenDoc = await FormTokenModel.findOne({ token, isActive: true });
    
    if (!tokenDoc) {
        return false;
    }
    
    // Check if expired
    if (new Date() > tokenDoc.expiresAt) {
        tokenDoc.isActive = false;
        await tokenDoc.save();
        return false;
    }
    
    // Check if usage limit exceeded
    if (tokenDoc.usageCount >= tokenDoc.maxUsage) {
        tokenDoc.isActive = false;
        await tokenDoc.save();
        return false;
    }
    
    // Increment usage count
    tokenDoc.usageCount += 1;
    await tokenDoc.save();
    
    return true;
}

export async function getPendingClientByToken(token: string): Promise<(PendingClientInput & { id: string }) | null> {
    // Validate token format (should be hex string)
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
        return null;
    }
    
    await dbConnect();
    // Get the most recent pending client with this token (for editing)
    const pendingClient = await PendingClientModel.findOne({ token })
        .sort({ submittedAt: -1 })
        .lean();
    
    if (!pendingClient) {
        return null;
    }
    
    const { _id, __v, ...rest } = pendingClient;
    return {
        ...rest,
        id: _id.toString(),
        religiousAffiliation: pendingClient.religiousAffiliation || [],
        languages: pendingClient.languages || [],
        ageGapPreference: pendingClient.ageGapPreference || [],
        preferredEthnicities: pendingClient.preferredEthnicities || [],
        preferredHashkafos: pendingClient.preferredHashkafos || [],
        preferredLearningStatus: pendingClient.preferredLearningStatus || [],
        preferredHeadCovering: pendingClient.preferredHeadCovering || [],
        formLanguage: pendingClient.formLanguage || "en",
    } as PendingClientInput & { id: string };
}

export async function getPendingClientByTokenAndIdentifier(
    token: string, 
    email?: string, 
    phone?: string
): Promise<(PendingClientInput & { id: string }) | null> {
    // Validate token format
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
        return null;
    }
    
    // Sanitize inputs
    const { sanitizeInput, isValidEmail, isValidPhone } = await import("@/lib/validation");
    
    let sanitizedEmail: string | undefined;
    let sanitizedPhone: string | undefined;
    
    if (email) {
        sanitizedEmail = sanitizeInput(email.trim().toLowerCase(), 255);
        if (!isValidEmail(sanitizedEmail)) {
            return null;
        }
    }
    
    if (phone) {
        sanitizedPhone = sanitizeInput(phone.trim(), 50);
        if (!isValidPhone(sanitizedPhone)) {
            return null;
        }
    }
    
    if (!sanitizedEmail && !sanitizedPhone) {
        return null;
    }
    
    await dbConnect();
    
    // Build query: must match token AND (email OR phone)
    const query: any = { token };
    
    if (sanitizedEmail) {
        query.email = sanitizedEmail;
    } else if (sanitizedPhone) {
        query.phone = sanitizedPhone;
    }
    
    // Get the most recent pending client matching token + identifier
    const pendingClient = await PendingClientModel.findOne(query)
        .sort({ submittedAt: -1 })
        .lean();
    
    if (!pendingClient) {
        return null;
    }
    
    const { _id, __v, ...rest } = pendingClient;
    return {
        ...rest,
        id: _id.toString(),
        religiousAffiliation: pendingClient.religiousAffiliation || [],
        languages: pendingClient.languages || [],
        ageGapPreference: pendingClient.ageGapPreference || [],
        preferredEthnicities: pendingClient.preferredEthnicities || [],
        preferredHashkafos: pendingClient.preferredHashkafos || [],
        preferredLearningStatus: pendingClient.preferredLearningStatus || [],
        preferredHeadCovering: pendingClient.preferredHeadCovering || [],
        formLanguage: pendingClient.formLanguage || "en",
    } as PendingClientInput & { id: string };
}

/**
 * Normalize phone number for consistent matching
 * Removes spaces, dashes, parentheses, and handles country codes
 */
function normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Handle Israeli numbers: convert 05X-XXXXXXX to +9725X-XXXXXXX
    if (normalized.startsWith('05') && normalized.length === 10) {
        normalized = '+972' + normalized.substring(1);
    }
    // Handle numbers starting with 0 (Israeli) - convert to +972
    else if (normalized.startsWith('0') && normalized.length === 10) {
        normalized = '+972' + normalized.substring(1);
    }
    // If it's already in +972 format, keep it
    else if (normalized.startsWith('+972')) {
        // Already normalized
    }
    // If it starts with 972 (without +), add +
    else if (normalized.startsWith('972') && normalized.length >= 12) {
        normalized = '+' + normalized;
    }
    
    return normalized;
}

// Find pending client by email OR phone only (no token required)
export async function getPendingClientByIdentifier(
    email?: string, 
    phone?: string
): Promise<(PendingClientInput & { id: string }) | null> {
    // Sanitize inputs
    const { sanitizeInput, isValidEmail, isValidPhone } = await import("@/lib/validation");
    
    let sanitizedEmail: string | undefined;
    let sanitizedPhone: string | undefined;
    let normalizedPhone: string | undefined;
    
    if (email) {
        sanitizedEmail = sanitizeInput(email.trim().toLowerCase(), 255);
        // Basic email validation
        if (!isValidEmail(sanitizedEmail)) {
            return null;
        }
    }
    
    if (phone) {
        sanitizedPhone = sanitizeInput(phone.trim(), 50);
        // Basic phone validation
        if (!isValidPhone(sanitizedPhone)) {
            return null;
        }
        // Normalize phone for better matching
        normalizedPhone = normalizePhone(sanitizedPhone);
    }
    
    if (!sanitizedEmail && !sanitizedPhone) {
        return null;
    }
    
    await dbConnect();
    
    // Build query: match by email OR phone (improved matching)
    const query: any = {
        $or: []
    };
    
    if (sanitizedEmail) {
        query.$or.push({ email: sanitizedEmail });
    }
    
    if (sanitizedPhone) {
        // Extract just the digits for flexible matching
        const phoneDigits = sanitizedPhone.replace(/\D/g, '');
        
        // Try exact match with normalized phone
        if (normalizedPhone) {
            query.$or.push({ phone: normalizedPhone });
        }
        // Try exact match with original phone
        query.$or.push({ phone: sanitizedPhone });
        // Try matching with common phone formats (handles formatting differences)
        // For Israeli numbers: try 05X-XXX-XXXX, 05X-XXXXXXX, 05XXXXXXXXX, +9725X-XXX-XXXX
        if (phoneDigits.length >= 9) {
            // Try with dashes: 050-123-4567
            if (phoneDigits.length === 10 && phoneDigits.startsWith('05')) {
                const formatted = `${phoneDigits.substring(0, 3)}-${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6)}`;
                query.$or.push({ phone: formatted });
                const formatted2 = `${phoneDigits.substring(0, 3)}-${phoneDigits.substring(3)}`;
                query.$or.push({ phone: formatted2 });
            }
            // Try digits only: 0501234567
            query.$or.push({ phone: phoneDigits });
            // Try with +972 prefix
            if (phoneDigits.startsWith('05') && phoneDigits.length === 10) {
                const intlFormat = '+972' + phoneDigits.substring(1);
                query.$or.push({ phone: intlFormat });
            }
        }
    }
    
    // Get the most recent pending client matching identifier
    const pendingClient = await PendingClientModel.findOne(query)
        .sort({ submittedAt: -1 })
        .lean();
    
    if (!pendingClient) {
        return null;
    }
    
    const { _id, __v, ...rest } = pendingClient;
    return {
        ...rest,
        id: _id.toString(),
        religiousAffiliation: pendingClient.religiousAffiliation || [],
        languages: pendingClient.languages || [],
        ageGapPreference: pendingClient.ageGapPreference || [],
        preferredEthnicities: pendingClient.preferredEthnicities || [],
        preferredHashkafos: pendingClient.preferredHashkafos || [],
        preferredLearningStatus: pendingClient.preferredLearningStatus || [],
        preferredHeadCovering: pendingClient.preferredHeadCovering || [],
        formLanguage: pendingClient.formLanguage || "en",
    } as PendingClientInput & { id: string };
}

export async function getAllPendingClientsByToken(token: string): Promise<(PendingClientInput & { id: string })[]> {
    // Validate token format (should be hex string)
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
        return [];
    }
    
    await dbConnect();
    // Get all pending clients with this token (for viewing submission history)
    const pendingClients = await PendingClientModel.find({ token })
        .sort({ submittedAt: -1 })
        .lean();
    
    return pendingClients.map((doc: any) => {
        const { _id, __v, ...rest } = doc;
        return {
            ...rest,
            id: _id.toString(),
            religiousAffiliation: doc.religiousAffiliation || [],
            languages: doc.languages || [],
            ageGapPreference: doc.ageGapPreference || [],
            preferredEthnicities: doc.preferredEthnicities || [],
            preferredHashkafos: doc.preferredHashkafos || [],
            preferredLearningStatus: doc.preferredLearningStatus || [],
            preferredHeadCovering: doc.preferredHeadCovering || [],
            formLanguage: doc.formLanguage || "en",
        } as PendingClientInput & { id: string };
    });
}

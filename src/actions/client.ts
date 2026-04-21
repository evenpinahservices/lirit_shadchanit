"use server";

import dbConnect from "@/lib/db";
import { getClientModel } from "@/models/Client";
import { Client, generateMockClients } from "@/lib/mockData";
import { revalidatePath } from "next/cache";
import { requireAuth, getCurrentUser } from "@/lib/serverAuth";
import { isValidObjectId } from "@/lib/validation";

// Type definition for Client Input (excluding auto-generated fields)
type ClientInput = Omit<Client, "id" | "createdAt">;

function mapDoc(doc: any): Client {
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
    } as Client;
}

export async function getClients(): Promise<Client[]> {
    try {
        const user = await getCurrentUser();
        const conn = await dbConnect(user?.dbName);
        const ClientModel = getClientModel(conn);
        const clients = await ClientModel.find({}).sort({ createdAt: -1 }).lean();
        return clients.map(mapDoc);
    } catch (error: any) {
        console.error("Error in getClients:", error);
        throw new Error(error?.message || "Failed to fetch clients");
    }
}

export async function createClient(data: ClientInput): Promise<Client> {
    const user = await requireAuth();
    const conn = await dbConnect(user.dbName);
    const ClientModel = getClientModel(conn);

    const newClient = new ClientModel({
        ...data,
        createdAt: new Date().toISOString().split("T")[0],
    });

    const saved = await newClient.save();
    const { _id, __v, ...rest } = saved.toObject();

    return {
        ...rest,
        id: saved.id,
    } as Client;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<void> {
    const user = await requireAuth();

    if (!isValidObjectId(id)) {
        throw new Error("Invalid client ID");
    }

    const conn = await dbConnect(user.dbName);
    const ClientModel = getClientModel(conn);
    const { id: _, createdAt: __, ...updateData } = updates;
    await ClientModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    revalidatePath("/clients");
    revalidatePath("/matching");
    revalidatePath("/inbox");
}

export async function deleteClient(id: string): Promise<void> {
    const user = await requireAuth();

    if (!isValidObjectId(id)) {
        throw new Error("Invalid client ID");
    }

    const conn = await dbConnect(user.dbName);
    const ClientModel = getClientModel(conn);

    const client = await ClientModel.findById(id);
    if (!client) {
        throw new Error("Client not found");
    }

    const { deleteCloudinaryImages, extractImageUrls } = await import("@/lib/cloudinaryCleanup");
    const imageUrls = extractImageUrls(client.toObject());
    if (imageUrls.length > 0) {
        console.log(`[Delete] Deleting ${imageUrls.length} image(s) from Cloudinary for deleted client`);
        await deleteCloudinaryImages(imageUrls);
    }

    await ClientModel.findByIdAndDelete(id);
    revalidatePath("/clients");
}

export async function seedDatabase(count: number = 10): Promise<void> {
    const user = await requireAuth();
    const conn = await dbConnect(user.dbName);
    const ClientModel = getClientModel(conn);
    const clients = generateMockClients(count);
    for (const client of clients) {
        const { id, createdAt, ...data } = client;
        const newClient = new ClientModel({ ...data, createdAt: new Date().toISOString().split("T")[0] });
        await newClient.save();
    }
    revalidatePath("/clients");
    revalidatePath("/matching");
}

export async function resetAndSeedDatabase(count: number = 100): Promise<void> {
    const user = await requireAuth();
    const conn = await dbConnect(user.dbName);
    const ClientModel = getClientModel(conn);
    await ClientModel.deleteMany({});
    const clients = generateMockClients(count);
    for (const client of clients) {
        const { id, createdAt, ...data } = client;
        const newClient = new ClientModel({ ...data, createdAt: new Date().toISOString().split("T")[0] });
        await newClient.save();
    }
    revalidatePath("/clients");
    revalidatePath("/matching");
    revalidatePath("/search");
}

export async function deleteAllExceptBatEl(): Promise<void> {
    const user = await requireAuth();
    const conn = await dbConnect(user.dbName);
    const ClientModel = getClientModel(conn);
    await ClientModel.deleteMany({ fullName: { $not: /בת אל/ } });
    revalidatePath("/clients");
    revalidatePath("/matching");
    revalidatePath("/search");
}

function normalizePhone(phone: string): string {
    let normalized = phone.replace(/[^\d+]/g, '');
    if (normalized.startsWith('05') && normalized.length === 10) {
        normalized = '+972' + normalized.substring(1);
    } else if (normalized.startsWith('0') && normalized.length === 10) {
        normalized = '+972' + normalized.substring(1);
    } else if (normalized.startsWith('972') && normalized.length >= 12) {
        normalized = '+' + normalized;
    }
    return normalized;
}

// Find approved client by email OR phone (for external form editing) — always uses main DB
export async function getApprovedClientByIdentifier(
    email?: string,
    phone?: string
): Promise<Client | null> {
    const { sanitizeInput, isValidEmail, isValidPhone } = await import("@/lib/validation");

    let sanitizedEmail: string | undefined;
    let sanitizedPhone: string | undefined;
    let normalizedPhone: string | undefined;

    if (email) {
        sanitizedEmail = sanitizeInput(email.trim().toLowerCase(), 255);
        if (!isValidEmail(sanitizedEmail)) return null;
    }

    if (phone) {
        sanitizedPhone = sanitizeInput(phone.trim(), 50);
        if (!isValidPhone(sanitizedPhone)) return null;
        normalizedPhone = normalizePhone(sanitizedPhone);
    }

    if (!sanitizedEmail && !sanitizedPhone) return null;

    // Always use the main DB for public form lookups
    const conn = await dbConnect();
    const ClientModel = getClientModel(conn);

    const query: any = { $or: [] };

    if (sanitizedEmail) {
        query.$or.push({ email: sanitizedEmail });
    }

    if (sanitizedPhone) {
        const phoneDigits = sanitizedPhone.replace(/\D/g, '');
        if (normalizedPhone) query.$or.push({ phone: normalizedPhone });
        query.$or.push({ phone: sanitizedPhone });
        if (phoneDigits.length >= 9) {
            if (phoneDigits.length === 10 && phoneDigits.startsWith('05')) {
                query.$or.push({ phone: `${phoneDigits.substring(0, 3)}-${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6)}` });
                query.$or.push({ phone: `${phoneDigits.substring(0, 3)}-${phoneDigits.substring(3)}` });
            }
            query.$or.push({ phone: phoneDigits });
            if (phoneDigits.startsWith('05') && phoneDigits.length === 10) {
                query.$or.push({ phone: '+972' + phoneDigits.substring(1) });
            }
        }
    }

    const client = await ClientModel.findOne(query).sort({ createdAt: -1 }).lean();
    if (!client) return null;
    return mapDoc(client);
}

"use server";

import dbConnect from "@/lib/db";
import ClientModel from "@/models/Client";
import { Client, MOCK_CLIENTS, generateMockClients } from "@/lib/mockData";
import { revalidatePath } from "next/cache";

// Type definition for Client Input (excluding auto-generated fields)
type ClientInput = Omit<Client, "id" | "createdAt">;

export async function getClients(): Promise<Client[]> {
    try {
        await dbConnect();
        // We need to map _id to id string, which our Virtual does, 
        // but for Server Actions serialization we often need to be explicit with `lean()` or JSON parsing
        const clients = await ClientModel.find({}).sort({ createdAt: -1 }).lean();

        return clients.map((doc: any) => {
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
                // Ensure formLanguage is included
                formLanguage: doc.formLanguage || "en",
            } as Client;
        });
    } catch (error: any) {
        console.error("Error in getClients:", error);
        // Re-throw with a more descriptive error message for the client
        const errorMessage = error?.message || "Failed to fetch clients";
        throw new Error(errorMessage);
    }
}

export async function createClient(data: ClientInput): Promise<Client> {
    await dbConnect();

    const newClient = new ClientModel({
        ...data,
        createdAt: new Date().toISOString().split("T")[0],
    });

    const saved = await newClient.save();
    // Uses virtuals to get 'id', but we need to strip internal fields and match Client interface
    const { _id, __v, ...rest } = saved.toObject();

    return {
        ...rest,
        id: saved.id,
    } as Client;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<void> {
    await dbConnect();
    // Use $set to ensure all fields are properly updated
    // Exclude id and createdAt from updates to preserve them
    const { id: _, createdAt: __, ...updateData } = updates;
    await ClientModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    revalidatePath("/clients");
    revalidatePath("/matching");
    revalidatePath("/inbox");
}

export async function deleteClient(id: string): Promise<void> {
    await dbConnect();
    
    // Get the client before deleting to extract image URLs
    const client = await ClientModel.findById(id);
    if (!client) {
        throw new Error("Client not found");
    }

    // Extract and delete images from Cloudinary
    const { deleteCloudinaryImages, extractImageUrls } = await import("@/lib/cloudinaryCleanup");
    const imageUrls = extractImageUrls(client.toObject());
    if (imageUrls.length > 0) {
        console.log(`[Delete] Deleting ${imageUrls.length} image(s) from Cloudinary for deleted client`);
        await deleteCloudinaryImages(imageUrls);
    }

    // Delete from MongoDB
    await ClientModel.findByIdAndDelete(id);
    revalidatePath("/clients");
}

export async function seedDatabase(count: number = 10): Promise<void> {
    await dbConnect();
    const clients = generateMockClients(count);
    for (const client of clients) {
        const { id, createdAt, ...data } = client;
        await createClient(data);
    }
    revalidatePath("/clients");
    revalidatePath("/matching");
}

export async function resetAndSeedDatabase(count: number = 100): Promise<void> {
    await dbConnect();
    // Delete all existing clients
    await ClientModel.deleteMany({});
    // Generate and insert new clients
    const clients = generateMockClients(count);
    for (const client of clients) {
        const { id, createdAt, ...data } = client;
        await createClient(data);
    }
    revalidatePath("/clients");
    revalidatePath("/matching");
    revalidatePath("/search");
}

export async function deleteAllExceptBatEl(): Promise<void> {
    await dbConnect();
    // Delete all clients except those with fullName containing "בת אל"
    const result = await ClientModel.deleteMany({
        fullName: { $not: /בת אל/ }
    });
    revalidatePath("/clients");
    revalidatePath("/matching");
    revalidatePath("/search");
    return;
}
// Find approved client by email OR phone (for external form editing)
export async function getApprovedClientByIdentifier(
    email?: string,
    phone?: string
): Promise<Client | null> {
    await dbConnect();
    const query: any = {};
    if (email && email.trim()) {
        query.email = email.trim().toLowerCase();
    } else if (phone && phone.trim()) {
        query.phone = phone.trim();
    } else {
        return null;
    }
    const client = await ClientModel.findOne(query).sort({ createdAt: -1 }).lean();
    if (!client) return null;
    const { _id, __v, ...rest } = client;
    return {
        ...rest,
        id: _id.toString(),
        religiousAffiliation: client.religiousAffiliation || [],
        languages: client.languages || [],
        ageGapPreference: client.ageGapPreference || [],
        preferredEthnicities: client.preferredEthnicities || [],
        preferredHashkafos: client.preferredHashkafos || [],
        preferredLearningStatus: client.preferredLearningStatus || [],
        preferredHeadCovering: client.preferredHeadCovering || [],
        formLanguage: client.formLanguage || "en",
    } as Client;
}

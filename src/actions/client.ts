"use server";

import dbConnect from "@/lib/db";
import ClientModel from "@/models/Client";
import { Client, MOCK_CLIENTS, generateMockClients } from "@/lib/mockData";
import { revalidatePath } from "next/cache";

// Type definition for Client Input (excluding auto-generated fields)
type ClientInput = Omit<Client, "id" | "createdAt">;

export async function getClients(): Promise<Client[]> {
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
        } as Client;
    });
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
    await ClientModel.findByIdAndUpdate(id, updates);
    revalidatePath("/clients");
    revalidatePath("/matching");
}

export async function deleteClient(id: string): Promise<void> {
    await dbConnect();
    await ClientModel.findByIdAndDelete(id);
    revalidatePath("/clients");
}

export async function seedTestClient(): Promise<void> {
    await dbConnect();
    const existing = await ClientModel.findOne({ email: "test.long@example.com" });
    if (!existing) {
        const testClient = MOCK_CLIENTS.find(c => c.email === "test.long@example.com");
        if (testClient) {
            const { id, createdAt, ...data } = testClient;
            await createClient(data);
            revalidatePath("/matching");
        }
    }
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

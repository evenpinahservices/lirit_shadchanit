import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ClientModel from "@/models/Client";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        // Delete all clients except those with fullName containing "בת אל"
        const result = await ClientModel.deleteMany({
            fullName: { $not: /בת אל/ }
        });
        revalidatePath("/clients");
        revalidatePath("/matching");
        revalidatePath("/search");
        return NextResponse.json({ 
            success: true, 
            message: `Deleted ${result.deletedCount} clients. Kept clients with "בת אל" in name.` 
        });
    } catch (error: any) {
        console.error("Error deleting clients:", error);
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || "Failed to delete clients" 
            },
            { status: 500 }
        );
    }
}

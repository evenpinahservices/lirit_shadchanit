import { NextRequest, NextResponse } from "next/server";
import { deleteAllExceptBatEl } from "@/actions/client";

export async function POST(request: NextRequest) {
    try {
        await deleteAllExceptBatEl();
        return NextResponse.json({ 
            success: true, 
            message: "All clients deleted except בת אל" 
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

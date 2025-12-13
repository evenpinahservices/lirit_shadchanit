"use client";

import { ClientForm } from "@/components/clients/ClientForm";

export default function NewClientPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Add New Client</h1>
                <p className="text-muted-foreground">Enter the details for the new client profile.</p>
            </div>
            <ClientForm />
        </div>
    );
}

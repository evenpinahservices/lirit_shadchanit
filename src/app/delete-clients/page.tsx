"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteClientsPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Deleting clients...");

    useEffect(() => {
        const deleteClients = async () => {
            try {
                const response = await fetch("/api/clients/delete-all-except-bat-el", {
                    method: "POST",
                });
                const result = await response.json();
                if (result.success) {
                    setStatus(`Success! ${result.message}`);
                    setTimeout(() => {
                        router.push("/clients");
                    }, 2000);
                } else {
                    setStatus(`Error: ${result.error}`);
                }
            } catch (error: any) {
                setStatus(`Error: ${error.message}`);
            }
        };

        deleteClients();
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">{status}</h1>
                {status.includes("Success") && (
                    <p className="text-gray-600">Redirecting to clients page...</p>
                )}
            </div>
        </div>
    );
}

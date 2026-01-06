"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Client } from "@/lib/mockData";
import {
    getClients,
    createClient,
    updateClient as serverUpdateClient,
    deleteClient as serverDeleteClient
} from "@/actions/client";
import { uploadImage as serverUploadImage } from "@/actions/upload";

interface ClientContextType {
    clients: Client[];
    isLoading: boolean;
    isUploading: boolean;
    error: string | null;
    addClient: (client: Omit<Client, "id" | "createdAt">) => Promise<Client>;
    updateClient: (id: string, client: Partial<Client>) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;
    uploadImage: (file: File) => Promise<{ url: string | null; error: string | null }>;
    getClient: (id: string) => Client | undefined;
    clearError: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch from DB on mount
        const fetchClients = async () => {
            try {
                setError(null);
                console.log("Attempting to fetch clients...");
                const data = await getClients();
                console.log("Clients fetched successfully:", data.length);
                setClients(data);
            } catch (err: any) {
                console.error("Failed to fetch clients - Full error:", err);
                console.error("Error type:", typeof err);
                console.error("Error keys:", Object.keys(err || {}));
                
                // Extract error message from various error formats
                let errorMessage = "Failed to fetch clients";
                
                // Check for network errors first
                if (err?.name === "TypeError" && err?.message?.includes("fetch")) {
                    errorMessage = "Network error: Cannot reach server. Please check if the development server is running.";
                } else if (err?.message) {
                    errorMessage = err.message;
                } else if (typeof err === 'string') {
                    errorMessage = err;
                } else if (err?.error?.message) {
                    errorMessage = err.error.message;
                } else if (err?.toString) {
                    errorMessage = err.toString();
                } else if (err?.stack) {
                    errorMessage = `Server error: ${err.stack.split('\n')[0]}`;
                }
                
                // Add helpful context
                if (errorMessage.includes("MONGODB_URI")) {
                    errorMessage = "Database connection not configured. Please set MONGODB_URI in .env.local";
                } else if (errorMessage.includes("connect") || errorMessage.includes("connection")) {
                    errorMessage = "Cannot connect to database. Please check your MongoDB connection string.";
                } else if (errorMessage.includes("fetch") || errorMessage.includes("Network")) {
                    errorMessage = "Network error: Make sure the Next.js development server is running on port 3000.";
                }
                
                setError(errorMessage);
                // Set empty array on error to prevent crashes
                setClients([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClients();
    }, []);

    const clearError = () => {
        setError(null);
    };

    const addClient = async (clientData: Omit<Client, "id" | "createdAt">) => {
        const newClient = await createClient(clientData);
        setClients((prev) => [newClient, ...prev]);
        return newClient;
    };

    const updateClient = async (id: string, updates: Partial<Client>) => {
        await serverUpdateClient(id, updates);
        setClients((prev) =>
            prev.map((client) => (client.id === id ? { ...client, ...updates } : client))
        );
    };

    const deleteClient = async (id: string) => {
        await serverDeleteClient(id);
        setClients((prev) => prev.filter((client) => client.id !== id));
    };

    const uploadImage = async (file: File): Promise<{ url: string | null; error: string | null }> => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<{ url: string | null; error: string | null }>((_, reject) => {
                setTimeout(() => reject(new Error("Upload timeout - server did not respond")), 65000); // 65 second timeout
            });

            const uploadPromise = serverUploadImage(formData);
            
            const result = await Promise.race([uploadPromise, timeoutPromise]);
            return result;
        } catch (err: any) {
            console.error("Upload error in context:", err);
            let errorMessage = "Upload failed. Please try again.";
            
            if (err?.message) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            
            // Check for connection errors
            if (errorMessage.includes("timeout") || errorMessage.includes("ERR_CONNECTION_RESET")) {
                errorMessage = "Server connection lost. Please check if the development server is running and try again.";
            }
            
            return { url: null, error: errorMessage };
        } finally {
            setIsUploading(false);
        }
    };

    const getClient = (id: string) => {
        return clients.find((client) => client.id === id);
    };

    return (
        <ClientContext.Provider value={{ clients, isLoading, isUploading, error, addClient, updateClient, deleteClient, uploadImage, getClient, clearError }}>
            {children}
        </ClientContext.Provider>
    );
}

export function useClients() {
    const context = useContext(ClientContext);
    if (context === undefined) {
        throw new Error("useClients must be used within a ClientProvider");
    }
    return context;
}

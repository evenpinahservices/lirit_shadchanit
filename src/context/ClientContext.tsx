"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Client } from "@/lib/mockData";
import {
    getClients,
    createClient,
    updateClient as serverUpdateClient,
    deleteClient as serverDeleteClient
} from "@/actions/client";

interface ClientContextType {
    clients: Client[];
    isLoading: boolean;
    addClient: (client: Omit<Client, "id" | "createdAt">) => Promise<Client>;
    updateClient: (id: string, client: Partial<Client>) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;
    getClient: (id: string) => Client | undefined;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch from DB on mount
        const fetchClients = async () => {
            try {
                const data = await getClients();
                setClients(data);
            } catch (err) {
                console.error("Failed to fetch clients", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClients();
    }, []);

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

    const getClient = (id: string) => {
        return clients.find((client) => client.id === id);
    };

    return (
        <ClientContext.Provider value={{ clients, isLoading, addClient, updateClient, deleteClient, getClient }}>
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

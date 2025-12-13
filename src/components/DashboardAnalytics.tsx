"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList,
} from "recharts";
import { useClients } from "@/context/ClientContext";

export default function DashboardAnalytics() {
    const { clients } = useClients();

    // Calculate Total Clients
    const totalClients = clients.length;

    // Calculate Gender Distribution
    const genderCounts = clients.reduce((acc, client) => {
        const gender = client.gender || "Other";
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const genderData = [
        { name: "Male", count: genderCounts["Male"] || 0 },
        { name: "Female", count: genderCounts["Female"] || 0 },
    ];

    // Calculate Age Distribution
    const calculateAge = (dob: string) => {
        if (!dob) return 0;
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const ageGroups = {
        "18-20": 0,
        "21-25": 0,
        "25-30": 0,
        "30-40": 0,
        "40+": 0,
    };

    clients.forEach((client) => {
        const age = calculateAge(client.dob);
        if (age >= 18 && age <= 20) ageGroups["18-20"]++;
        else if (age >= 21 && age <= 25) ageGroups["21-25"]++;
        else if (age >= 26 && age <= 30) ageGroups["25-30"]++;
        else if (age >= 31 && age <= 40) ageGroups["30-40"]++;
        else if (age > 40) ageGroups["40+"]++;
    });

    const ageData = Object.entries(ageGroups).map(([name, count]) => ({ name, count }));

    return (
        <div className="space-y-6">
            {/* Total Clients Card */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">
                        Total Clients
                    </div>
                    <div className="text-2xl font-bold">{totalClients}</div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Gender Distribution Chart */}
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="mb-4 text-lg font-medium">Gender Distribution</div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={genderData} margin={{ top: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Legend />
                                <Bar dataKey="count" name="Clients" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="count" position="insideTop" fill="white" fontSize={14} fontWeight="bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Age Distribution Histogram */}
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="mb-4 text-lg font-medium">Age Distribution</div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageData} margin={{ top: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Legend />
                                <Bar dataKey="count" name="Clients" fill="#82ca9d" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="count" position="insideTop" fill="white" fontSize={14} fontWeight="bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

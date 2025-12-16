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
import { useState } from "react";
import { ChevronLeft, ChevronRight, Circle, CircleDot } from "lucide-react";

export default function DashboardAnalytics() {
    const { clients } = useClients();
    const [currentSlide, setCurrentSlide] = useState(0);

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

    const charts = [
        {
            title: "Gender Distribution",
            component: (
                <div className="h-full w-full pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={genderData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Bar dataKey="count" name="Clients" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="count" position="insideTop" fill="white" fontSize={14} fontWeight="bold" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            title: "Age Distribution",
            component: (
                <div className="h-full w-full pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Bar dataKey="count" name="Clients" fill="#82ca9d" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="count" position="insideTop" fill="white" fontSize={14} fontWeight="bold" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )
        }
    ];

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % charts.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + charts.length) % charts.length);
    };

    // Touch Handling
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null); // Reset
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSlide();
        }
        if (isRightSwipe) {
            prevSlide();
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Total Clients Card - Fixed Top */}
            <div className="shrink-0 rounded-xl border bg-card text-card-foreground shadow p-6">
                <div className="text-sm font-medium text-muted-foreground">
                    Total Clients
                </div>
                <div className="text-2xl font-bold">{totalClients}</div>
            </div>

            {/* Carousel Area */}
            <div
                className="flex-1 min-h-0 flex flex-col rounded-xl border bg-card text-card-foreground shadow p-4 relative"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="mb-2 text-lg font-medium text-center">{charts[currentSlide].title}</div>

                <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                    {charts[currentSlide].component}
                </div>

                {/* Navigation Controls */}
                <div className="mt-4 flex items-center justify-between px-4">
                    <button onClick={prevSlide} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                    </button>

                    <div className="flex gap-2">
                        {charts.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className="text-primary transition-colors"
                            >
                                {currentSlide === idx ? (
                                    <CircleDot className="h-4 w-4 fill-current" />
                                ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>
                        ))}
                    </div>

                    <button onClick={nextSlide} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronRight className="h-6 w-6 text-muted-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
}

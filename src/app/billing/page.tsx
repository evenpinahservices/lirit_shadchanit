"use client";

import { useState, useEffect } from "react";
import { Calendar, DollarSign, MessageSquare, TrendingUp, Download } from "lucide-react";

interface CostData {
    totalCost: string;
    currency: string;
    totalMessages: number;
    totalProfiles: number;
    averageCostPerProfile: string;
    dateRange: {
        start: string;
        end: string;
    };
    breakdown: Array<{
        profileId: string;
        cost: string;
        messageCount: number;
    }>;
}

interface EstimateData {
    pricing: {
        inboundText: number;
        inboundMedia: number;
        outboundText: number;
        outboundMedia: number;
        template: number;
    };
    estimatedCostPerProfile: {
        images: number;
        textMessages: number;
        costBreakdown: {
            inboundMedia: number;
            inboundText: number;
            outboundText: number;
            total: number;
        };
        totalCost: string;
    };
    note: string;
}

export default function BillingPage() {
    const [costData, setCostData] = useState<CostData | null>(null);
    const [estimateData, setEstimateData] = useState<EstimateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
        end: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load estimates
            const estimateRes = await fetch("/api/whatsapp/cost-calculator", {
                credentials: "include", // Include cookies for authentication
            });
            const estimate = await estimateRes.json();
            setEstimateData(estimate);

            // Load actual costs
            const costRes = await fetch(
                `/api/whatsapp/cost-calculator?all=true&startDate=${dateRange.start}&endDate=${dateRange.end}`,
                {
                    credentials: "include", // Include cookies for authentication
                }
            );
            const costs = await costRes.json();
            setCostData(costs);
        } catch (error) {
            console.error("Failed to load billing data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateRangeChange = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/whatsapp/cost-calculator?all=true&startDate=${dateRange.start}&endDate=${dateRange.end}`,
                {
                    credentials: "include", // Include cookies for authentication
                }
            );
            const data = await res.json();
            setCostData(data);
        } catch (error) {
            console.error("Failed to load costs:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !costData) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center">Loading billing data...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Twilio WhatsApp Billing</h1>
                    <p className="text-gray-600 mt-2">Track costs for profile uploads via WhatsApp</p>
                </div>
                <button
                    onClick={loadData}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Date Range
                </h2>
                <div className="flex gap-4 items-end">
                    <div className="flex gap-4 items-end">
                        <div>
                            <label className="text-sm font-medium">Start Date</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">End Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                        </div>
                        <button
                            onClick={handleDateRangeChange}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>

            {/* Cost Summary */}
            {costData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Total Cost</h3>
                            <DollarSign className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold">${costData.totalCost}</div>
                        <p className="text-xs text-gray-500 mt-1">{costData.currency}</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Total Messages</h3>
                            <MessageSquare className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold">{costData.totalMessages}</div>
                        <p className="text-xs text-gray-500 mt-1">messages sent/received</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Total Profiles</h3>
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold">{costData.totalProfiles}</div>
                        <p className="text-xs text-gray-500 mt-1">profiles processed</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Avg Cost/Profile</h3>
                            <DollarSign className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold">${costData.averageCostPerProfile}</div>
                        <p className="text-xs text-gray-500 mt-1">per profile</p>
                    </div>
                </div>
            )}

            {/* Estimated Cost Per Profile */}
            {estimateData && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-2">Estimated Cost Per Profile</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Based on typical flow: {estimateData.estimatedCostPerProfile.images} images +{" "}
                        {estimateData.estimatedCostPerProfile.textMessages} text messages
                    </p>
                    <div className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Inbound Media ({estimateData.estimatedCostPerProfile.images} images)</span>
                                <span className="font-medium">
                                    ${estimateData.estimatedCostPerProfile.costBreakdown.inboundMedia.toFixed(4)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Inbound Text (1 message)</span>
                                <span className="font-medium">
                                    ${estimateData.estimatedCostPerProfile.costBreakdown.inboundText.toFixed(4)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Outbound Text ({estimateData.estimatedCostPerProfile.textMessages - 1} messages)</span>
                                <span className="font-medium">
                                    ${estimateData.estimatedCostPerProfile.costBreakdown.outboundText.toFixed(4)}
                                </span>
                            </div>
                            <div className="border-t pt-4 flex justify-between items-center">
                                <span className="font-semibold">Total Estimated Cost</span>
                                <span className="text-2xl font-bold">${estimateData.estimatedCostPerProfile.totalCost}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">{estimateData.note}</p>
                    </div>
                </div>
            )}

            {/* Cost Breakdown by Profile */}
            {costData && costData.breakdown.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-2">Cost Breakdown by Profile</h2>
                    <p className="text-sm text-gray-600 mb-4">Individual profile costs for the selected period</p>
                    <div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">Profile ID</th>
                                        <th className="text-right p-2">Messages</th>
                                        <th className="text-right p-2">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {costData.breakdown.map((item) => (
                                        <tr key={item.profileId} className="border-b">
                                            <td className="p-2 font-mono text-xs">{item.profileId}</td>
                                            <td className="text-right p-2">{item.messageCount}</td>
                                            <td className="text-right p-2 font-medium">${item.cost}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Pricing Information */}
            {estimateData && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-2">Current Pricing (USD)</h2>
                    <p className="text-sm text-gray-600 mb-4">WhatsApp message pricing used for calculations</p>
                    <div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm text-gray-600">Inbound Text</div>
                                <div className="text-lg font-semibold">${estimateData.pricing.inboundText.toFixed(4)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Inbound Media</div>
                                <div className="text-lg font-semibold">${estimateData.pricing.inboundMedia.toFixed(4)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Outbound Text</div>
                                <div className="text-lg font-semibold">${estimateData.pricing.outboundText.toFixed(4)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Outbound Media</div>
                                <div className="text-lg font-semibold">${estimateData.pricing.outboundMedia.toFixed(4)}</div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">
                            💡 Note: Pricing varies by country. Check{" "}
                            <a
                                href="https://www.twilio.com/en-us/whatsapp/pricing"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                            >
                                Twilio's pricing page
                            </a>{" "}
                            for your country.
                        </p>
                    </div>
                </div>
            )}

            {/* Help Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">How to Check Twilio Billing</h2>
                <div className="space-y-2 text-sm">
                    <p>
                        <strong>1. Twilio Console:</strong> Go to{" "}
                        <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            console.twilio.com
                        </a>{" "}
                        → Billing → Usage
                    </p>
                    <p>
                        <strong>2. Message Logs:</strong> Monitor → Logs → Messaging (filter by WhatsApp)
                    </p>
                    <p>
                        <strong>3. Usage API:</strong> Query Twilio's Usage Records API programmatically
                    </p>
                    <p>
                        <strong>4. Set Alerts:</strong> Monitor → Usage Triggers (get notified when costs exceed thresholds)
                    </p>
                    <p className="mt-4">
                        📖 See <code className="bg-gray-100 px-2 py-1 rounded">BILLING_GUIDE.md</code> for detailed instructions.
                    </p>
                </div>
            </div>
        </div>
    );
}

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TwilioCostModel from "@/models/TwilioCost";
import PendingClientModel from "@/models/PendingClient";

/**
 * Calculate costs for WhatsApp profile uploads
 * GET /api/whatsapp/cost-calculator?profileId=xxx or ?all=true
 */
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const searchParams = request.nextUrl.searchParams;
        const profileId = searchParams.get("profileId");
        const all = searchParams.get("all") === "true";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Default pricing (US WhatsApp pricing - adjust for your country)
        const PRICING = {
            inboundText: 0.005, // $0.005 per inbound text message
            inboundMedia: 0.005, // $0.005 per inbound media message
            outboundText: 0.005, // $0.005 per outbound text message
            outboundMedia: 0.005, // $0.005 per outbound media message
            template: 0.005, // $0.005 per template message (if used)
        };

        if (profileId) {
            // Calculate cost for a specific profile
            const costs = await TwilioCostModel.find({ profileId }).sort({ date: -1 });
            const totalCost = costs.reduce((sum, cost) => sum + cost.cost, 0);

            return NextResponse.json({
                profileId,
                totalCost: totalCost.toFixed(4),
                currency: "USD",
                messageCount: costs.length,
                breakdown: costs.map((c) => ({
                    messageSid: c.messageSid,
                    direction: c.direction,
                    type: c.messageType,
                    cost: c.cost.toFixed(4),
                    date: c.date,
                })),
            });
        }

        if (all) {
            // Calculate total costs across all profiles
            const query: any = {};
            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = new Date(startDate);
                if (endDate) query.date.$lte = new Date(endDate);
            }

            const costs = await TwilioCostModel.find(query).sort({ date: -1 });
            const totalCost = costs.reduce((sum, cost) => sum + cost.cost, 0);

            // Group by profile
            const byProfile = costs.reduce((acc: any, cost) => {
                const pid = cost.profileId || "unknown";
                if (!acc[pid]) {
                    acc[pid] = { profileId: pid, cost: 0, count: 0 };
                }
                acc[pid].cost += cost.cost;
                acc[pid].count += 1;
                return acc;
            }, {});

            // Get profile count
            const profileQuery: any = { source: "whatsapp" };
            if (startDate) profileQuery.submittedAt = { $gte: new Date(startDate).toISOString() };
            if (endDate) {
                profileQuery.submittedAt = {
                    ...profileQuery.submittedAt,
                    $lte: new Date(endDate).toISOString(),
                };
            }
            const profileCount = await PendingClientModel.countDocuments(profileQuery);

            return NextResponse.json({
                totalCost: totalCost.toFixed(4),
                currency: "USD",
                totalMessages: costs.length,
                totalProfiles: profileCount,
                averageCostPerProfile: profileCount > 0 ? (totalCost / profileCount).toFixed(4) : "0.0000",
                dateRange: {
                    start: startDate || "all time",
                    end: endDate || "all time",
                },
                breakdown: Object.values(byProfile).map((p: any) => ({
                    profileId: p.profileId,
                    cost: p.cost.toFixed(4),
                    messageCount: p.count,
                })),
            });
        }

        // Return pricing info and estimated cost per profile
        const estimatedCostPerProfile = {
            // Typical flow: 2-5 images + 3-5 text messages
            images: 3, // Average 3 images per resume
            textMessages: 4, // Average 4 text messages (acknowledgment, confirmation, processing, success)
            costBreakdown: {
                inboundMedia: 3 * PRICING.inboundMedia,
                inboundText: 1 * PRICING.inboundText, // "yes" or "done"
                outboundText: 3 * PRICING.outboundText, // acknowledgments and status
                total: 3 * PRICING.inboundMedia + 1 * PRICING.inboundText + 3 * PRICING.outboundText,
            },
        };

        return NextResponse.json({
            pricing: PRICING,
            estimatedCostPerProfile: {
                ...estimatedCostPerProfile,
                totalCost: estimatedCostPerProfile.costBreakdown.total.toFixed(4),
            },
            note: "These are estimates. Actual costs may vary based on message volume and country-specific pricing.",
        });
    } catch (error: any) {
        console.error("Error calculating costs:", error);
        return NextResponse.json(
            { error: error.message || "Failed to calculate costs" },
            { status: 500 }
        );
    }
}

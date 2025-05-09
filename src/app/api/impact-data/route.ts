import { NextResponse } from "next/server";
import {
  getRecentReports,
  getAllRewards,
  getWasteCollectionTasks,
} from "@/utils/db/actions";

// This is a server-side API endpoint for fetching impact data
export async function GET() {
  try {
    console.log("API: Fetching impact data...");

    // Fetch all the data concurrently for better performance
    const [reports, rewards, tasks] = await Promise.all([
      getRecentReports(100),
      getAllRewards(),
      getWasteCollectionTasks(100),
    ]);

    console.log(
      `API: Fetched ${reports.length} reports, ${rewards.length} rewards, ${tasks.length} tasks`,
    );

    // Calculate waste collected
    const wasteCollected = tasks.reduce((total, task) => {
      if (!task.amount || typeof task.amount !== "string") {
        return total;
      }

      const match = task.amount.match(/(\d+(\.\d+)?)/);
      const amount = match ? parseFloat(match[0]) : 0;
      return total + amount;
    }, 0);

    // Calculate tokens earned
    const tokensEarned = rewards.reduce((total, reward) => {
      if (!reward || reward.points === undefined || reward.points === null) {
        return total;
      }
      return total + (reward.points || 0);
    }, 0);

    const reportsSubmitted = reports.length;
    const co2Offset = wasteCollected * 0.5;

    // Return the processed data as JSON
    return NextResponse.json({
      wasteCollected: Math.round(wasteCollected * 10) / 10,
      reportsSubmitted,
      tokensEarned,
      co2Offset: Math.round(co2Offset * 10) / 10,
    });
  } catch (error) {
    console.error("API Error fetching impact data:", error);
    return NextResponse.json(
      { error: "Failed to fetch impact data" },
      { status: 500 },
    );
  }
}

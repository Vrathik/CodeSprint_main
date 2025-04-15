"use client";
import { useState, useEffect } from "react";
import { getAllRewards, getUserByEmail } from "@/utils/db/actions";
import { Loader, Award, User, Trophy, Crown } from "lucide-react";
import { toast } from "react-hot-toast";

type Reward = {
  id: number;
  userId: number;
  points: number;
  level: number;
  createdAt: Date;
  userName: string | null;
};

export default function LeaderboardPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    id: number;
    email: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const fetchRewardsAndUser = async () => {
      setLoading(true);
      try {
        const fetchedRewards = await getAllRewards();

        // Consolidate rewards by user to avoid duplicates
        const userMap = new Map();
        fetchedRewards.forEach((reward) => {
          if (
            !userMap.has(reward.userId) ||
            userMap.get(reward.userId).points < reward.points
          ) {
            userMap.set(reward.userId, reward);
          }
        });

        // Convert map to array and sort by points (descending)
        const uniqueRewards = Array.from(userMap.values()).sort(
          (a, b) => b.points - a.points,
        );
        setRewards(uniqueRewards);

        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail);
          if (fetchedUser) {
            setUser(fetchedUser);
          } else {
            toast.error("User not found. Please log in again.");
          }
        } else {
          toast.error("User not logged in. Please log in.");
        }
      } catch (error) {
        console.error("Error fetching rewards and user:", error);
        toast.error("Failed to load leaderboard. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRewardsAndUser();
  }, []);

  return (
    <div className="px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6 text-gray-800">
          Leaderboard
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin h-8 w-8 text-gray-600" />
          </div>
        ) : (
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 md:p-6">
              <div className="flex justify-between items-center text-white">
                <Trophy className="h-6 w-6 md:h-10 md:w-10" />
                <span className="text-xl md:text-2xl font-bold">
                  Top Performers
                </span>
                <Award className="h-6 w-6 md:h-10 md:w-10" />
              </div>
            </div>

            {/* Desktop view - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward, index) => (
                    <tr
                      key={reward.id}
                      className={`${user && user.id === reward.userId ? "bg-indigo-50" : ""} hover:bg-gray-50 transition-colors duration-150 ease-in-out`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index < 3 ? (
                            <Crown
                              className={`h-6 w-6 ${index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-400" : "text-yellow-600"}`}
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900">
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <User className="h-full w-full rounded-full bg-gray-200 text-gray-500 p-2" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {reward.userName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Award className="h-5 w-5 text-indigo-500 mr-2" />
                          <div className="text-sm font-semibold text-gray-900">
                            {reward.points.toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          Level {reward.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view - Card-based layout */}
            <div className="md:hidden">
              {rewards.map((reward, index) => (
                <div
                  key={reward.id}
                  className={`p-4 border-b ${user && user.id === reward.userId ? "bg-indigo-50" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-8 h-8 mr-3">
                        {index < 3 ? (
                          <Crown
                            className={`h-6 w-6 ${index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-400" : "text-yellow-600"}`}
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-900">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <User className="h-full w-full rounded-full bg-gray-200 text-gray-500 p-1" />
                        </div>
                        <div className="ml-2">
                          <span className="text-sm font-medium text-gray-900">
                            {reward.userName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                      Level {reward.level}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 ml-11">
                    <Award className="h-4 w-4 text-indigo-500 mr-1" />
                    <div className="text-sm font-semibold text-gray-900">
                      {reward.points.toLocaleString()} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getUserByEmail,
  getWasteCollectionTasks,
  saveCollectedWaste,
  saveReward,
  updateTaskStatus,
} from "@/utils/db/actions";
import { useAuth } from "@clerk/nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader,
  MapPin,
  Search,
  Trash2,
  Upload,
  Weight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

type CollectionTask = {
  id: number;
  location: string;
  wasteType: string;
  amount: string;
  status: "pending" | "in_progress" | "completed" | "verified";
  date: string;
  collectorId: number | null;
};

const ITEMS_PER_PAGE = 5;

export default function CollectPage() {
  const router = useRouter();
  const { isLoaded, userId, sessionId, isSignedIn } = useAuth();
  const [tasks, setTasks] = useState<CollectionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredWasteType, setHoveredWasteType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState<{
    id: number;
    email: string;
    name: string;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<CollectionTask | null>(null);
  const [verificationImage, setVerificationImage] = useState<string | null>(
    null,
  );
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "success" | "failure"
  >("idle");
  const [verificationResult, setVerificationResult] = useState<{
    wasteTypeMatch: boolean;
    quantityMatch: boolean;
    confidence: number;
  } | null>(null);
  const [reward, setReward] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserDataAndTasks = async () => {
      setLoading(true);
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail);
          if (fetchedUser) {
            setUser(fetchedUser);
            const fetchedTasks = await getWasteCollectionTasks();
            setTasks(fetchedTasks as CollectionTask[]);
          } else {
            toast.error("User not found. Please log in again.");
          }
        } else {
          toast.error("User not logged in. Please log in.");
        }
      } catch (error) {
        console.error("Error fetching user data and tasks:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndTasks();
  }, []);

  const handleStatusChange = async (
    taskId: number,
    newStatus: CollectionTask["status"],
  ) => {
    if (!user) {
      toast.error("User profile not found. Please update your profile.");
      return;
    }

    try {
      const updatedTask = await updateTaskStatus(taskId, newStatus, user.id);
      if (updatedTask) {
        setTasks(
          tasks.map((task) =>
            task.id === taskId
              ? { ...task, status: newStatus, collectorId: user.id }
              : task,
          ),
        );
        toast.success("Task status updated successfully");
      } else {
        toast.error("Failed to update task status. Please try again.");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status. Please try again.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const readFileAsBase64 = (dataUrl: string): string => {
    return dataUrl.split(",")[1];
  };

  const parseJsonResponse = (text: string) => {
    try {
      // First, try direct JSON parsing
      return JSON.parse(text);
    } catch (e) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (e) {
          throw new Error("Failed to parse JSON from markdown block");
        }
      }

      // If no code blocks, try to find any JSON-like structure
      const possibleJson = text.match(/\{[\s\S]*?\}/);
      if (possibleJson) {
        try {
          return JSON.parse(possibleJson[0]);
        } catch (e) {
          throw new Error("Failed to parse JSON from text");
        }
      }

      throw new Error("No valid JSON found in response");
    }
  };

  const handleVerify = async () => {
    if (!selectedTask || !verificationImage || !user) {
      toast.error("Missing required information for verification.");
      return;
    }

    setVerificationStatus("verifying");

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const base64Data = readFileAsBase64(verificationImage);

      const imageParts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ];

      const prompt = `Analyze this waste collection image and provide a JSON response with the following format ONLY:
      {
        "wasteTypeMatch": boolean,
        "quantityMatch": boolean,
        "confidence": number
      }

      Compare against:
      - Waste Type: ${selectedTask.wasteType}
      - Expected Quantity: ${selectedTask.amount}

      Rules:
      - wasteTypeMatch: true if the waste in the image matches ${selectedTask.wasteType}
      - quantityMatch: true if the amount appears to match ${selectedTask.amount}
      - confidence: number between 0 and 1 indicating your confidence level

      Return ONLY the JSON object, no additional text or explanation.`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      try {
        const parsedResult = parseJsonResponse(text);

        // Validate the parsed result has the expected structure
        if (
          typeof parsedResult.wasteTypeMatch !== "boolean" ||
          typeof parsedResult.quantityMatch !== "boolean" ||
          typeof parsedResult.confidence !== "number" ||
          parsedResult.confidence < 0 ||
          parsedResult.confidence > 1
        ) {
          throw new Error("Invalid response format");
        }

        setVerificationResult({
          wasteTypeMatch: parsedResult.wasteTypeMatch,
          quantityMatch: parsedResult.quantityMatch,
          confidence: parsedResult.confidence,
        });
        setVerificationStatus("success");

        if (
          parsedResult.wasteTypeMatch &&
          parsedResult.quantityMatch &&
          parsedResult.confidence > 0.7
        ) {
          await handleStatusChange(selectedTask.id, "verified");
          const earnedReward = Math.floor(Math.random() * 50) + 10;

          await saveReward(user.id, earnedReward);
          await saveCollectedWaste(selectedTask.id, user.id, parsedResult);

          setReward(earnedReward);
          toast.success(
            `Verification successful! You earned ${earnedReward} tokens!`,
          );
        } else {
          toast.error(
            "Verification failed. The collected waste does not match the reported waste.",
          );
        }
      } catch (error) {
        console.error("Failed to parse verification response:", error);
        toast.error(
          "Failed to process verification response. Please try again.",
        );
        setVerificationStatus("failure");
      }
    } catch (error) {
      console.error("Error during verification:", error);
      toast.error("Verification failed. Please try again.");
      setVerificationStatus("failure");
    }
  };

  const filteredTasks = tasks.filter((task) =>
    task.location.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const pageCount = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto ">
      <h1 className="text-3xl font-semibold mb-6 mt-20 lg:mt-0 text-gray-800">
        Waste Collection Tasks
      </h1>

      <div className="mb-4 flex items-center">
        <Input
          type="text"
          placeholder="Search by area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mr-2"
        />
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {paginatedTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                {task.location}
              </h2>
              <StatusBadge status={task.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
              <div className="flex items-center relative">
                <Trash2 className="w-4 h-4 mr-2 text-gray-500" />
                <span
                  onMouseEnter={() => setHoveredWasteType(task.wasteType)}
                  onMouseLeave={() => setHoveredWasteType(null)}
                  className="cursor-pointer"
                >
                  {task.wasteType.length > 8
                    ? `${task.wasteType.slice(0, 8)}...`
                    : task.wasteType}
                </span>
                {hoveredWasteType === task.wasteType && (
                  <div className="absolute left-0 top-full mt-1 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    {task.wasteType}
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <Weight className="w-4 h-4 mr-2 text-gray-500" />
                {task.amount}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                {task.date}
              </div>
            </div>
            <div className="flex justify-end">
              {task.status === "pending" && (
                <Button
                  onClick={() => handleStatusChange(task.id, "in_progress")}
                  variant="outline"
                  size="sm"
                >
                  Start Collection
                </Button>
              )}
              {task.status === "in_progress" &&
                task.collectorId === user?.id && (
                  <Button
                    onClick={() => setSelectedTask(task)}
                    variant="outline"
                    size="sm"
                  >
                    Complete & Verify
                  </Button>
                )}
              {task.status === "in_progress" &&
                task.collectorId !== user?.id && (
                  <span className="text-yellow-600 text-sm font-medium">
                    In progress by another collector
                  </span>
                )}
              {task.status === "verified" && (
                <span className="text-green-600 text-sm font-medium">
                  Reward Earned
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="mr-2"
        >
          Previous
        </Button>
        <span className="mx-2 self-center">
          Page {currentPage} of {pageCount}
        </span>
        <Button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, pageCount))
          }
          disabled={currentPage === pageCount}
          className="ml-2"
        >
          Next
        </Button>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Verify Collection</h3>
            <p className="mb-4 text-sm text-gray-600">
              Upload a photo of the collected waste to verify and earn your
              reward.
            </p>
            <div className="mb-4">
              <label
                htmlFor="verification-image"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Upload Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="verification-image"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="verification-image"
                        name="verification-image"
                        type="file"
                        className="sr-only"
                        onChange={handleImageUpload}
                        accept="image/*"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
            {verificationImage && (
              <img
                src={verificationImage}
                alt="Verification"
                className="mb-4 rounded-md w-full"
              />
            )}
            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={
                !verificationImage || verificationStatus === "verifying"
              }
            >
              {verificationStatus === "verifying" ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Verifying...
                </>
              ) : (
                "Verify Collection"
              )}
            </Button>
            {verificationStatus === "success" && verificationResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p>
                  Waste Type Match:{" "}
                  {verificationResult.wasteTypeMatch ? "Yes" : "No"}
                </p>
                <p>
                  Quantity Match:{" "}
                  {verificationResult.quantityMatch ? "Yes" : "No"}
                </p>
                <p>
                  Confidence: {(verificationResult.confidence * 100).toFixed(2)}
                  %
                </p>
              </div>
            )}
            {verificationStatus === "failure" && (
              <p className="mt-2 text-red-600 text-center text-sm">
                Verification failed. Please try again.
              </p>
            )}
            <Button
              onClick={() => setSelectedTask(null)}
              variant="outline"
              className="w-full mt-2"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CollectionTask["status"] }) {
  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
    in_progress: { color: "bg-blue-100 text-blue-800", icon: Trash2 },
    completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    verified: { color: "bg-purple-100 text-purple-800", icon: CheckCircle },
  };

  const { color, icon: Icon } = statusConfig[status];

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${color} flex items-center`}
    >
      <Icon className="mr-1 h-3 w-3" />
      {status.replace("_", " ")}
    </span>
  );
}

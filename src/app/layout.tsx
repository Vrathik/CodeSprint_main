"use client";
import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "react-hot-toast";
import { getAvailableRewards, getUserByEmail } from "@/utils/db/actions";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { neobrutalism } from "@clerk/themes";
import { GoogleMapsProvider } from "@/components/providers/GoogleMapsProvider";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

// Create a wrapper component for client-side functionality
function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    const fetchTotalEarnings = async () => {
      if (!isLoaded || !isSignedIn) return;

      try {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          const user = await getUserByEmail(userEmail);
          console.log("user from layout", user);

          if (user) {
            const availableRewards = (await getAvailableRewards(
              user.id,
            )) as any;
            console.log("availableRewards from layout", availableRewards);
            setTotalEarnings(availableRewards);
          }
        }
      } catch (error) {
        console.error("Error fetching total earnings:", error);
      }
    };

    fetchTotalEarnings();
  }, [isLoaded, isSignedIn]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1">
        <Navbar />
        <main className="flex-1 p-4 lg:p-4 ml-0 lg:mt-20 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: neobrutalism,
      }}
    >
      <html lang="en">
        <body className={inter.className}>
          <GoogleMapsProvider>
            <LayoutContent>{children}</LayoutContent>
            <Toaster />
          </GoogleMapsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

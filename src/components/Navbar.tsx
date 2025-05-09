// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Trash,
  Coins,
  Medal,
  Settings,
  Home,
  User,
  ChevronDown,
  Bell,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth, useUser, SignInButton, SignOutButton } from "@clerk/nextjs";
import {
  createUser,
  getUnreadNotifications,
  markNotificationAsRead,
  getUserByEmail,
  getUserBalance,
} from "@/utils/db/actions";

const navigationItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/report", icon: Settings, label: "Report" },
  { href: "/collect", icon: Trash, label: "Collect" },
  { href: "/rewards", icon: Coins, label: "Rewards" },
  { href: "/leaderboard", icon: Medal, label: "Leaderboard" },
  { href: "/location", icon: MapPin, label: "Location" },
];

const moreItems = [
  { href: "/waste", icon: Trash, label: "Waste" },
  { href: "/market", icon: Coins, label: "Market" },
];

export default function Navbar() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [balance, setBalance] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const initUser = async () => {
      if (isSignedIn && user?.emailAddresses?.[0]?.emailAddress) {
        try {
          const email = user.emailAddresses[0].emailAddress;
          localStorage.setItem("userEmail", email);

          // Will either get existing user or create a new one
          const dbUser = await createUser(
            email,
            user.fullName || "Anonymous User",
          );

          if (!dbUser) {
            console.error("Failed to initialize user in database");
            toast.error(
              "Error setting up user profile. Please try refreshing the page.",
            );
          }
        } catch (error) {
          console.error("Error in user initialization:", error);
          toast.error(
            "Error setting up user profile. Please try refreshing the page.",
          );
        }
      }
    };

    if (isLoaded) {
      initUser();
    }
  }, [isSignedIn, user, isLoaded]);
  useEffect(() => {
    const fetchNotifications = async () => {
      if (isSignedIn && user?.emailAddresses?.[0]?.emailAddress) {
        const userDb = await getUserByEmail(
          user.emailAddresses[0].emailAddress,
        );
        if (userDb) {
          const unreadNotifications = await getUnreadNotifications(userDb.id);
          setNotifications(unreadNotifications);
        }
      }
    };

    fetchNotifications();
    const notificationInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(notificationInterval);
  }, [isSignedIn, user]);

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (isSignedIn && user?.emailAddresses?.[0]?.emailAddress) {
        const userDb = await getUserByEmail(
          user.emailAddresses[0].emailAddress,
        );
        if (userDb) {
          const userBalance = await getUserBalance(userDb.id);
          setBalance(userBalance);
        }
      }
    };

    fetchUserBalance();

    const handleBalanceUpdate = (event: CustomEvent) => {
      setBalance(event.detail);
    };

    window.addEventListener(
      "balanceUpdated",
      handleBalanceUpdate as EventListener,
    );
    return () => {
      window.removeEventListener(
        "balanceUpdated",
        handleBalanceUpdate as EventListener,
      );
    };
  }, [isSignedIn, user]);

  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    };

    // Close mobile menu when route changes
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const AuthButton = () => (
    <a href="/sign-in">
      <Button className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto">
        Sign In
      </Button>
    </a>
  );

  return (
    <>
      <nav className="bg-white shadow-md fixed w-full top-0 left-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img
                src="/logo.png"
                alt="SmartCycle Logo"
                className="h-8 w-auto sm:h-10"
              />
              <span className="ml-2 text-xl font-bold text-green-600 hidden sm:block">
                SmartCycle
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Center */}
          <div className="hidden lg:flex items-center justify-center space-x-1">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className={`flex items-center space-x-1 ${
                    pathname === item.href
                      ? "bg-green-100 text-green-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-green-600"
                  }`}
                  size="sm"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:bg-gray-50 hover:text-green-600"
                >
                  More
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {moreItems.map((item) => (
                  <DropdownMenuItem key={item.href} className="py-2">
                    <Link href={item.href} className="flex items-center w-full">
                      <item.icon className="h-4 w-4 mr-2 text-green-600" />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {isSignedIn ? (
              <>
                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9 text-gray-600 hover:text-green-600"
                    >
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.25rem] h-4 bg-red-500 text-white text-xs">
                          {notifications.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <div className="px-3 py-2 font-medium text-green-700 border-b">
                      Notifications
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            onClick={() =>
                              handleNotificationClick(notification.id)
                            }
                            className="py-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">
                                {notification.type}
                              </span>
                              <span className="text-sm text-gray-500 mt-1">
                                {notification.message}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <div className="py-4 px-3 text-center text-gray-500">
                          No new notifications
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Balance - Desktop Only */}
                <div className="hidden md:flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-md">
                  <Coins className="h-4 w-4 text-green-600" />
                  <span className="ml-1 font-medium text-sm">
                    {balance.toFixed(0)}
                  </span>
                </div>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center text-gray-700 hover:bg-gray-50"
                    >
                      {user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt="Profile"
                          className="h-8 w-8 rounded-full mr-2"
                        />
                      ) : (
                        <User className="h-5 w-5 mr-1" />
                      )}
                      <span className="hidden sm:block mr-1 max-w-24 truncate">
                        {user?.fullName?.split(" ")[0] || "User"}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2 text-sm text-gray-500">
                      Signed in as{" "}
                      <span className="font-medium text-gray-900">
                        {user?.emailAddresses?.[0]?.emailAddress}
                      </span>
                    </div>
                    <DropdownMenuSeparator />

                    {/* Balance - Mobile Visible in Menu */}
                    <div className="px-3 py-2 md:hidden">
                      <div className="flex items-center text-green-700">
                        <Coins className="h-4 w-4 mr-2 text-green-600" />
                        <span className="font-medium">
                          Balance: {balance.toFixed(0)}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="md:hidden" />

                    <DropdownMenuItem className="py-2">
                      <Link
                        href="/user-profile"
                        className="flex items-center w-full"
                      >
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="py-2">
                      <SignOutButton>
                        <div className="flex items-center text-red-600 w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Sign Out
                        </div>
                      </SignOutButton>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden sm:block">
                <AuthButton />
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-gray-600" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden shadow-lg">
            <div className="bg-white border-t pt-2 pb-3 space-y-1 max-h-[70vh] overflow-y-auto">
              {/* Sign in button for mobile */}
              {!isSignedIn && (
                <div className="px-4 py-2">
                  <AuthButton />
                </div>
              )}

              {/* Mobile navigation */}
              <div className="grid grid-cols-3 gap-2 px-4">
                {navigationItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className={`flex flex-col items-center justify-center h-20 w-full ${
                        pathname === item.href
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  </Link>
                ))}

                {/* More items in mobile grid */}
                {moreItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className={`flex flex-col items-center justify-center h-20 w-full ${
                        pathname === item.href
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>

              {/* Mobile user section */}
              {isSignedIn && (
                <div className="border-t border-gray-200 mt-3 pt-3">
                  <div className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {user?.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt="Profile"
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <User className="h-10 w-10 p-2 bg-gray-100 rounded-full text-gray-600" />
                        )}
                        <div className="ml-3">
                          <p className="font-medium text-gray-800">
                            {user?.fullName || "User"}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-32">
                            {user?.emailAddresses?.[0]?.emailAddress}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center bg-green-50 px-3 py-1 rounded-md">
                        <Coins className="h-4 w-4 text-green-600 mr-1" />
                        <span className="font-medium text-green-700">
                          {balance.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 px-4 py-2">
                    <Link href="/profile">
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Profile
                      </Button>
                    </Link>
                    <SignOutButton>
                      <Button
                        variant="outline"
                        className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Sign Out
                      </Button>
                    </SignOutButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
      {/* Spacer to prevent content from hiding under navbar */}
      <div className="h-16"></div>
    </>
  );
}

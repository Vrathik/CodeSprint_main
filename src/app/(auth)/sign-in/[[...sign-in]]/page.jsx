import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, HelpCircle, Mail } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center  h-screen bg-gray-100">
      <SignIn />
    </div>
  );
}

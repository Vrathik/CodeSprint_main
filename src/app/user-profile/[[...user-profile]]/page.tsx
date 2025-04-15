import { UserProfile } from "@clerk/nextjs";

const UserProfilePage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <UserProfile />
  </div>
);

export default UserProfilePage;

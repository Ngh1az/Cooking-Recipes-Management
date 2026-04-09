import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=%2Fprofile");
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      <p className="mt-1 text-sm text-gray-600">
        This is your account summary.
      </p>

      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Display name
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {user.displayName}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{user.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Username
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {user.username}
          </p>
        </div>
      </div>
    </div>
  );
}

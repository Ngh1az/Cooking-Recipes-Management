import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=%2Fsettings");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account and preferences.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Signed in as{" "}
          <span className="font-medium text-gray-900">{user.email}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Preferences
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          More settings options can be added here (theme, notifications,
          privacy).
        </p>
      </div>
    </div>
  );
}

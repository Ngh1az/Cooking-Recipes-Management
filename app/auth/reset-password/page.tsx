"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!token) {
      setError("Reset token is missing.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Unable to reset password.");
      }

      router.push("/auth/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
      <p className="mt-1 text-sm text-gray-600">
        Set a new secure password for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-gray-700"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
          <p className="mt-1 text-xs text-gray-500">
            Minimum 8 chars, include uppercase, lowercase, number, and special
            character.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm text-gray-700"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Back to{" "}
        <Link href="/auth/login" className="font-medium text-orange-700">
          Login
        </Link>
      </p>
    </div>
  );
}

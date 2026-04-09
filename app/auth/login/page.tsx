"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/recipes";
  }

  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const oauthError = searchParams.get("error") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Login failed.");
      }

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Login</h1>
      <p className="mt-1 text-sm text-gray-600">
        Sign in to continue your recipe journey.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="mt-4">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
          or
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href={`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`}
            aria-label="Sign in with Google"
            title="Google"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.215 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.957 3.043l5.657-5.657C34.053 6.053 29.285 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 16.108 19.002 12 24 12c3.059 0 5.842 1.153 7.957 3.043l5.657-5.657C34.053 6.053 29.285 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.183 0 9.86-1.979 13.409-5.192l-6.191-5.238C29.146 35.091 26.715 36 24 36c-5.194 0-9.627-3.327-11.284-7.946l-6.52 5.025C9.506 39.556 16.744 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303c-.791 2.237-2.241 4.166-4.085 5.57l.003-.002 6.191 5.238C36.97 39.17 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
              />
            </svg>
          </a>

          <button
            type="button"
            aria-label="GitHub icon"
            title="GitHub"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.86-2.78.62-3.37-1.2-3.37-1.2-.45-1.19-1.11-1.5-1.11-1.5-.9-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.88 1.56 2.31 1.11 2.87.85.09-.66.34-1.11.62-1.36-2.22-.26-4.56-1.15-4.56-5.12 0-1.13.39-2.05 1.03-2.77-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.06A9.3 9.3 0 0 1 12 6.9c.85 0 1.71.12 2.51.36 1.91-1.34 2.74-1.06 2.74-1.06.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.77 0 3.98-2.34 4.85-4.58 5.11.36.32.67.94.67 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.59 17.52 2 12 2z"
              />
            </svg>
          </button>

          <button
            type="button"
            aria-label="X icon"
            title="X"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.244 2H21l-6.46 7.39L22 22h-5.83l-4.56-5.96L6.4 22H3.64l6.91-7.9L2 2h5.98l4.12 5.41L18.244 2zm-1 18h1.53L7.15 3.89H5.5L17.244 20z"
              />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Facebook icon"
            title="Facebook"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-[#1877F2]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.71 4.54-4.71 1.31 0 2.68.24 2.68.24v2.98h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.09 24 12.07z"
              />
            </svg>
          </button>
        </div>
      </div>

      {oauthError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {oauthError}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <p className="text-gray-600">
          No account yet?{" "}
          <Link href="/auth/register" className="font-medium text-orange-700">
            Register
          </Link>
        </p>
        <Link
          href="/auth/forgot-password"
          className="text-gray-600 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
    </div>
  );
}

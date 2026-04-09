"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const hasToken = Boolean(token);

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    hasToken ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    hasToken ? "Verifying your email..." : "Verification token is missing.",
  );

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.error || "Verification failed. The link may be expired.",
          );
        }
        setStatus("success");
        setMessage("Email verified successfully. You can now login.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      });
  }, [hasToken, token]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Verify Email</h1>
      <p
        className={`mt-3 rounded-lg px-3 py-2 text-sm ${
          status === "success"
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : status === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-orange-200 bg-orange-50 text-orange-700"
        }`}
      >
        {message}
      </p>

      <div className="mt-4">
        <Link
          href="/auth/login"
          className="font-medium text-orange-700 hover:underline"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { createPasswordReset } from "@/lib/auth";
import { getBaseUrl } from "@/lib/get-base-url";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit({
      key: `auth:forgot-password:${ip}`,
      limit: 5,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json();
    const email = (body?.email ?? "").toString().trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const reset = await createPasswordReset(email);

    if (reset) {
      const resetUrl = `${getBaseUrl()}/auth/reset-password?token=${reset.token}`;
      try {
        await sendPasswordResetEmail({
          to: reset.userEmail,
          resetUrl,
        });
      } catch (error) {
        console.error("[Auth] Failed to send password reset email.", error);
      }
    }

    // Return success even when email does not exist to avoid account enumeration.
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process password reset." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { createEmailVerification } from "@/lib/auth";
import { getBaseUrl } from "@/lib/get-base-url";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit({
      key: `auth:resend-verification:${ip}`,
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

    const verification = await createEmailVerification(email);

    if (verification) {
      const verificationUrl = `${getBaseUrl()}/auth/verify-email?token=${verification.token}`;
      try {
        await sendVerificationEmail({
          to: verification.userEmail,
          verifyUrl: verificationUrl,
        });
      } catch (error) {
        console.error("[Auth] Failed to resend verification email.", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to resend verification email." },
      { status: 500 },
    );
  }
}

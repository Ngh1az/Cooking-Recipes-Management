import { NextResponse } from "next/server";
import { verifyEmailByToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit({
      key: `auth:verify-email:${ip}`,
      limit: 10,
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
    const token = (body?.token ?? "").toString().trim();

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required." },
        { status: 400 },
      );
    }

    const ok = await verifyEmailByToken(token);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid or expired verification token." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify email." },
      { status: 500 },
    );
  }
}

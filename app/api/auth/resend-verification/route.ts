import { NextResponse } from "next/server";
import { createEmailVerification } from "@/lib/auth";
import { getBaseUrl } from "@/lib/get-base-url";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
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
      console.log(
        `[Auth] Resent verification link for ${email}: ${verificationUrl}`,
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to resend verification email." },
      { status: 500 },
    );
  }
}

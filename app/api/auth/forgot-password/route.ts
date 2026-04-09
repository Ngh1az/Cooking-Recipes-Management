import { NextResponse } from "next/server";
import { createPasswordReset } from "@/lib/auth";
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

    const reset = await createPasswordReset(email);

    if (reset) {
      const resetUrl = `${getBaseUrl()}/auth/reset-password?token=${reset.token}`;
      console.log(`[Auth] Password reset link for ${email}: ${resetUrl}`);
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

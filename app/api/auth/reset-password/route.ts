import { NextResponse } from "next/server";
import { resetPasswordByToken, validatePassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = (body?.token ?? "").toString().trim();
    const password = (body?.password ?? "").toString();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required." },
        { status: 400 },
      );
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const ok = await resetPasswordByToken(token, password);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid or expired reset token." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to reset password." },
      { status: 500 },
    );
  }
}

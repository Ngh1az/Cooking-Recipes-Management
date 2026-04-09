import { NextResponse } from "next/server";
import { verifyEmailByToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
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

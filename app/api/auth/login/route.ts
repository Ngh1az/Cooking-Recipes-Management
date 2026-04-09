import { NextResponse } from "next/server";
import { createSession, loginUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email ?? "").toString().trim();
    const password = (body?.password ?? "").toString();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await loginUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error:
            "Please verify your email before logging in. Check the verification link sent during registration.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 },
      );
    }

    await createSession(user.id);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

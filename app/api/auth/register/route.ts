import { NextResponse } from "next/server";
import {
  createEmailVerification,
  registerUser,
  validatePassword,
} from "@/lib/auth";
import { getBaseUrl } from "@/lib/get-base-url";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit({
      key: `auth:register:${ip}`,
      limit: 5,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json();
    const email = (body?.email ?? "").toString().trim();
    const username = (body?.username ?? "").toString().trim();
    const displayName = (body?.displayName ?? "").toString().trim();
    const avatarUrl = (body?.avatarUrl ?? "").toString().trim();
    const bio = (body?.bio ?? "").toString().trim();
    const password = (body?.password ?? "").toString();
    const acceptTerms = Boolean(body?.acceptTerms);

    if (!email || !username || !displayName || !password) {
      return NextResponse.json(
        { error: "Email, username, display name, and password are required." },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9_]{3,24}$/.test(username.toLowerCase())) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-24 chars and contain only lowercase letters, numbers, or underscore.",
        },
        { status: 400 },
      );
    }

    if (!acceptTerms) {
      return NextResponse.json(
        { error: "You must accept Terms and Privacy Policy." },
        { status: 400 },
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 },
      );
    }

    const user = await registerUser({
      email,
      username,
      displayName,
      avatarUrl: avatarUrl || null,
      bio: bio || null,
      password,
    });

    const verify = await createEmailVerification(email);
    const verificationUrl = verify
      ? `${getBaseUrl()}/auth/verify-email?token=${verify.token}`
      : null;

    if (verificationUrl) {
      await sendVerificationEmail({
        to: email,
        verifyUrl: verificationUrl,
      });
    }

    return NextResponse.json({
      user,
      requiresEmailVerification: true,
    });
  } catch (error) {
    const isDuplicateConstraint =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505";

    if (isDuplicateConstraint) {
      return NextResponse.json(
        { error: "Email or username already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Register failed." }, { status: 500 });
  }
}

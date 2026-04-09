import { NextResponse } from "next/server";
import {
  createGoogleAuthorizationUrl,
  sanitizeNextPath,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nextPath = sanitizeNextPath(searchParams.get("next"));
    const authorizeUrl = await createGoogleAuthorizationUrl(nextPath);

    return NextResponse.redirect(authorizeUrl);
  } catch {
    return NextResponse.redirect(
      new URL(
        "/auth/login?error=Google%20login%20is%20not%20configured.",
        request.url,
      ),
    );
  }
}

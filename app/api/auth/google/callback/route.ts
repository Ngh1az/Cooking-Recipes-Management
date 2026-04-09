import { NextResponse } from "next/server";
import { createSession, findOrCreateGoogleUser } from "@/lib/auth";
import {
  consumeGoogleOAuthState,
  fetchGoogleUserProfile,
} from "@/lib/google-oauth";

export const runtime = "nodejs";

function loginErrorRedirect(requestUrl: string, message: string) {
  const redirectUrl = new URL("/auth/login", requestUrl);
  redirectUrl.searchParams.set("error", message);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get("error");

  if (oauthError) {
    return loginErrorRedirect(request.url, "Google sign-in was canceled.");
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const stateResult = await consumeGoogleOAuthState(state);

  if (!stateResult.valid || !code) {
    return loginErrorRedirect(request.url, "Google sign-in validation failed.");
  }

  try {
    const profile = await fetchGoogleUserProfile(code);

    if (!profile.email || !profile.email_verified) {
      return loginErrorRedirect(
        request.url,
        "Your Google account email is not verified.",
      );
    }

    const user = await findOrCreateGoogleUser({
      email: profile.email,
      displayName: profile.name,
      avatarUrl: profile.picture,
    });

    await createSession(user.id);

    return NextResponse.redirect(new URL(stateResult.nextPath, request.url));
  } catch {
    return loginErrorRedirect(request.url, "Google sign-in failed.");
  }
}

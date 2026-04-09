import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/get-base-url";

const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GOOGLE_STATE_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const GOOGLE_REDIRECT_PATH = "/api/auth/callback/google";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export type GoogleUserProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

type StoredGoogleState = {
  state: string;
  nextPath: string;
};

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  return { clientId, clientSecret };
}

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/recipes";
  }

  if (value.startsWith("//")) {
    return "/recipes";
  }

  return value;
}

export async function createGoogleAuthorizationUrl(nextPath: string) {
  const { clientId } = getGoogleConfig();
  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();

  const payload: StoredGoogleState = {
    state,
    nextPath: sanitizeNextPath(nextPath),
  };

  cookieStore.set(GOOGLE_STATE_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GOOGLE_STATE_COOKIE_MAX_AGE_SECONDS,
  });

  const redirectUri = `${getBaseUrl()}${GOOGLE_REDIRECT_PATH}`;
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("prompt", "select_account");

  return authorizeUrl;
}

export async function consumeGoogleOAuthState(returnedState: string | null) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;

  cookieStore.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  if (!raw || !returnedState) {
    return { valid: false, nextPath: "/recipes" };
  }

  try {
    const parsed = JSON.parse(raw) as StoredGoogleState;
    const isValid =
      typeof parsed.state === "string" && parsed.state === returnedState;

    return {
      valid: isValid,
      nextPath: sanitizeNextPath(parsed.nextPath),
    };
  } catch {
    return { valid: false, nextPath: "/recipes" };
  }
}

export async function fetchGoogleUserProfile(code: string) {
  const { clientId, clientSecret } = getGoogleConfig();
  const redirectUri = `${getBaseUrl()}${GOOGLE_REDIRECT_PATH}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(
      tokenData.error_description ||
        tokenData.error ||
        "Failed to get Google access token.",
    );
  }

  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      cache: "no-store",
    },
  );

  if (!profileRes.ok) {
    throw new Error("Failed to fetch Google profile.");
  }

  return (await profileRes.json()) as GoogleUserProfile;
}

import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { pool } from "@/lib/db";

const SESSION_COOKIE_NAME = "recipe_session";
const SESSION_TTL_DAYS = 30;

type UserRow = {
  id: number;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  email_verified: boolean;
  password_hash: string;
};

type SessionUser = {
  id: number;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  emailVerified: boolean;
};

type RegisterInput = {
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  password: string;
};

type PasswordValidation = {
  valid: boolean;
  message?: string;
};

type GoogleLoginInput = {
  email: string;
  displayName?: string;
  avatarUrl?: string;
};

let schemaReadyPromise: Promise<void> | null = null;
const AUTH_SCHEMA_LOCK_KEY = 842109337;
const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 30;

async function ensureAuthSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [
          AUTH_SCHEMA_LOCK_KEY,
        ]);

        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            avatar_url TEXT,
            bio TEXT,
            email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await client.query(
          "ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT",
        );
        await client.query(
          "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT",
        );
        await client.query(
          "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
        );
        await client.query(
          "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
        );
        await client.query(
          "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE",
        );
        await client.query(
          "UPDATE users SET username = email WHERE username IS NULL",
        );
        await client.query(
          "UPDATE users SET display_name = split_part(email, '@', 1) WHERE display_name IS NULL",
        );
        await client.query(
          "ALTER TABLE users ALTER COLUMN username SET NOT NULL",
        );
        await client.query(
          "ALTER TABLE users ALTER COLUMN display_name SET NOT NULL",
        );
        await client.query(
          "CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users(username)",
        );

        await client.query(`
          CREATE TABLE IF NOT EXISTS email_verification_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS user_sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
          ON user_sessions(user_id)
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS user_likes (
            recipe_id INT NOT NULL,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (recipe_id, user_id)
          )
        `);

        await client.query(
          "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS created_by_user_id INT REFERENCES users(id) ON DELETE SET NULL",
        );
        await client.query(
          "ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL",
        );
        await client.query(
          "ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_name TEXT",
        );

        await client.query(`
          CREATE INDEX IF NOT EXISTS user_likes_user_id_idx
          ON user_likes(user_id)
        `);

        await client.query(`
          DELETE FROM user_likes ul
          WHERE NOT EXISTS (
            SELECT 1 FROM recipes r WHERE r.id = ul.recipe_id
          )
        `);

        await client.query(`
          ALTER TABLE user_likes
          DROP CONSTRAINT IF EXISTS user_likes_recipe_id_fkey
        `);

        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'user_likes_recipe_id_fkey'
            ) THEN
              ALTER TABLE user_likes
              ADD CONSTRAINT user_likes_recipe_id_fkey
              FOREIGN KEY (recipe_id)
              REFERENCES recipes(id)
              ON DELETE CASCADE;
            END IF;
          END
          $$;
        `);

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  await schemaReadyPromise;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function validatePassword(password: string): PasswordValidation {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters." };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must include at least one uppercase letter.",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must include at least one lowercase letter.",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must include at least one number.",
    };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must include at least one special character.",
    };
  }

  return { valid: true };
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const passwordHash = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");

  if (passwordHash.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(passwordHash, stored);
}

function buildUsernameSeed(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

async function generateUniqueUsername(email: string, displayName?: string) {
  const emailSeed = buildUsernameSeed(email.split("@")[0] ?? "");
  const nameSeed = buildUsernameSeed(displayName ?? "");
  const base = (nameSeed || emailSeed || "user").slice(0, 20);

  for (let i = 0; i < 50; i += 1) {
    const suffix = i === 0 ? "" : `_${i + 1}`;
    const candidate = `${base}${suffix}`;

    if (candidate.length < 3) {
      continue;
    }

    const exists = await pool.query<{ id: number }>(
      "SELECT id FROM users WHERE username = $1 LIMIT 1",
      [candidate],
    );

    if (exists.rowCount === 0) {
      return candidate;
    }
  }

  return `user_${randomBytes(4).toString("hex")}`;
}

export async function registerUser(input: RegisterInput) {
  await ensureAuthSchema();

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const avatarUrl = input.avatarUrl?.trim() || null;
  const bio = input.bio?.trim() || null;
  const passwordHash = hashPassword(input.password);

  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, username, display_name, avatar_url, bio, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, username, display_name, avatar_url, bio, email_verified, password_hash`,
    [
      normalizedEmail,
      normalizedUsername,
      displayName,
      avatarUrl,
      bio,
      passwordHash,
    ],
  );

  return {
    id: result.rows[0].id,
    email: result.rows[0].email,
    username: result.rows[0].username,
    displayName: result.rows[0].display_name,
    avatarUrl: result.rows[0].avatar_url,
    bio: result.rows[0].bio,
    emailVerified: result.rows[0].email_verified,
  };
}

export async function loginUser(email: string, password: string) {
  await ensureAuthSchema();

  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query<UserRow>(
    `SELECT id, email, username, display_name, avatar_url, bio, email_verified, password_hash
     FROM users
     WHERE email = $1`,
    [normalizedEmail],
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    emailVerified: user.email_verified,
  };
}

export async function findOrCreateGoogleUser(input: GoogleLoginInput) {
  await ensureAuthSchema();

  const normalizedEmail = input.email.trim().toLowerCase();
  const fallbackName = normalizedEmail.split("@")[0] || "Google User";
  const displayName = (input.displayName?.trim() || fallbackName).slice(0, 80);
  const avatarUrl = input.avatarUrl?.trim() || null;

  const existing = await pool.query<UserRow>(
    `SELECT id, email, username, display_name, avatar_url, bio, email_verified, password_hash
     FROM users
     WHERE email = $1`,
    [normalizedEmail],
  );

  const user = existing.rows[0];

  if (user) {
    const updated = await pool.query<UserRow>(
      `UPDATE users
       SET display_name = $2,
           avatar_url = COALESCE($3, avatar_url),
           email_verified = TRUE
       WHERE id = $1
       RETURNING id, email, username, display_name, avatar_url, bio, email_verified, password_hash`,
      [user.id, displayName, avatarUrl],
    );

    return {
      id: updated.rows[0].id,
      email: updated.rows[0].email,
      username: updated.rows[0].username,
      displayName: updated.rows[0].display_name,
      avatarUrl: updated.rows[0].avatar_url,
      bio: updated.rows[0].bio,
      emailVerified: updated.rows[0].email_verified,
    };
  }

  const username = await generateUniqueUsername(normalizedEmail, displayName);
  const passwordHash = hashPassword(randomBytes(48).toString("hex"));

  const inserted = await pool.query<UserRow>(
    `INSERT INTO users (email, username, display_name, avatar_url, bio, email_verified, password_hash)
     VALUES ($1, $2, $3, $4, NULL, TRUE, $5)
     RETURNING id, email, username, display_name, avatar_url, bio, email_verified, password_hash`,
    [normalizedEmail, username, displayName, avatarUrl, passwordHash],
  );

  return {
    id: inserted.rows[0].id,
    email: inserted.rows[0].email,
    username: inserted.rows[0].username,
    displayName: inserted.rows[0].display_name,
    avatarUrl: inserted.rows[0].avatar_url,
    bio: inserted.rows[0].bio,
    emailVerified: inserted.rows[0].email_verified,
  };
}

export async function createSession(userId: number) {
  await ensureAuthSchema();

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await pool.query(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${SESSION_TTL_DAYS} days')`,
    [tokenHash, userId],
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession() {
  await ensureAuthSchema();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [
      hashToken(token),
    ]);
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const result = await pool.query<SessionUser>(
      `SELECT
         u.id,
         u.email,
         u.username,
         u.display_name AS "displayName",
         u.avatar_url AS "avatarUrl",
         u.bio,
         u.email_verified AS "emailVerified"
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [hashToken(token)],
    );

    return result.rows[0] ?? null;
  } catch (error) {
    const missingTableError =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "42P01";

    if (missingTableError) {
      return null;
    }

    throw error;
  }
}

export async function createEmailVerification(email: string) {
  await ensureAuthSchema();

  const normalizedEmail = email.trim().toLowerCase();
  const userResult = await pool.query<{ id: number; email: string }>(
    "SELECT id, email FROM users WHERE email = $1",
    [normalizedEmail],
  );

  const user = userResult.rows[0];
  if (!user) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await pool.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [
    user.id,
  ]);
  await pool.query(
    `INSERT INTO email_verification_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${EMAIL_VERIFY_TTL_HOURS} hours')`,
    [tokenHash, user.id],
  );

  return { token, userEmail: user.email };
}

export async function verifyEmailByToken(rawToken: string) {
  await ensureAuthSchema();

  const tokenHash = hashToken(rawToken);

  const result = await pool.query<{ user_id: number }>(
    `SELECT user_id
     FROM email_verification_tokens
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash],
  );

  const row = result.rows[0];
  if (!row) {
    return false;
  }

  await pool.query("UPDATE users SET email_verified = TRUE WHERE id = $1", [
    row.user_id,
  ]);
  await pool.query(
    "DELETE FROM email_verification_tokens WHERE token_hash = $1",
    [tokenHash],
  );

  return true;
}

export async function createPasswordReset(email: string) {
  await ensureAuthSchema();

  const normalizedEmail = email.trim().toLowerCase();
  const userResult = await pool.query<{ id: number; email: string }>(
    "SELECT id, email FROM users WHERE email = $1",
    [normalizedEmail],
  );

  const user = userResult.rows[0];
  if (!user) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
    user.id,
  ]);
  await pool.query(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${PASSWORD_RESET_TTL_MINUTES} minutes')`,
    [tokenHash, user.id],
  );

  return { token, userEmail: user.email };
}

export async function resetPasswordByToken(
  rawToken: string,
  newPassword: string,
) {
  await ensureAuthSchema();

  const tokenHash = hashToken(rawToken);
  const tokenResult = await pool.query<{ user_id: number }>(
    `SELECT user_id
     FROM password_reset_tokens
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash],
  );

  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) {
    return false;
  }

  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hashPassword(newPassword),
    tokenRow.user_id,
  ]);
  await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
    tokenRow.user_id,
  ]);

  return true;
}

export async function ensureLikeSchema() {
  return;
}

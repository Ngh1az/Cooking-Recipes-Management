import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const RATING_SCHEMA_LOCK_KEY = 913450221;
let ratingSchemaReadyPromise: Promise<void> | null = null;

type RatingPayload = {
  rating?: unknown;
};

async function ensureRecipeRatingSchema() {
  if (!ratingSchemaReadyPromise) {
    ratingSchemaReadyPromise = (async () => {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [
          RATING_SCHEMA_LOCK_KEY,
        ]);

        await client.query(`
          CREATE TABLE IF NOT EXISTS user_recipe_ratings (
            recipe_id INT NOT NULL,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (recipe_id, user_id)
          )
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS user_recipe_ratings_recipe_id_idx
          ON user_recipe_ratings(recipe_id)
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS user_recipe_ratings_user_id_idx
          ON user_recipe_ratings(user_id)
        `);

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      ratingSchemaReadyPromise = null;
      throw error;
    });
  }

  await ratingSchemaReadyPromise;
}

function parseRating(body: RatingPayload) {
  const value = Number(body?.rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return null;
  }

  return value;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json()) as RatingPayload;
  const parsedRating = parseRating(body);

  if (!parsedRating) {
    return NextResponse.json(
      { error: "Rating must be an integer from 1 to 5." },
      { status: 400 },
    );
  }

  const { id } = await params;
  await ensureRecipeRatingSchema();

  await pool.query(
    `INSERT INTO user_recipe_ratings (recipe_id, user_id, rating, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (recipe_id, user_id)
     DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
    [id, currentUser.id, parsedRating],
  );

  const aggregateResult = await pool.query<{
    average_rating: string;
    rating_count: string;
  }>(
    `SELECT
       COALESCE(AVG(rating)::numeric(10,2), 0)::text AS average_rating,
       COUNT(*)::text AS rating_count
     FROM user_recipe_ratings
     WHERE recipe_id = $1`,
    [id],
  );

  return NextResponse.json({
    success: true,
    viewer_rating: parsedRating,
    average_rating: Number(aggregateResult.rows[0]?.average_rating ?? 0),
    rating_count: Number(aggregateResult.rows[0]?.rating_count ?? 0),
  });
}

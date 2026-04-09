import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const RECIPE_MEDIA_SCHEMA_LOCK_KEY = 217340991;
let recipeMediaSchemaReadyPromise: Promise<void> | null = null;

async function ensureRecipeMediaSchema() {
  if (!recipeMediaSchemaReadyPromise) {
    recipeMediaSchemaReadyPromise = (async () => {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [
          RECIPE_MEDIA_SCHEMA_LOCK_KEY,
        ]);

        await client.query(
          "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'::text[]",
        );
        await client.query(
          "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS video_urls TEXT[] NOT NULL DEFAULT '{}'::text[]",
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      recipeMediaSchemaReadyPromise = null;
      throw error;
    });
  }

  await recipeMediaSchemaReadyPromise;
}

function normalizeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);
}

// 🔍 GET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(
    24,
    Math.max(1, Number(searchParams.get("limit") || 6)),
  );

  const offset = (page - 1) * limit;

  const result = await pool.query(
    `SELECT
       r.*,
       u.display_name AS author_name,
       u.username AS author_username,
       u.avatar_url AS author_avatar_url,
       COALESCE(l.likes, 0)::int AS likes
     FROM recipes r
     LEFT JOIN users u ON u.id = r.created_by_user_id
     LEFT JOIN (
       SELECT recipe_id, COUNT(*) AS likes
       FROM user_likes
       GROUP BY recipe_id
     ) l ON l.recipe_id = r.id
     WHERE r.title ILIKE $1
     ORDER BY r.id ASC
     LIMIT $2 OFFSET $3`,
    [`%${q}%`, limit, offset],
  );

  const currentUser = await getCurrentUser();
  const recipeIds = result.rows.map((row) => Number(row.id));

  let likedSet = new Set<number>();

  if (currentUser && recipeIds.length > 0) {
    const likedResult = await pool.query<{ recipe_id: number }>(
      `SELECT recipe_id
       FROM user_likes
       WHERE user_id = $1 AND recipe_id = ANY($2::int[])`,
      [currentUser.id, recipeIds],
    );

    likedSet = new Set(likedResult.rows.map((row) => Number(row.recipe_id)));
  }

  let ratingMap = new Map<
    number,
    { averageRating: number; ratingCount: number }
  >();

  if (recipeIds.length > 0) {
    try {
      const ratingsResult = await pool.query<{
        recipe_id: number;
        average_rating: string;
        rating_count: string;
      }>(
        `SELECT
           recipe_id,
           COALESCE(AVG(rating)::numeric(10,2), 0)::text AS average_rating,
           COUNT(*)::text AS rating_count
         FROM user_recipe_ratings
         WHERE recipe_id = ANY($1::int[])
         GROUP BY recipe_id`,
        [recipeIds],
      );

      ratingMap = new Map(
        ratingsResult.rows.map((row) => [
          Number(row.recipe_id),
          {
            averageRating: Number(row.average_rating ?? 0),
            ratingCount: Number(row.rating_count ?? 0),
          },
        ]),
      );
    } catch (error) {
      const missingTableError =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "42P01";

      if (!missingTableError) {
        throw error;
      }
    }
  }

  const rowsWithViewerLiked = result.rows.map((row) => {
    const rating = ratingMap.get(Number(row.id));

    return {
      ...row,
      viewer_liked: likedSet.has(Number(row.id)),
      viewer_can_edit:
        !!currentUser && Number(row.created_by_user_id) === currentUser.id,
      average_rating: rating?.averageRating ?? 0,
      rating_count: rating?.ratingCount ?? 0,
    };
  });

  return NextResponse.json({
    data: rowsWithViewerLiked,
    page,
    limit,
  });
}

// ➕ POST
export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureRecipeMediaSchema();

  const body = await req.json();

  const title = (body?.title ?? "").toString().trim();
  const description = (body?.description ?? "").toString().trim();
  const ingredients = body?.ingredients ?? [];
  const steps = body?.steps ?? [];
  const image_urls = normalizeTextList(body?.image_urls);
  const video_urls = normalizeTextList(body?.video_urls);
  const image_url = (body?.image_url ?? image_urls[0] ?? null) as string | null;

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required." },
      { status: 400 },
    );
  }

  const result = await pool.query(
    `INSERT INTO recipes (title, description, ingredients, steps, image_url, image_urls, video_urls, created_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      title,
      description,
      ingredients,
      steps,
      image_url,
      image_urls,
      video_urls,
      currentUser.id,
    ],
  );

  return NextResponse.json({ data: result.rows[0] });
}

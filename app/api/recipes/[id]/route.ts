import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

function normalizeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const recipe = await pool.query(
    `SELECT
       r.*,
       u.display_name AS author_name,
       u.username AS author_username,
       u.avatar_url AS author_avatar_url
     FROM recipes r
     LEFT JOIN users u ON u.id = r.created_by_user_id
     WHERE r.id = $1`,
    [id],
  );

  if (!recipe.rows[0]) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const likes = await pool.query(
    "SELECT COUNT(*) FROM user_likes WHERE recipe_id=$1",
    [id],
  );

  let averageRating = 0;
  let ratingCount = 0;

  const currentUser = await getCurrentUser();
  let viewerLiked = false;
  let viewerRating = 0;

  try {
    const ratings = await pool.query<{
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

    averageRating = Number(ratings.rows[0]?.average_rating ?? 0);
    ratingCount = Number(ratings.rows[0]?.rating_count ?? 0);
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

  if (currentUser) {
    const liked = await pool.query(
      "SELECT 1 FROM user_likes WHERE recipe_id = $1 AND user_id = $2 LIMIT 1",
      [id, currentUser.id],
    );
    viewerLiked = liked.rowCount > 0;

    try {
      const userRatingResult = await pool.query<{ rating: number }>(
        `SELECT rating
         FROM user_recipe_ratings
         WHERE recipe_id = $1 AND user_id = $2
         LIMIT 1`,
        [id, currentUser.id],
      );

      viewerRating = Number(userRatingResult.rows[0]?.rating ?? 0);
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

  const viewerCanEdit =
    !!currentUser &&
    Number(recipe.rows[0]?.created_by_user_id) === currentUser.id;

  return NextResponse.json({
    data: recipe.rows[0],
    likes: Number(likes.rows[0].count),
    viewer_liked: viewerLiked,
    viewer_can_edit: viewerCanEdit,
    average_rating: averageRating,
    rating_count: ratingCount,
    viewer_rating: viewerRating,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json();
  const title = (body?.title ?? "").toString().trim();
  const description = (body?.description ?? "").toString().trim();
  const ingredients = normalizeTextList(body?.ingredients);
  const steps = normalizeTextList(body?.steps);
  const image_urls = normalizeTextList(body?.image_urls);
  const video_urls = normalizeTextList(body?.video_urls);
  const image_url = (body?.image_url ?? image_urls[0] ?? null) as string | null;

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required." },
      { status: 400 },
    );
  }

  const ownership = await pool.query<{
    id: number;
    created_by_user_id: number | null;
  }>("SELECT id, created_by_user_id FROM recipes WHERE id = $1", [id]);

  if (!ownership.rows[0]) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (ownership.rows[0].created_by_user_id !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await pool.query(
    `UPDATE recipes
     SET title = $1,
         description = $2,
         ingredients = $3,
         steps = $4,
         image_url = $5,
         image_urls = $6,
         video_urls = $7
     WHERE id = $8
     RETURNING *`,
    [
      title,
      description,
      ingredients,
      steps,
      image_url,
      image_urls,
      video_urls,
      id,
    ],
  );

  return NextResponse.json({ data: result.rows[0] });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const ownership = await pool.query<{ created_by_user_id: number | null }>(
    "SELECT created_by_user_id FROM recipes WHERE id = $1",
    [id],
  );

  if (!ownership.rows[0]) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (ownership.rows[0].created_by_user_id !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await pool.query("DELETE FROM comments WHERE recipe_id = $1", [id]);
  await pool.query("DELETE FROM user_likes WHERE recipe_id = $1", [id]);
  await pool.query("DELETE FROM user_recipe_ratings WHERE recipe_id = $1", [
    id,
  ]);
  await pool.query("DELETE FROM likes WHERE recipe_id = $1", [id]);

  const result = await pool.query(
    "DELETE FROM recipes WHERE id = $1 RETURNING id",
    [id],
  );

  if (!result.rows[0]) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

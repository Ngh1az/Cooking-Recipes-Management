import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const deleteResult = await pool.query(
    `DELETE FROM user_likes
     WHERE recipe_id = $1 AND user_id = $2
     RETURNING recipe_id`,
    [id, currentUser.id],
  );

  let liked = false;

  if (deleteResult.rowCount === 0) {
    await pool.query(
      `INSERT INTO user_likes (recipe_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (recipe_id, user_id) DO NOTHING`,
      [id, currentUser.id],
    );
    liked = true;
  }

  const likesResult = await pool.query(
    "SELECT COUNT(*) FROM user_likes WHERE recipe_id = $1",
    [id],
  );

  return NextResponse.json({
    success: true,
    liked,
    likes: Number(likesResult.rows[0].count),
  });
}

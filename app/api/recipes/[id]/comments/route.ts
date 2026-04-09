import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const result = await pool.query(
    `SELECT
       id,
       content,
       COALESCE(author_name, 'Guest') AS author_name
     FROM comments
     WHERE recipe_id = $1
     ORDER BY id DESC`,
    [id],
  );

  return NextResponse.json({ data: result.rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const content = (body?.content ?? "").toString().trim();
  const currentUser = await getCurrentUser();
  const authorName = currentUser?.displayName || "Guest";
  const userId = currentUser?.id ?? null;

  if (!content) {
    return NextResponse.json(
      { error: "Comment content is required." },
      { status: 400 },
    );
  }

  const result = await pool.query(
    `INSERT INTO comments (recipe_id, content, user_id, author_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, content, COALESCE(author_name, 'Guest') AS author_name`,
    [id, content, userId, authorName],
  );

  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}

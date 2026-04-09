import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const result = await pool.query(
    `SELECT
       id,
       content,
       user_id,
       COALESCE(author_name, 'Guest') AS author_name
     FROM comments
     WHERE recipe_id = $1
     ORDER BY id DESC`,
    [id],
  );

  return NextResponse.json({
    data: result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      author_name: row.author_name,
      can_delete: !!currentUser && Number(row.user_id) === currentUser.id,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const content = (body?.content ?? "").toString().trim();
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const authorName = currentUser.displayName;
  const userId = currentUser.id;

  if (!content) {
    return NextResponse.json(
      { error: "Comment content is required." },
      { status: 400 },
    );
  }

  const result = await pool.query(
    `INSERT INTO comments (recipe_id, content, user_id, author_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, content, user_id, COALESCE(author_name, 'Guest') AS author_name`,
    [id, content, userId, authorName],
  );

  const inserted = result.rows[0];

  return NextResponse.json(
    {
      data: {
        id: inserted.id,
        content: inserted.content,
        author_name: inserted.author_name,
        can_delete: true,
      },
    },
    { status: 201 },
  );
}

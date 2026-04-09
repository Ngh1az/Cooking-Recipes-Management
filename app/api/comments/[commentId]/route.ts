import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const commentResult = await pool.query<{ user_id: number | null }>(
    "SELECT user_id FROM comments WHERE id = $1",
    [commentId],
  );

  if (!commentResult.rows[0]) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (commentResult.rows[0].user_id !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await pool.query("DELETE FROM comments WHERE id=$1", [commentId]);

  return NextResponse.json({ success: true });
}

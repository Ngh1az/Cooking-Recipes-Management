import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;

  await pool.query("DELETE FROM comments WHERE id=$1", [commentId]);

  return NextResponse.json({ success: true });
}

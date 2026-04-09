import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

function getFileKind(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (ALLOWED_VIDEO_TYPES.has(file.type)) {
    return "video";
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please provide an image or video file." },
        { status: 400 },
      );
    }

    const fileKind = getFileKind(file);

    if (!fileKind) {
      return NextResponse.json(
        {
          error:
            "Only image (jpg/png/webp/...) and video (mp4/webm/ogg/mov) uploads are supported.",
        },
        { status: 400 },
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      (fileKind === "video" ? "mp4" : "jpg");
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "bin";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExtension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    await writeFile(path.join(uploadDir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/${fileName}`, kind: fileKind });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload media file." },
      { status: 500 },
    );
  }
}

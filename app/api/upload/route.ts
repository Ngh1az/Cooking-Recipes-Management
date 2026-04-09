import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

type DetectedFileType = {
  kind: "image" | "video";
  extension: "jpg" | "png" | "webp" | "gif" | "mp4" | "webm" | "ogg" | "mov";
};

function hasSignature(buffer: Buffer, signature: number[], offset = 0) {
  if (buffer.length < offset + signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

function detectFileType(buffer: Buffer): DetectedFileType | null {
  if (hasSignature(buffer, [0xff, 0xd8, 0xff])) {
    return { kind: "image", extension: "jpg" };
  }

  if (hasSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: "image", extension: "png" };
  }

  if (hasSignature(buffer, [0x47, 0x49, 0x46, 0x38])) {
    return { kind: "image", extension: "gif" };
  }

  const hasRiff = hasSignature(buffer, [0x52, 0x49, 0x46, 0x46]);
  const hasWebp = hasSignature(buffer, [0x57, 0x45, 0x42, 0x50], 8);
  if (hasRiff && hasWebp) {
    return { kind: "image", extension: "webp" };
  }

  if (hasSignature(buffer, [0x4f, 0x67, 0x67, 0x53])) {
    return { kind: "video", extension: "ogg" };
  }

  if (hasSignature(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { kind: "video", extension: "webm" };
  }

  if (hasSignature(buffer, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    if (brand.includes("qt")) {
      return { kind: "video", extension: "mov" };
    }
    return { kind: "video", extension: "mp4" };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit({
      key: `upload:${ip}`,
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many upload requests. Please retry later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please provide an image or video file." },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty." },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Max size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`,
        },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectFileType(buffer);

    if (!detectedType) {
      return NextResponse.json(
        {
          error:
            "Unsupported file format. Allowed: jpg, png, webp, gif, mp4, webm, ogg, mov.",
        },
        { status: 400 },
      );
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${detectedType.extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    await writeFile(path.join(uploadDir, fileName), buffer);

    return NextResponse.json({
      url: `/uploads/${fileName}`,
      kind: detectedType.kind,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload media file." },
      { status: 500 },
    );
  }
}

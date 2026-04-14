import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTodayDate } from "@/lib/time-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate MIME type against whitelist
  const ext = ALLOWED_EXTENSIONS[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Nur Bilder (JPG, PNG, WebP, GIF) und Videos (MP4, WebM, MOV) erlaubt" },
      { status: 400 }
    );
  }

  // Limit file size to 50MB
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 50MB)" }, { status: 400 });
  }

  const today = getTodayDate();
  // Use only the whitelisted extension, never from user input
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dirPath = path.join(process.cwd(), "public", "uploads", today);

  await mkdir(dirPath, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dirPath, filename), buffer);

  const url = `/uploads/${today}/${filename}`;
  return NextResponse.json({ url });
}

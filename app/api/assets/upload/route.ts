import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";

const allowed = ["image/jpeg","image/png","image/webp","audio/mpeg","audio/wav","audio/x-wav","audio/mp4","audio/x-m4a","audio/aac","audio/ogg","audio/webm"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: allowed,
        maximumSizeInBytes: 250 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload asset gagal." }, { status: 400 });
  }
}

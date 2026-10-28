import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const allowed = [
  "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4",
  "audio/x-m4a", "audio/aac", "audio/ogg", "audio/webm",
];

export async function POST(request: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[asset-upload] BLOB_READ_WRITE_TOKEN is missing in this deployment");
      return NextResponse.json(
        { error: "Penyimpanan file belum dikonfigurasi pada deployment ini. Hubungi administrator." },
        { status: 503 },
      );
    }

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
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.info("[asset-upload] completed", JSON.stringify({
          pathname: blob.pathname,
          size: blob.size,
          hasTokenPayload: Boolean(tokenPayload),
        }));
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload asset gagal.";
    // Log diagnostic context without exposing tokens, authorization headers, or file contents.
    console.error("[asset-upload] token/upload handshake failed", {
      message,
      hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      contentType: request.headers.get("content-type") || "",
    });
    return NextResponse.json(
      { error: "Handshake upload gagal: " + message.slice(0, 240) },
      { status: 500 },
    );
  }
}

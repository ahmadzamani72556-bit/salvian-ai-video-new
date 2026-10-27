import { NextResponse } from "next/server";
import { submitProviderLocal, getProviderStatusLocal } from "../../../../../lib/video-provider-adapters";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (process.env.VIDEO_ENGINE_SERVICE !== "1") return NextResponse.json({ error: "Internal video engine service is disabled." }, { status: 404 });
  const token = request.headers.get("x-salvian-engine-token") || "";
  if (!process.env.VIDEO_ENGINE_INTERNAL_TOKEN || token !== process.env.VIDEO_ENGINE_INTERNAL_TOKEN) return NextResponse.json({ error: "Unauthorized engine request." }, { status: 401 });
  try {
    const body = await request.json();
    if (body?.action === "submit") return NextResponse.json(await submitProviderLocal(body.provider, body.shot, body.project, body.settings));
    if (body?.action === "status") return NextResponse.json(await getProviderStatusLocal(body.provider, String(body.taskId)));
    return NextResponse.json({ error: "Unknown engine action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal video engine failed." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { queryMurekaVideoTask } from "../../../../lib/mureka-video";

export async function GET(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get("taskId")?.trim() || "";
    if (!taskId) return NextResponse.json({ error: "taskId wajib diisi." }, { status: 400 });

    const result = await queryMurekaVideoTask(taskId);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Status render tidak dapat diambil." }, { status: 502 });
  }
}

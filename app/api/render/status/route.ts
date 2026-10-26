import { NextResponse } from "next/server";

function statusToProgress(status: string): { stage: string; progress: number; terminal: boolean } {
  switch (status.toLowerCase()) {
    case "queued": return { stage: "provider-queued", progress: 22, terminal: false };
    case "running":
    case "processing": return { stage: "generation", progress: 58, terminal: false };
    case "succeeded": return { stage: "generation-complete", progress: 78, terminal: true };
    case "failed": return { stage: "generation-failed", progress: 20, terminal: true };
    case "cancelled": return { stage: "cancelled", progress: 0, terminal: true };
    default: return { stage: "generation", progress: 45, terminal: false };
  }
}

export async function GET(request: Request) {
  const taskId = new URL(request.url).searchParams.get("taskId")?.trim() || "";
  if (!taskId) return NextResponse.json({ error: "taskId wajib diisi." }, { status: 400 });

  const apiKey = process.env.SEEDANCE_API_KEY;
  const baseUrl = (process.env.SEEDANCE_API_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
  if (!apiKey) {
    return NextResponse.json({ result: { id: taskId, status: "failed", progress: 0, outputUrl: undefined, message: "Mesin video native belum memiliki kredensial produksi." } }, { status: 503 });
  }

  try {
    const response = await fetch(`${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ result: { id: taskId, status: "failed", progress: 0, outputUrl: undefined, message: "Status produksi tidak dapat dibaca dari mesin video." } }, { status: 502 });
    }

    const status = String(data?.status || "unknown").toLowerCase();
    const mapped = statusToProgress(status);
    const outputUrl = data?.content?.video_url || data?.content?.videoUrl || data?.video_url;
    const errorMessage = data?.error?.message || data?.message;
    const message = status === "succeeded"
      ? "Shot visual selesai dibuat."
      : status === "failed"
        ? "Mesin video melaporkan produksi shot gagal."
        : "Salvian sedang membuat shot visual.";

    return NextResponse.json({
      result: {
        id: taskId,
        status,
        progress: mapped.progress,
        stage: mapped.stage,
        outputUrl: outputUrl || undefined,
        message: errorMessage && status === "failed" ? "Produksi shot gagal dan tidak diteruskan." : message,
      },
    }, { status: 200 });
  } catch {
    return NextResponse.json({ result: { id: taskId, status: "running", progress: 45, stage: "generation", outputUrl: undefined, message: "Salvian masih terhubung ke mesin video." } }, { status: 200 });
  }
}

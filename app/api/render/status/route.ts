import { NextResponse } from "next/server";

/**
 * Native Salvian render status contract.
 *
 * The old route queried an external video provider. That dependency has been
 * permanently removed from Video NEW. Until the native render worker is wired,
 * this endpoint returns an explicit pending state instead of contacting another
 * product or provider.
 */
export async function GET(request: Request) {
  const taskId = new URL(request.url).searchParams.get("taskId")?.trim() || "";
  if (!taskId) return NextResponse.json({ error: "taskId wajib diisi." }, { status: 400 });

  return NextResponse.json({
    result: {
      id: taskId,
      status: "queued",
      progress: 0,
      outputUrl: undefined,
      message: "Mesin video native Salvian AI Video sedang disiapkan. Tidak ada koneksi ke Salvian AI Creator atau provider video lain.",
    },
  }, { status: 200 });
}

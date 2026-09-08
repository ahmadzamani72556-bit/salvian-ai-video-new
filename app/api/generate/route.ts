import { NextResponse } from "next/server";
import { productionEngine } from "../../../lib/production-engine";

const durations = [5, 6, 7, 8];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const duration = Number(body.duration);
    if (!topic) return NextResponse.json({ error: "Topik video wajib diisi." }, { status: 400 });
    if (!durations.includes(duration)) return NextResponse.json({ error: "Durasi tidak valid." }, { status: 400 });

    const style = typeof body.style === "string" ? body.style : "Cinematic";
    const ratio = typeof body.ratio === "string" ? body.ratio : "16:9";
    const language = typeof body.language === "string" ? body.language : "Indonesia";
    const voice = typeof body.voice === "string" ? body.voice : "Narator Natural";
    const music = typeof body.music === "string" ? body.music : "Ambient Cinematic";
    const autoStoryboard = body.autoStoryboard !== false;
    const autoSubtitle = body.autoSubtitle !== false;
    const smartPacing = body.smartPacing !== false;

    // Credit is intentionally consumed by the central Creator bridge, not a local Video wallet.
    // This API only generates the production package after the UI has successfully authorized the charge.
    const creditCost = 100 + duration * 25;
    const result = await productionEngine.generate({
      topic,
      duration,
      style,
      ratio,
      language,
      voice,
      music,
      autoStoryboard,
      autoSubtitle,
      smartPacing
    });
    return NextResponse.json({ ok: true, mode: result.mode, creditCost, project: result.project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Permintaan tidak dapat diproses.";
    const status = message.includes("Layanan AI") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

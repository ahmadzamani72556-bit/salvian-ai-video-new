import { NextResponse } from "next/server";
import { productionEngine } from "../../../lib/production-engine";
import { getVideoCreditCost } from "../../../lib/credit-pricing";

const durations = [5, 6, 7, 8];
const styles = ["Cinematic", "Documentary", "Realistic", "Anime", "Islamic Elegant"];
const ratios = ["16:9", "9:16", "1:1"];
const languages = ["Indonesia", "English", "Malay"];
const voices = ["Narator Natural", "Narator Deep", "Narator Warm", "Storytelling"];
const musicOptions = ["Ambient Cinematic", "Emotional Piano", "Documentary", "Minimal", "Tanpa Musik"];

function oneOf(value: unknown, allowed: string[], fallback: string, label: string) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !allowed.includes(value)) throw new Error(`${label} tidak valid.`);
  return value;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const duration = Number(body.duration);
    if (!topic) return NextResponse.json({ error: "Topik video wajib diisi." }, { status: 400 });
    if (!durations.includes(duration)) return NextResponse.json({ error: "Durasi tidak valid." }, { status: 400 });

    const style = oneOf(body.style, styles, "Cinematic", "Gaya visual");
    const ratio = oneOf(body.ratio, ratios, "16:9", "Rasio");
    const language = oneOf(body.language, languages, "Indonesia", "Bahasa");
    const voice = oneOf(body.voice, voices, "Narator Natural", "Voice-over");
    const music = oneOf(body.music, musicOptions, "Ambient Cinematic", "Musik");
    const autoStoryboard = body.autoStoryboard !== false;
    const autoSubtitle = body.autoSubtitle !== false;
    const smartPacing = body.smartPacing !== false;

    // FINAL pricing: one long-form production consumes one fixed Creator
    // transaction. No local Video wallet and no second render charge.
    const creditCost = getVideoCreditCost(duration);
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
    const status = message.includes("Layanan AI") ? 502 : message.endsWith("tidak valid.") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";

function fallback(message: string) {
  const text = message.toLowerCase();
  if (text.includes("storyboard")) return "AI Assistant aktif. Saya bisa menyusun storyboard per scene lengkap dengan visual, durasi, voice-over, dan transisi.";
  if (text.includes("script") || text.includes("naskah")) return "AI Assistant aktif. Saya bisa membuat naskah 5–8 menit dengan hook, isi, penutup, dan CTA.";
  if (text.includes("seo")) return "AI Assistant aktif. Saya bisa menyusun judul, deskripsi, dan tag SEO YouTube.";
  return "AI Assistant aktif. Saya siap membantu script, storyboard, voice-over, visual, subtitle, timeline, dan SEO.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: true, mode: "fallback", reply: fallback(message) });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: message }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "AI Assistant gagal merespons." }, { status: 502 });
    return NextResponse.json({ ok: true, mode: "openai", reply: data?.output_text || "AI Assistant tidak mengembalikan jawaban." });
  } catch {
    return NextResponse.json({ error: "AI Assistant tidak dapat memproses permintaan." }, { status: 500 });
  }
}

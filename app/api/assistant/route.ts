import { NextResponse } from "next/server";

function fallback(message: string) {
  const text = message.toLowerCase();
  if (text.includes("storyboard")) return "AI Assistant aktif dalam mode fallback. Saya bisa menyusun storyboard per scene lengkap dengan visual, durasi, voice-over, dan transisi.";
  if (text.includes("script") || text.includes("naskah")) return "AI Assistant aktif dalam mode fallback. Saya bisa membuat naskah 5–8 menit dengan hook, isi, penutup, dan CTA.";
  if (text.includes("seo")) return "AI Assistant aktif dalam mode fallback. Saya bisa menyusun judul, deskripsi, dan tag SEO YouTube.";
  return "AI Assistant aktif dalam mode fallback. Saya siap membantu script, storyboard, voice-over, visual, subtitle, timeline, dan SEO.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    // Never send an obvious non-OpenAI/Neon credential to the OpenAI endpoint.
    if (!apiKey || apiKey.toLowerCase().startsWith("postgres")) {
      return NextResponse.json({ ok: true, mode: "fallback", reply: fallback(message) });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: "Anda adalah SALVIAN AI ASSISTANT untuk SALVIAN AI VIDEO. Jawab dalam bahasa Indonesia secara ringkas, praktis, dan langsung bisa dipakai. Bantu pengguna membuat dan memperbaiki script, storyboard, voice-over, visual, subtitle, timeline, SEO YouTube, serta workflow project. Jangan mengaku sudah menjalankan engine, merender video, menyimpan file, atau mengubah project jika tindakan itu belum benar-benar dilakukan."
            }]
          },
          { role: "user", content: [{ type: "input_text", text: message }] }
        ]
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      // Keep provider/configuration errors out of the user-facing chat bubble.
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ ok: true, mode: "fallback", reply: fallback(message) });
      }
      return NextResponse.json({ error: "AI Assistant sedang mengalami gangguan. Coba lagi." }, { status: 502 });
    }

    const reply = typeof data?.output_text === "string" ? data.output_text.trim() : "";
    return NextResponse.json({ ok: true, mode: "openai", reply: reply || "AI Assistant tidak mengembalikan jawaban." });
  } catch {
    return NextResponse.json({ error: "AI Assistant tidak dapat memproses permintaan." }, { status: 500 });
  }
}

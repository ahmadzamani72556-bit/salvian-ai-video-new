import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";

function fallback(message: string, projectTitle: string) {
  const text = message.toLowerCase();
  if (text.includes("storyboard")) return `Untuk project “${projectTitle}”, saya bisa menyusun storyboard per scene lengkap dengan visual, durasi, voice-over, dan transisi. Mulai dari hook 15–30 detik, lalu pecah isi utama menjadi scene yang ritmenya stabil.`;
  if (text.includes("script") || text.includes("naskah")) return `Untuk project “${projectTitle}”, saya bisa membuat naskah 5–8 menit dengan hook, pembukaan, isi utama, penutup, dan CTA. Tulis topik videonya agar naskah bisa langsung dibuat.`;
  if (text.includes("seo")) return `Untuk project “${projectTitle}”, SEO sebaiknya berisi judul yang kuat, deskripsi dengan keyword alami, dan tag yang relevan. Saya bisa menyusunnya sekaligus setelah topik videonya diketahui.`;
  return `Saya menerima permintaan Anda untuk project “${projectTitle}”. Saya siap membantu script, storyboard, voice-over, visual, subtitle, timeline, dan SEO. Kirim perintah yang lebih spesifik, misalnya “Buatkan script 7 menit tentang …”.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const projectTitle = typeof body.projectTitle === "string" ? body.projectTitle.trim() : "Project Video";
    const projectContext = typeof body.projectContext === "string" ? body.projectContext.trim() : "";
    if (!message) return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: true, mode: "fallback", reply: fallback(message, projectTitle) });

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: [
          { role: "system", content: [{ type: "input_text", text: "Anda adalah SALVIAN AI ASSISTANT untuk produksi video YouTube. Jawab dalam bahasa Indonesia dengan ringkas, praktis, dan langsung bisa dipakai. Bantu script, storyboard, voice-over, visual, subtitle, timeline, dan SEO. Jangan mengaku telah menjalankan engine atau menyimpan perubahan jika belum dilakukan." }] },
          { role: "user", content: [{ type: "input_text", text: `Project: ${projectTitle}\nKonteks: ${projectContext || "tidak ada"}\nPermintaan: ${message}` }] },
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "AI Assistant gagal merespons." }, { status: 502 });
    const reply = typeof data?.output_text === "string" ? data.output_text.trim() : "AI Assistant tidak mengembalikan jawaban.";
    return NextResponse.json({ ok: true, mode: "openai", reply });
  } catch {
    return NextResponse.json({ error: "AI Assistant tidak dapat memproses permintaan." }, { status: 500 });
  }
}

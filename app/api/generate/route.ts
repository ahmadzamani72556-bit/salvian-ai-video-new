import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const duration = Number(body.duration);
    if (!topic) return NextResponse.json({ error: "Topik video wajib diisi." }, { status: 400 });
    if (![5, 6, 7, 8].includes(duration)) return NextResponse.json({ error: "Durasi tidak valid." }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        mode: "preview",
        project: {
          title: topic,
          duration,
          status: "Menunggu AI",
          message: "Project berhasil dibuat. Sambungkan OPENAI_API_KEY di environment deployment untuk mengaktifkan generasi AI penuh."
        }
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: `Buat outline video YouTube berbahasa Indonesia berdasarkan topik: ${topic}. Durasi ${duration} menit. Kembalikan judul, hook, struktur 5-8 bagian, dan penutup. Fokus informatif dan siap dikembangkan menjadi naskah.`
      })
    });
    if (!response.ok) return NextResponse.json({ error: "Layanan AI sedang tidak tersedia." }, { status: 502 });
    const data = await response.json();
    return NextResponse.json({ ok: true, mode: "ai", project: { title: topic, duration, status: "Script siap", output: data.output_text || "" } });
  } catch {
    return NextResponse.json({ error: "Permintaan tidak dapat diproses." }, { status: 500 });
  }
}

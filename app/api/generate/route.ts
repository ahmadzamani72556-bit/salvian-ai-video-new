import { NextResponse } from "next/server";

const durations = [5, 6, 7, 8];

function fallbackProject(topic: string, duration: number) {
  const scenes = Array.from({ length: Math.max(5, Math.min(8, duration)) }, (_, i) => ({
    number: i + 1,
    title: `Scene ${i + 1}`,
    visual: `Visual sinematik yang relevan dengan topik: ${topic}`,
    duration: Math.round((duration * 60) / Math.max(5, Math.min(8, duration))),
    voice: `Narasi scene ${i + 1} untuk topik ${topic}.`
  }));
  return {
    title: topic,
    duration,
    status: "Siap diproses",
    hook: `Mengapa ${topic} penting untuk dibahas? Simak sampai akhir.`,
    script: `Pembukaan tentang ${topic}, dilanjutkan penjelasan utama, contoh, poin penting, dan kesimpulan yang mudah dipahami penonton YouTube.`,
    scenes,
    subtitles: scenes.map(s => ({ start: (s.number - 1) * s.duration, end: s.number * s.duration, text: s.title })),
    voice: { status: "ready", style: "Narator pria dewasa, jelas, natural, gaya dokumenter Indonesia" },
    render: { status: "queued", format: "MP4", resolution: "1080p" },
    seo: { title: topic, description: `Video YouTube tentang ${topic}.`, tags: [topic, "YouTube", "Indonesia", "SALVIAN AI VIDEO"] }
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const duration = Number(body.duration);
    if (!topic) return NextResponse.json({ error: "Topik video wajib diisi." }, { status: 400 });
    if (!durations.includes(duration)) return NextResponse.json({ error: "Durasi tidak valid." }, { status: 400 });

    // Credit is intentionally consumed by the central Creator bridge, not a local Video wallet.
    // This API only returns the production package after the UI has successfully authorized the charge.
    const creditCost = 100 + duration * 25;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: true, mode: "preview", creditCost, project: fallbackProject(topic, duration) });

    const prompt = `Anda adalah mesin produksi video YouTube SALVIAN AI VIDEO. Buat paket produksi berbahasa Indonesia untuk topik: ${topic}. Durasi: ${duration} menit. Kembalikan JSON valid dengan field: title, hook, script (naskah lengkap), scenes (array berisi number,title,visual,duration,voice), subtitles (array start,end,text), voice (status,style), seo (title,description,tags). Jangan gunakan markdown dan jangan menambahkan field di luar JSON.`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: prompt })
    });
    if (!response.ok) return NextResponse.json({ error: "Layanan AI sedang tidak tersedia." }, { status: 502 });
    const data = await response.json();
    const raw = data.output_text || "";
    let project;
    try { project = JSON.parse(raw); } catch { project = { ...fallbackProject(topic, duration), script: raw }; }
    project.duration = duration;
    project.status = "Script & scene siap";
    project.render = { status: "queued", format: "MP4", resolution: "1080p" };
    return NextResponse.json({ ok: true, mode: "ai", creditCost, project });
  } catch {
    return NextResponse.json({ error: "Permintaan tidak dapat diproses." }, { status: 500 });
  }
}

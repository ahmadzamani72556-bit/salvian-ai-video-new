export type ProductionRequest = {
  topic: string;
  duration: number;
};

export type ProductionResult = {
  mode: "preview" | "ai";
  project: Record<string, any>;
};

export interface ProductionEngine {
  generate(request: ProductionRequest): Promise<ProductionResult>;
}

function fallbackProject(topic: string, duration: number) {
  const count = Math.max(5, Math.min(8, duration));
  const sceneDuration = Math.round((duration * 60) / count);
  const scenes = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    title: `Scene ${i + 1}`,
    visual: `Visual sinematik yang relevan dengan topik: ${topic}`,
    duration: sceneDuration,
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

function normalizeProject(value: unknown, topic: string, duration: number) {
  const base = fallbackProject(topic, duration);
  if (!value || typeof value !== "object") return base;
  const input = value as Record<string, any>;
  const scenes = Array.isArray(input.scenes) ? input.scenes.filter(Boolean).map((scene: any, index: number) => ({
    number: index + 1,
    title: String(scene?.title || `Scene ${index + 1}`),
    visual: String(scene?.visual || `Visual relevan dengan topik: ${topic}`),
    duration: Math.max(1, Number(scene?.duration) || base.scenes[index % base.scenes.length].duration),
    voice: String(scene?.voice || "")
  })) : base.scenes;
  return {
    ...base,
    ...input,
    title: String(input.title || topic),
    duration,
    scenes,
    subtitles: Array.isArray(input.subtitles) ? input.subtitles : base.subtitles,
    voice: input.voice && typeof input.voice === "object" ? input.voice : base.voice,
    render: input.render && typeof input.render === "object" ? input.render : base.render,
    seo: input.seo && typeof input.seo === "object" ? input.seo : base.seo
  };
}

class OpenAIProductionEngine implements ProductionEngine {
  async generate({ topic, duration }: ProductionRequest): Promise<ProductionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { mode: "preview", project: fallbackProject(topic, duration) };

    const prompt = `Anda adalah mesin produksi video YouTube SALVIAN AI VIDEO. Buat paket produksi berbahasa Indonesia untuk topik: ${topic}. Durasi: ${duration} menit. Kembalikan JSON valid dengan field: title, hook, script (naskah lengkap), scenes (array berisi number,title,visual,duration,voice), subtitles (array start,end,text), voice (status,style), seo (title,description,tags). Jangan gunakan markdown dan jangan menambahkan field di luar JSON.`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: prompt })
    });
    if (!response.ok) throw new Error("Layanan AI sedang tidak tersedia.");

    const data = await response.json();
    const raw = data.output_text || "";
    let project: unknown;
    try { project = JSON.parse(raw); }
    catch { project = { ...fallbackProject(topic, duration), script: raw }; }

    return {
      mode: "ai",
      project: {
        ...normalizeProject(project, topic, duration),
        status: "Script & scene siap",
        render: { status: "queued", format: "MP4", resolution: "1080p" }
      }
    };
  }
}

export const productionEngine: ProductionEngine = new OpenAIProductionEngine();

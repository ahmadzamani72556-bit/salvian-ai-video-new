export type ProductionRequest = {
  topic: string;
  duration: number;
  style: string;
  ratio: string;
  language: string;
  voice: string;
  music: string;
  autoStoryboard: boolean;
  autoSubtitle: boolean;
  smartPacing: boolean;
};

export type ProductionResult = {
  mode: "preview" | "ai";
  project: Record<string, any>;
};

export interface ProductionEngine {
  generate(request: ProductionRequest): Promise<ProductionResult>;
}

function fallbackProject(request: ProductionRequest) {
  const { topic, duration, style, ratio, language, voice, music, autoStoryboard, autoSubtitle, smartPacing } = request;
  const count = Math.max(5, Math.min(8, duration));
  const sceneDuration = Math.round((duration * 60) / count);
  const scenes = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    title: `Scene ${i + 1}`,
    visual: `Visual ${style.toLowerCase()} yang relevan dengan topik: ${topic}`,
    duration: sceneDuration,
    voice: `Narasi scene ${i + 1} untuk topik ${topic}.`
  }));
  return {
    title: topic,
    duration,
    status: "Siap diproses",
    hook: `Mengapa ${topic} penting untuk dibahas? Simak sampai akhir.`,
    script: `Pembukaan tentang ${topic}, dilanjutkan penjelasan utama, contoh, poin penting, dan kesimpulan yang mudah dipahami penonton YouTube.`,
    scenes: autoStoryboard ? scenes : [],
    subtitles: autoSubtitle ? scenes.map(s => ({ start: (s.number - 1) * s.duration, end: s.number * s.duration, text: s.title })) : [],
    voice: { status: "ready", style: voice, language },
    audio: { voice, music, language },
    visual: { style, ratio },
    timeline: { pacing: smartPacing ? "Smart" : "Manual" },
    render: { status: "queued", format: "MP4", resolution: "1080p" },
    seo: { title: topic, description: `Video YouTube tentang ${topic}.`, tags: [topic, "YouTube", language, "SALVIAN AI VIDEO"] }
  };
}

function normalizeProject(value: unknown, request: ProductionRequest) {
  const base = fallbackProject(request);
  if (!value || typeof value !== "object") return base;
  const input = value as Record<string, any>;
  const sourceScenes = Array.isArray(input.scenes) ? input.scenes.filter(Boolean) : base.scenes;
  const scenes = sourceScenes.map((scene: any, index: number) => ({
    number: index + 1,
    title: String(scene?.title || `Scene ${index + 1}`),
    visual: String(scene?.visual || `Visual relevan dengan topik: ${request.topic}`),
    duration: Math.max(1, Number(scene?.duration) || Math.round((request.duration * 60) / Math.max(1, sourceScenes.length))),
    voice: String(scene?.voice || "")
  }));
  return {
    ...base,
    ...input,
    title: String(input.title || request.topic),
    duration: request.duration,
    scenes,
    subtitles: Array.isArray(input.subtitles) ? input.subtitles : base.subtitles,
    voice: input.voice && typeof input.voice === "object" ? input.voice : base.voice,
    audio: input.audio && typeof input.audio === "object" ? input.audio : base.audio,
    visual: input.visual && typeof input.visual === "object" ? input.visual : base.visual,
    timeline: input.timeline && typeof input.timeline === "object" ? input.timeline : base.timeline,
    render: input.render && typeof input.render === "object" ? input.render : base.render,
    seo: input.seo && typeof input.seo === "object" ? input.seo : base.seo
  };
}

class OpenAIProductionEngine implements ProductionEngine {
  async generate(request: ProductionRequest): Promise<ProductionResult> {
    const { topic, duration, style, ratio, language, voice, music, autoStoryboard, autoSubtitle, smartPacing } = request;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { mode: "preview", project: fallbackProject(request) };

    const prompt = `Anda adalah mesin produksi video YouTube SALVIAN AI VIDEO. Buat paket produksi lengkap untuk topik: ${topic}. Durasi: ${duration} menit. Bahasa: ${language}. Gaya visual: ${style}. Rasio: ${ratio}. Voice-over: ${voice}. Musik: ${music}. Auto storyboard: ${autoStoryboard}. Auto subtitle: ${autoSubtitle}. Smart pacing: ${smartPacing}. Kembalikan JSON valid dengan field: title, hook, script (naskah lengkap), scenes (array berisi number,title,visual,duration,voice), subtitles (array start,end,text), voice (status,style,language), audio, visual, timeline, seo (title,description,tags). Jangan gunakan markdown dan jangan menambahkan field di luar JSON.`;
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
    catch { project = { ...fallbackProject(request), script: raw }; }

    return {
      mode: "ai",
      project: {
        ...normalizeProject(project, request),
        status: "Script & scene siap",
        render: { status: "queued", format: "MP4", resolution: "1080p" }
      }
    };
  }
}

export const productionEngine: ProductionEngine = new OpenAIProductionEngine();

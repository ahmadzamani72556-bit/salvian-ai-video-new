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

function exactSceneDurations(source: any[], targetSeconds: number) {
  const safe = source.length ? source : [{ duration: targetSeconds }];
  const weights = safe.map((scene) => {
    const value = Number(scene?.duration);
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const durations: number[] = [];
  let allocated = 0;

  for (let i = 0; i < safe.length; i += 1) {
    if (i === safe.length - 1) {
      durations.push(Math.max(1, targetSeconds - allocated));
      break;
    }
    const remainingScenes = safe.length - i - 1;
    const proportional = Math.round((targetSeconds * weights[i]) / totalWeight);
    const maxAllowed = Math.max(1, targetSeconds - allocated - remainingScenes);
    const next = Math.min(maxAllowed, Math.max(1, proportional));
    durations.push(next);
    allocated += next;
  }

  return durations;
}

function normalizeSubtitles(input: unknown, scenes: any[], targetSeconds: number) {
  if (!Array.isArray(input) || !input.length) {
    return scenes.map((scene) => ({
      start: scene.start,
      end: scene.end,
      text: scene.title
    }));
  }

  const raw = input.filter(Boolean);
  const maxEnd = Math.max(...raw.map((item: any) => Number(item?.end) || 0), 0);
  if (!maxEnd) return scenes.map((scene) => ({ start: scene.start, end: scene.end, text: scene.title }));

  const scale = targetSeconds / maxEnd;
  return raw.map((item: any, index: number) => {
    const start = Math.max(0, Math.round((Number(item?.start) || 0) * scale));
    const end = Math.min(targetSeconds, Math.max(start + 1, Math.round((Number(item?.end) || 0) * scale)));
    return {
      start,
      end,
      text: String(item?.text || scenes[index % scenes.length]?.title || "")
    };
  });
}

function normalizeLongFormProject(value: unknown, request: ProductionRequest) {
  const base = fallbackProject(request);
  if (!value || typeof value !== "object") return base;
  const input = value as Record<string, any>;
  const sourceScenes = Array.isArray(input.scenes) && input.scenes.length ? input.scenes.filter(Boolean) : base.scenes;
  const targetSeconds = request.duration * 60;
  const durations = exactSceneDurations(sourceScenes, targetSeconds);
  let cursor = 0;
  const scenes = sourceScenes.map((scene: any, index: number) => {
    const duration = durations[index];
    const normalized = {
      number: index + 1,
      title: String(scene?.title || `Scene ${index + 1}`),
      visual: String(scene?.visual || `Visual relevan dengan topik: ${request.topic}`),
      duration,
      start: cursor,
      end: cursor + duration,
      voice: String(scene?.voice || "")
    };
    cursor += duration;
    return normalized;
  });

  const subtitles = request.autoSubtitle
    ? normalizeSubtitles(input.subtitles, scenes, targetSeconds)
    : [];

  return {
    ...base,
    ...input,
    title: String(input.title || request.topic),
    duration: request.duration,
    durationSeconds: targetSeconds,
    scenes,
    subtitles,
    voice: input.voice && typeof input.voice === "object" ? input.voice : base.voice,
    audio: input.audio && typeof input.audio === "object" ? { ...base.audio, ...input.audio, durationSeconds: targetSeconds } : { ...base.audio, durationSeconds: targetSeconds },
    visual: input.visual && typeof input.visual === "object" ? input.visual : base.visual,
    timeline: input.timeline && typeof input.timeline === "object" ? { ...base.timeline, ...input.timeline, durationSeconds: targetSeconds } : { ...base.timeline, durationSeconds: targetSeconds },
    render: input.render && typeof input.render === "object" ? { ...base.render, ...input.render, durationSeconds: targetSeconds } : { ...base.render, durationSeconds: targetSeconds },
    seo: input.seo && typeof input.seo === "object" ? input.seo : base.seo
  };
}

function fallbackProject(request: ProductionRequest) {
  const { topic, duration, style, ratio, language, voice, music, autoStoryboard, autoSubtitle, smartPacing } = request;
  const count = Math.max(5, Math.min(8, duration));
  const targetSeconds = duration * 60;
  const baseScenes = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    title: `Scene ${i + 1}`,
    visual: `Visual ${style.toLowerCase()} yang relevan dengan topik: ${topic}`,
    duration: Math.round(targetSeconds / count),
    voice: `Narasi scene ${i + 1} untuk topik ${topic}.`
  }));
  const durations = exactSceneDurations(baseScenes, targetSeconds);
  let cursor = 0;
  const scenes = baseScenes.map((scene, i) => {
    const normalized = { ...scene, duration: durations[i], start: cursor, end: cursor + durations[i] };
    cursor += durations[i];
    return normalized;
  });
  return {
    title: topic,
    duration,
    durationSeconds: targetSeconds,
    status: "Siap diproses",
    hook: `Mengapa ${topic} penting untuk dibahas? Simak sampai akhir.`,
    script: `Pembukaan tentang ${topic}, dilanjutkan penjelasan utama, contoh, poin penting, dan kesimpulan yang mudah dipahami penonton YouTube.`,
    scenes: autoStoryboard ? scenes : [],
    subtitles: autoSubtitle ? scenes.map(s => ({ start: s.start, end: s.end, text: s.title })) : [],
    voice: { status: "ready", style: voice, language },
    audio: { voice, music, language, durationSeconds: targetSeconds },
    visual: { style, ratio },
    timeline: { pacing: smartPacing ? "Smart" : "Manual", durationSeconds: targetSeconds },
    render: { status: "queued", format: "MP4", resolution: "1080p", durationSeconds: targetSeconds },
    seo: { title: topic, description: `Video YouTube tentang ${topic}.`, tags: [topic, "YouTube", language, "SALVIAN AI VIDEO"] }
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
        ...normalizeLongFormProject(project, request),
        status: "Script & scene siap",
        render: { ...(normalizeLongFormProject(project, request).render || {}), status: "queued", format: "MP4", resolution: "1080p", durationSeconds: request.duration * 60 }
      }
    };
  }
}

export const productionEngine: ProductionEngine = new OpenAIProductionEngine();

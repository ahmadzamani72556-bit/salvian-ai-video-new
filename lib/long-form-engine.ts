export type LongFormProvider = "seedance-2.5" | "kling-3.0-omni" | "veo-3.1";
export type LongFormStage = "planning" | "music-analysis" | "shot-planning" | "generation" | "continuity" | "audio" | "assembly" | "finalizing";

export type ProductionLog = {
  at: string;
  stage: LongFormStage;
  label: string;
  detail?: string;
  provider?: LongFormProvider;
  progress: number;
};

export type MusicGuide = {
  url?: string;
  name?: string;
  durationSeconds?: number;
  bpm?: number;
  beatOffsetSeconds?: number;
  energy?: "low" | "medium" | "high";
  syncMode?: "beat" | "phrase" | "free";
};

export type LongFormShot = {
  id: string;
  scene: number;
  duration: number;
  prompt: string;
  provider: LongFormProvider;
  referenceShotId?: string;
  extendFrom?: string;
  beatStart?: number;
  beatEnd?: number;
};

export type LongFormPlan = {
  durationSeconds: number;
  shots: LongFormShot[];
  music?: MusicGuide;
  logs: ProductionLog[];
};

const now = () => new Date().toISOString();
const log = (logs: ProductionLog[], stage: LongFormStage, label: string, progress: number, detail?: string, provider?: LongFormProvider) => {
  logs.push({ at: now(), stage, label, detail, provider, progress });
};

function providerReady(provider: LongFormProvider): boolean {
  if (provider === "seedance-2.5") return Boolean(process.env.SEEDANCE_API_KEY);
  if (provider === "kling-3.0-omni") return Boolean(process.env.KLING_API_KEY && process.env.KLING_API_URL);
  return Boolean(process.env.VEO_API_KEY && process.env.VEO_API_URL);
}

function chooseProvider(prompt: string, sceneIndex: number): LongFormProvider {
  const text = prompt.toLowerCase();
  // Seedance is the active native production path. Other engines remain optional
  // adapters and are selected only after their credentials are actually configured.
  if (providerReady("seedance-2.5")) return "seedance-2.5";
  if (/dialog|dialogue|speaks|berbicara|voice|nyanyi|sing/.test(text) && providerReady("kling-3.0-omni")) return "kling-3.0-omni";
  if (/realistic|photoreal|close-up|close up|hero|cinematic/.test(text) && sceneIndex % 5 === 0 && providerReady("veo-3.1")) return "veo-3.1";
  return "seedance-2.5";
}

function makeBeatWindows(total: number, bpm?: number, offset = 0): number[] {
  if (!bpm || bpm <= 0) return [];
  const step = 60 / bpm;
  const points: number[] = [];
  for (let t = Math.max(0, offset); t < total; t += step) points.push(Number(t.toFixed(3)));
  return points;
}

export function buildLongFormPlan(project: any): LongFormPlan {
  const durationSeconds = Math.round(Number(project?.duration || 7) * 60);
  if (![300, 360, 420, 480].includes(durationSeconds)) throw new Error("Durasi long-form harus 5, 6, 7, atau 8 menit.");
  const logs: ProductionLog[] = [];
  log(logs, "planning", "Salvian Director menyusun film utuh", 4, `${durationSeconds / 60} menit · satu output final`);
  const scenes = Array.isArray(project?.scenes) && project.scenes.length ? project.scenes : [{ number: 1, title: "Opening", visual: project?.topic || project?.script || "", duration: durationSeconds, voice: "" }];
  const music: MusicGuide | undefined = project?.musicAsset ? project.musicAsset : undefined;
  if (music) log(logs, "music-analysis", "Menganalisis lagu dan ritme", 9, music.name || "Audio reference");

  const beats = makeBeatWindows(durationSeconds, music?.bpm, music?.beatOffsetSeconds || 0);
  const shots: LongFormShot[] = [];
  let cursor = 0;
  let sequence = 0;
  for (const scene of scenes) {
    const sceneSeconds = Math.max(1, Number(scene.duration) || 1);
    const shotCount = Math.max(1, Math.ceil(sceneSeconds / 30));
    const base = sceneSeconds / shotCount;
    for (let i = 0; i < shotCount; i++) {
      const seconds = Math.min(30, Math.max(4, Number(base.toFixed(2))));
      const prompt = [scene.title, scene.visual, scene.voice, music ? `Edit visual rhythm to follow ${music.syncMode || "phrase"} timing.` : "", "Maintain visual continuity with the previous shot."].filter(Boolean).join(". ");
      const provider = chooseProvider(prompt, sequence);
      const previous = shots[shots.length - 1];
      shots.push({
        id: `shot-${sequence + 1}`,
        scene: Number(scene.number) || sequence + 1,
        duration: seconds,
        prompt,
        provider,
        referenceShotId: previous?.id,
        extendFrom: previous?.id,
        beatStart: beats.length ? beats.reduce((p, b) => Math.abs(b - cursor) < Math.abs(p - cursor) ? b : p, beats[0]) : undefined,
        beatEnd: beats.length ? beats.reduce((p, b) => Math.abs(b - (cursor + seconds)) < Math.abs(p - (cursor + seconds)) ? b : p, beats[0]) : undefined,
      });
      cursor += seconds;
      sequence += 1;
    }
  }

  log(logs, "shot-planning", `Storyboard dipecah menjadi ${shots.length} shot`, 16, "Salvian memilih jalur mesin yang benar-benar tersedia");
  const providers = [...new Set(shots.map(s => s.provider))];
  providers.forEach((provider, index) => log(logs, "generation", "Mesin visual siap untuk produksi", 20 + index * 3, "Detail mesin tetap internal", provider));
  log(logs, "continuity", "Menyiapkan reference frame dan continuity state", 32, "Karakter, lokasi, kamera, wardrobe, lighting");
  log(logs, "audio", music ? "Menyiapkan sinkronisasi visual dengan lagu" : "Menyiapkan voice-over dan ambience", 38);
  log(logs, "assembly", "Menyiapkan timeline master", 48, "Semua shot akan dirakit menjadi satu video");
  return { durationSeconds, shots, music, logs };
}

export function providerEndpoint(provider: LongFormProvider): string | null {
  if (provider === "seedance-2.5") return process.env.SEEDANCE_API_URL || "https://ark.cn-beijing.volces.com/api/v3";
  if (provider === "kling-3.0-omni") return process.env.KLING_API_URL || null;
  return process.env.VEO_API_URL || null;
}

export function missingProviderConfiguration(plan: LongFormPlan): string[] {
  return [...new Set(plan.shots.map(s => s.provider))].filter(provider => !providerReady(provider));
}

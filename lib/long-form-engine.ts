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

function chooseProvider(prompt: string, sceneIndex: number): LongFormProvider {
  const text = prompt.toLowerCase();
  if (/dialog|dialogue|speaks|berbicara|voice|nyanyi|sing/.test(text)) return "kling-3.0-omni";
  if (/realistic|photoreal|close-up|close up|hero|cinematic/.test(text) && sceneIndex % 5 === 0) return "veo-3.1";
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
  const scenes = Array.isArray(project?.scenes) && project.scenes.length ? project.scenes : [{ number: 1, title: "Opening", visual: project?.topic || "", duration: durationSeconds, voice: "" }];
  const music: MusicGuide | undefined = project?.musicAsset ? project.musicAsset : undefined;
  if (music) log(logs, "music-analysis", "Menganalisis lagu dan ritme", 9, music.name || "Audio reference");

  const totalScene = scenes.reduce((sum: number, s: any) => sum + Math.max(1, Number(s.duration) || 1), 0);
  const beats = makeBeatWindows(durationSeconds, music?.bpm, music?.beatOffsetSeconds || 0);
  const shots: LongFormShot[] = [];
  let cursor = 0;
  let sequence = 0;
  for (const scene of scenes) {
    const sceneSeconds = Math.max(1, Number(scene.duration) || 1);
    const shotCount = Math.max(1, Math.ceil(sceneSeconds / 15));
    const base = sceneSeconds / shotCount;
    for (let i = 0; i < shotCount; i++) {
      const seconds = Math.min(30, Math.max(4, Number(base.toFixed(2))));
      const prompt = [scene.title, scene.visual, scene.voice, music ? `Edit visual rhythm to follow ${music.syncMode || "phrase"} timing.` : ""].filter(Boolean).join(". ");
      const provider = chooseProvider(prompt, sequence);
      const previous = shots[shots.length - 1];
      const shot: LongFormShot = {
        id: `shot-${sequence + 1}`,
        scene: Number(scene.number) || sequence + 1,
        duration: seconds,
        prompt,
        provider,
        referenceShotId: previous?.id,
        extendFrom: previous?.id,
        beatStart: beats.length ? beats.reduce((p, b) => Math.abs(b - cursor) < Math.abs(p - cursor) ? b : p, beats[0]) : undefined,
        beatEnd: beats.length ? beats.reduce((p, b) => Math.abs(b - (cursor + seconds)) < Math.abs(p - (cursor + seconds)) ? b : p, beats[0]) : undefined,
      };
      shots.push(shot);
      cursor += seconds;
      sequence += 1;
    }
  }
  log(logs, "shot-planning", `Storyboard dipecah menjadi ${shots.length} shot`, 16, "Pemilihan mesin dilakukan otomatis oleh Salvian");
  const providers = [...new Set(shots.map(s => s.provider))];
  providers.forEach((provider, index) => log(logs, "generation", `Menyiapkan jalur ${provider}`, 20 + index * 3, "Provider detail tetap internal", provider));
  log(logs, "continuity", "Menyiapkan reference frame dan continuity state", 32, "Karakter, lokasi, kamera, wardrobe, lighting");
  log(logs, "audio", music ? "Menyiapkan sinkronisasi visual dengan lagu" : "Menyiapkan voice-over dan ambience", 38);
  log(logs, "assembly", "Menyiapkan timeline master", 48, "Semua shot akan dirakit menjadi satu video");
  return { durationSeconds, shots, music, logs };
}

export function providerEndpoint(provider: LongFormProvider): string | null {
  if (provider === "seedance-2.5") return process.env.SEEDANCE_API_URL || null;
  if (provider === "kling-3.0-omni") return process.env.KLING_API_URL || null;
  return process.env.VEO_API_URL || null;
}

export function missingProviderConfiguration(plan: LongFormPlan): string[] {
  return [...new Set(plan.shots.map(s => s.provider))].filter(provider => !providerEndpoint(provider));
}

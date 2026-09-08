export type VideoScene = {
  number: number;
  title: string;
  visual: string;
  duration: number;
  voice?: string;
};

export type VideoProject = {
  id: string;
  title: string;
  status: string;
  duration: number;
  topic?: string;
  style?: string;
  ratio?: string;
  language?: string;
  voice?: string;
  music?: string;
  scenes: VideoScene[];
  updatedAt: string;
};

export type RenderSettings = {
  projectId: string;
  projectTitle: string;
  resolution: string;
  fps: string;
  quality: string;
  format: string;
  updatedAt: string;
};

const ACTIVE_KEY = "salvian-video-active-project";
const WORKSPACE_KEY = "salvian-video-workspace";
const RENDER_KEY = "salvian-video-render-settings";

export function makeProjectId(title: string) {
  return `video-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"}`;
}

export function readActiveProject(): VideoProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<VideoProject>;
    if (!value.title) return null;
    return {
      id: value.id || makeProjectId(value.title),
      title: value.title,
      status: value.status || "Draft",
      duration: Number(value.duration) || 7,
      topic: value.topic,
      style: value.style,
      ratio: value.ratio,
      language: value.language,
      voice: value.voice,
      music: value.music,
      scenes: Array.isArray(value.scenes) ? value.scenes : [],
      updatedAt: value.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveActiveProject(project: VideoProject) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(project));
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(project));
}

export function saveRenderSettings(settings: RenderSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RENDER_KEY, JSON.stringify(settings));
}

export function readRenderSettings(): RenderSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RENDER_KEY);
    return raw ? (JSON.parse(raw) as RenderSettings) : null;
  } catch {
    return null;
  }
}

export function clearProjectState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
  localStorage.removeItem(RENDER_KEY);
}

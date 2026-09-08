export type VideoScene = {
  number: number;
  title: string;
  visual: string;
  duration: number;
  voice?: string;
};

export type AudioConfig = {
  voice: string;
  music: string;
  language: string;
  voiceVolume: number;
  musicVolume: number;
  fadeIn: boolean;
  fadeOut: boolean;
  voiceEngine: string;
  musicEngine: string;
  ducking: boolean;
  muted: boolean;
};

export type VisualConfig = {
  style: string;
  cameraMotion: string;
  lighting: string;
  transition: string;
  assetMode: string;
};

export type SubtitleConfig = {
  enabled: boolean;
  language: string;
  style: string;
  position: string;
  size: string;
  outline: boolean;
};

export type TimelineConfig = {
  pacing: string;
  transitionDuration: number;
  introDuration: number;
  outroDuration: number;
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
  script?: string;
  autoStoryboard?: boolean;
  autoSubtitle?: boolean;
  smartPacing?: boolean;
  audio?: AudioConfig;
  visual?: VisualConfig;
  subtitle?: SubtitleConfig;
  timeline?: TimelineConfig;
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

export type RenderJob = {
  id: string;
  projectId: string;
  projectTitle: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  stage: string;
  progress: number;
  settings: Omit<RenderSettings, "updatedAt">;
  readiness: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  engine: "pending" | "connected";
  output: { url?: string; format?: string } | null;
  message: string;
};

const ACTIVE_KEY = "salvian-video-active-project";
const WORKSPACE_KEY = "salvian-video-workspace";
const PROJECTS_KEY = "salvian-video-projects";
const RENDER_KEY = "salvian-video-render-settings";
const RENDER_JOBS_KEY = "salvian-video-render-jobs";
const DRAFT_PREFIX = "salvian-video-draft:";

export function makeProjectId(title: string) {
  return `video-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"}`;
}

export function createProjectId(title: string) {
  const base = makeProjectId(title);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base}-${suffix}`;
}

function buildDefaultAudio(value: Partial<VideoProject>): AudioConfig {
  return { voice: value.voice || "Narator Natural", music: value.music || "Ambient Cinematic", language: value.language || "Indonesia", voiceVolume: 100, musicVolume: 35, fadeIn: true, fadeOut: true, voiceEngine: "Provider Voice", musicEngine: "Provider Music", ducking: true, muted: false };
}
function buildDefaultVisual(value: Partial<VideoProject>): VisualConfig {
  return { style: value.style || "Cinematic", cameraMotion: "Smart", lighting: "Natural", transition: "Smooth", assetMode: "AI + Upload" };
}
function buildDefaultSubtitle(value: Partial<VideoProject>): SubtitleConfig {
  return { enabled: value.autoSubtitle !== false, language: value.language || "Indonesia", style: "Clean White", position: "Bottom", size: "Medium", outline: true };
}
function buildDefaultTimeline(value: Partial<VideoProject>): TimelineConfig {
  return { pacing: value.smartPacing === false ? "Manual" : "Smart", transitionDuration: 0.5, introDuration: 2, outroDuration: 3 };
}
function normalizeProject(value: Partial<VideoProject>): VideoProject | null {
  if (!value.title) return null;
  const audio: AudioConfig = { ...buildDefaultAudio(value), ...(value.audio || {}) };
  const visual: VisualConfig = { ...buildDefaultVisual(value), ...(value.visual || {}) };
  const subtitle: SubtitleConfig = { ...buildDefaultSubtitle(value), ...(value.subtitle || {}) };
  const timeline: TimelineConfig = { ...buildDefaultTimeline(value), ...(value.timeline || {}) };
  return { id: value.id || makeProjectId(value.title), title: value.title, status: value.status || "Draft", duration: Number(value.duration) || 7, topic: value.topic, style: value.style || visual.style, ratio: value.ratio || "16:9", language: value.language || audio.language, voice: value.voice || audio.voice, music: value.music || audio.music, script: value.script, autoStoryboard: value.autoStoryboard !== false, autoSubtitle: value.autoSubtitle !== false, smartPacing: value.smartPacing !== false, audio, visual, subtitle, timeline, scenes: Array.isArray(value.scenes) ? value.scenes : [], updatedAt: value.updatedAt || new Date().toISOString() };
}
function hydrateFromDraft(project: VideoProject): VideoProject {
  if (typeof window === "undefined") return project;
  try { const raw = localStorage.getItem(`${DRAFT_PREFIX}${project.id}`); if (!raw) return project; const draft = JSON.parse(raw) as Partial<VideoProject> & { projectId?: string }; if (draft.projectId && draft.projectId !== project.id) return project; return normalizeProject({ ...project, ...draft, id: project.id, title: project.title, status: project.status, updatedAt: project.updatedAt }) || project; } catch { return project; }
}
export function readActiveProject(): VideoProject | null { if (typeof window === "undefined") return null; try { const raw = localStorage.getItem(ACTIVE_KEY); if (!raw) return null; const project = normalizeProject(JSON.parse(raw) as Partial<VideoProject>); return project ? hydrateFromDraft(project) : null; } catch { return null; } }
export function readProjects(): VideoProject[] { if (typeof window === "undefined") return []; try { const raw = localStorage.getItem(PROJECTS_KEY); if (!raw) { const active = readActiveProject(); return active ? [active] : []; } const parsed = JSON.parse(raw); if (!Array.isArray(parsed)) return []; return parsed.map((item) => normalizeProject(item as Partial<VideoProject>)).filter(Boolean).map((project) => hydrateFromDraft(project as VideoProject)) as VideoProject[]; } catch { return []; } }
export function readProject(projectId?: string, title?: string): VideoProject | null { if (typeof window === "undefined") return null; const projects = readProjects(); if (projectId) { const byId = projects.find((project) => project.id === projectId); if (byId) return byId; } if (title) { const byTitle = projects.find((project) => project.title === title); if (byTitle) return byTitle; } return null; }
export function saveActiveProject(project: VideoProject) { if (typeof window === "undefined") return; const normalized = normalizeProject(project); if (!normalized) return; localStorage.setItem(ACTIVE_KEY, JSON.stringify(normalized)); localStorage.setItem(WORKSPACE_KEY, JSON.stringify(normalized)); const projects = readProjects().filter((item) => item.id !== normalized.id); localStorage.setItem(PROJECTS_KEY, JSON.stringify([normalized, ...projects])); }
export function saveProject(project: VideoProject) { saveActiveProject(project); }
export function deleteProject(projectId: string) { if (typeof window === "undefined") return; const projects = readProjects().filter((item) => item.id !== projectId); localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); localStorage.removeItem(`${DRAFT_PREFIX}${projectId}`); const active = readActiveProject(); if (active?.id === projectId) { localStorage.removeItem(ACTIVE_KEY); localStorage.removeItem(WORKSPACE_KEY); } const jobs = readRenderJobs().filter((job) => job.projectId !== projectId); localStorage.setItem(RENDER_JOBS_KEY, JSON.stringify(jobs)); }
function readRenderMap(): Record<string, RenderSettings> { if (typeof window === "undefined") return {}; try { const raw = localStorage.getItem(RENDER_KEY); if (!raw) return {}; const parsed = JSON.parse(raw); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) { if (parsed.projectId && parsed.projectTitle) { const legacy = parsed as RenderSettings; return { [legacy.projectId]: legacy }; } return parsed as Record<string, RenderSettings>; } } catch {} return {}; }
export function saveRenderSettings(settings: RenderSettings) { if (typeof window === "undefined") return; const map = readRenderMap(); map[settings.projectId] = settings; localStorage.setItem(RENDER_KEY, JSON.stringify(map)); }
export function readRenderSettings(projectId?: string): RenderSettings | null { if (typeof window === "undefined") return null; const map = readRenderMap(); if (projectId && map[projectId]) return map[projectId]; const active = readActiveProject(); if (active?.id && map[active.id]) return map[active.id]; const first = Object.values(map)[0]; return first || null; }

export function readRenderJobs(projectId?: string): RenderJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RENDER_JOBS_KEY);
    const jobs = raw ? JSON.parse(raw) as RenderJob[] : [];
    if (!Array.isArray(jobs)) return [];
    return projectId ? jobs.filter((job) => job.projectId === projectId) : jobs;
  } catch { return []; }
}

export function saveRenderJob(job: RenderJob) {
  if (typeof window === "undefined") return;
  const jobs = readRenderJobs().filter((item) => item.id !== job.id);
  localStorage.setItem(RENDER_JOBS_KEY, JSON.stringify([job, ...jobs].slice(0, 50)));
}

export function clearProjectState() { if (typeof window === "undefined") return; localStorage.removeItem(ACTIVE_KEY); localStorage.removeItem(WORKSPACE_KEY); localStorage.removeItem(PROJECTS_KEY); localStorage.removeItem(RENDER_KEY); localStorage.removeItem(RENDER_JOBS_KEY); }

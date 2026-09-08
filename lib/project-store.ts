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
const PROJECTS_KEY = "salvian-video-projects";
const RENDER_KEY = "salvian-video-render-settings";

export function makeProjectId(title: string) {
  return `video-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"}`;
}

export function createProjectId(title: string) {
  const base = makeProjectId(title);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base}-${suffix}`;
}

function normalizeProject(value: Partial<VideoProject>): VideoProject | null {
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
}

export function readActiveProject(): VideoProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return normalizeProject(JSON.parse(raw) as Partial<VideoProject>);
  } catch {
    return null;
  }
}

export function readProjects(): VideoProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) {
      const active = readActiveProject();
      return active ? [active] : [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeProject(item as Partial<VideoProject>)).filter(Boolean) as VideoProject[];
  } catch {
    return [];
  }
}

export function readProject(projectId?: string, title?: string): VideoProject | null {
  if (typeof window === "undefined") return null;
  const projects = readProjects();
  if (projectId) {
    const byId = projects.find((project) => project.id === projectId);
    if (byId) return byId;
  }
  if (title) {
    const byTitle = projects.find((project) => project.title === title);
    if (byTitle) return byTitle;
  }
  return null;
}

export function saveActiveProject(project: VideoProject) {
  if (typeof window === "undefined") return;
  const normalized = normalizeProject(project);
  if (!normalized) return;
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(normalized));
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(normalized));

  const projects = readProjects().filter((item) => item.id !== normalized.id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify([normalized, ...projects]));
}

export function saveProject(project: VideoProject) {
  saveActiveProject(project);
}

export function deleteProject(projectId: string) {
  if (typeof window === "undefined") return;
  const projects = readProjects().filter((item) => item.id !== projectId);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  const active = readActiveProject();
  if (active?.id === projectId) {
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(WORKSPACE_KEY);
  }
}

function readRenderMap(): Record<string, RenderSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RENDER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (parsed.projectId && parsed.projectTitle) {
        const legacy = parsed as RenderSettings;
        return { [legacy.projectId]: legacy };
      }
      return parsed as Record<string, RenderSettings>;
    }
  } catch {}
  return {};
}

export function saveRenderSettings(settings: RenderSettings) {
  if (typeof window === "undefined") return;
  const map = readRenderMap();
  map[settings.projectId] = settings;
  localStorage.setItem(RENDER_KEY, JSON.stringify(map));
}

export function readRenderSettings(projectId?: string): RenderSettings | null {
  if (typeof window === "undefined") return null;
  const map = readRenderMap();
  if (projectId && map[projectId]) return map[projectId];
  const active = readActiveProject();
  if (active?.id && map[active.id]) return map[active.id];
  const first = Object.values(map)[0];
  return first || null;
}

export function clearProjectState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
  localStorage.removeItem(PROJECTS_KEY);
  localStorage.removeItem(RENDER_KEY);
}

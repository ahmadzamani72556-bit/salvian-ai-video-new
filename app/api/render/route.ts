import { NextResponse } from "next/server";

type RenderSettings = {
  projectId: string;
  projectTitle: string;
  resolution: string;
  fps: string;
  quality: string;
  format: string;
};

type RenderProject = {
  id?: string;
  title?: string;
  duration?: number;
  ratio?: string;
  scenes?: unknown[];
  script?: string;
  audio?: unknown;
  visual?: unknown;
  subtitle?: unknown;
  timeline?: unknown;
};

const ALLOWED_RESOLUTIONS = new Set(["720p", "1080p", "4K"]);
const ALLOWED_FPS = new Set(["24 FPS", "30 FPS", "60 FPS"]);
const ALLOWED_QUALITY = new Set(["Standard", "High", "Maximum"]);
const ALLOWED_FORMATS = new Set(["MP4", "WebM"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project?: RenderProject; settings?: RenderSettings };
    const project = body.project;
    const settings = body.settings;

    if (!project?.id || !project.title) {
      return NextResponse.json({ error: "Project render tidak valid." }, { status: 400 });
    }
    if (!settings || settings.projectId !== project.id) {
      return NextResponse.json({ error: "Pengaturan render tidak cocok dengan project." }, { status: 400 });
    }
    if (!ALLOWED_RESOLUTIONS.has(settings.resolution)) {
      return NextResponse.json({ error: "Resolusi render tidak didukung." }, { status: 400 });
    }
    if (!ALLOWED_FPS.has(settings.fps)) {
      return NextResponse.json({ error: "Frame rate render tidak didukung." }, { status: 400 });
    }
    if (!ALLOWED_QUALITY.has(settings.quality)) {
      return NextResponse.json({ error: "Kualitas render tidak didukung." }, { status: 400 });
    }
    if (!ALLOWED_FORMATS.has(settings.format)) {
      return NextResponse.json({ error: "Format render tidak didukung." }, { status: 400 });
    }

    const hasConcept = Boolean(project.script?.trim() || project.title?.trim());
    const hasStoryboard = Array.isArray(project.scenes) && project.scenes.length > 0;
    const hasAudio = Boolean(project.audio);
    const hasVisual = Boolean(project.visual);
    const hasSubtitle = Boolean(project.subtitle);
    const hasTimeline = Boolean(project.timeline);
    const readiness = { concept: hasConcept, storyboard: hasStoryboard, audio: hasAudio, visual: hasVisual, subtitle: hasSubtitle, timeline: hasTimeline };
    const readyCount = Object.values(readiness).filter(Boolean).length;

    if (readyCount < 5) {
      return NextResponse.json({
        error: "Project belum siap untuk antrean render.",
        readiness,
        readyCount,
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    const renderJob = {
      id: `render-${crypto.randomUUID()}`,
      projectId: project.id,
      projectTitle: project.title,
      status: "queued",
      stage: "waiting-for-engine",
      progress: 0,
      settings,
      readiness,
      createdAt: now,
      updatedAt: now,
      engine: "pending",
      output: null,
      message: "Render job berhasil dibuat dan siap diteruskan ke engine render.",
    };

    return NextResponse.json({ renderJob }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Permintaan render tidak dapat diproses." }, { status: 400 });
  }
}

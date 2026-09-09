import { NextResponse } from "next/server";

const resolutions = ["720p", "1080p", "4K"];
const fpsOptions = ["24 FPS", "30 FPS", "60 FPS"];
const qualities = ["Standard", "High", "Maximum"];
const formats = ["MP4", "WebM"];

type RenderProject = { id?: string; title?: string; script?: string; scenes?: unknown[]; audio?: unknown; visual?: unknown; subtitle?: unknown; timeline?: unknown };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = body.project && typeof body.project === "object" ? body.project as RenderProject : null;
    const settings = body.settings && typeof body.settings === "object" ? body.settings : null;
    const projectId = typeof settings?.projectId === "string" ? settings.projectId.trim() : typeof body.projectId === "string" ? body.projectId.trim() : "";
    const projectTitle = typeof settings?.projectTitle === "string" ? settings.projectTitle.trim() : typeof body.projectTitle === "string" ? body.projectTitle.trim() : "";
    const resolution = typeof settings?.resolution === "string" ? settings.resolution : typeof body.resolution === "string" ? body.resolution : "1080p";
    const fps = typeof settings?.fps === "string" ? settings.fps : typeof body.fps === "string" ? body.fps : "30 FPS";
    const quality = typeof settings?.quality === "string" ? settings.quality : typeof body.quality === "string" ? body.quality : "High";
    const format = typeof settings?.format === "string" ? settings.format : typeof body.format === "string" ? body.format : "MP4";
    if (!projectId || !projectTitle) return NextResponse.json({ error: "Project wajib dipilih." }, { status: 400 });
    if (project?.id !== projectId || project?.title !== projectTitle) return NextResponse.json({ error: "Project tidak cocok dengan pengaturan render." }, { status: 400 });
    if (!resolutions.includes(resolution) || !fpsOptions.includes(fps) || !qualities.includes(quality) || !formats.includes(format)) return NextResponse.json({ error: "Pengaturan render tidak valid." }, { status: 400 });
    const readiness = { concept: Boolean(project.script?.trim()), storyboard: Array.isArray(project.scenes) && project.scenes.length > 0, audio: Boolean(project.audio), visual: Boolean(project.visual), subtitle: Boolean(project.subtitle), timeline: Boolean(project.timeline) };
    const readyCount = Object.values(readiness).filter(Boolean).length;
    if (readyCount < 5) return NextResponse.json({ error: "Project belum siap untuk engine render.", readiness, readyCount }, { status: 409 });
    const provider = process.env.MUREKA_RENDER_PROVIDER || "mureka";
    const creditCharge = resolution === "4K" ? 45 : resolution === "1080p" ? 30 : 20;
    return NextResponse.json({ ok: true, mode: "engine-ready", job: { id: `render-${projectId}-${Date.now()}`, projectId, projectTitle, provider, output: { resolution, fps, quality, format }, status: "ready_for_engine", creditCharge, readiness }, message: "Kontrak render valid. Belum ada kredit yang dipotong dan belum ada job provider yang dikirim." });
  } catch { return NextResponse.json({ error: "Permintaan render tidak dapat diproses." }, { status: 500 }); }
}

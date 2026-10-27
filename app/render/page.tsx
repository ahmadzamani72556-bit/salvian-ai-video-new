"use client";

import "../studio.css";
import "./render.css";
import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { readActiveProject, readProject, readRenderJobs, saveRenderJob, type RenderJob, type VideoProject } from "../../lib/project-store";

type ShotRun = { startedAt?: string; completedAt?: string; durationSeconds?: number; url?: string };
type ShotView = { id: string; scene: number; duration: number; title?: string; prompt?: string; status: "completed" | "active" | "queued"; run?: ShotRun };
type LiveResult = { id: string; status: string; stage: string; phase: string; progress: number; message: string; currentShot: number; totalShots: number; completedShots: number; completedClips: string[]; currentClipUrl?: string; outputUrl?: string; shotPlan?: ShotView[]; shotRuns?: Record<string, ShotRun>; updatedAt: string };

const stages = [["planning", "Menyusun film"], ["music-analysis", "Menganalisis audio"], ["shot-planning", "Menyusun shot"], ["generation", "Membuat visual"], ["continuity", "Menjaga continuity"], ["audio", "Menyelaraskan audio"], ["assembly", "Merakit timeline"], ["finalizing", "Menyiapkan video final"]] as const;

function fmt(seconds: number) { const s = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
function elapsedFrom(start?: string, end?: string, now = Date.now()) { if (!start) return 0; return Math.max(0, Math.floor(((end ? new Date(end).getTime() : now) - new Date(start).getTime()) / 1000)); }
function stageNumber(stage: string) { const index = stages.findIndex(([id]) => id === stage); return index < 0 ? 1 : index + 1; }
function stageText(stage: string, currentShot: number, total: number) { switch (stage) { case "planning": return "Salvian sedang membaca cerita dan menyusun film."; case "music-analysis": return "Salvian sedang menganalisis audio dan ritme."; case "shot-planning": return `Storyboard selesai. Salvian membagi film menjadi ${total || "beberapa"} visual.`; case "generation": return `Salvian sedang membuat visual SHOT ${Math.min(currentShot + 1, total || 1)} dari ${total || 1}.`; case "continuity": return `SHOT ${currentShot} sudah selesai. Salvian menjaga continuity sebelum membuat shot berikutnya.`; case "audio": return "Semua visual selesai. Salvian sedang menyelaraskan audio."; case "assembly": return "Semua visual sedang dirakit menjadi satu timeline video utuh."; case "finalizing": return "Video final sedang disiapkan."; default: return "Salvian sedang bekerja…"; } }

export default function RenderPage() {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [job, setJob] = useState<RenderJob | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [message, setMessage] = useState("Menyiapkan produksi…");
  const started = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("projectId") || undefined;
    const title = params.get("project") || undefined;
    const selected = readProject(id, title) || readActiveProject();
    setProject(selected);
    if (selected) {
      const latest = readRenderJobs(selected.id)[0];
      if (latest) { setJob(latest); setMessage(latest.message || "Produksi sedang berjalan…"); }
    }
  }, []);

  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const canRender = Boolean(project?.script && project?.scenes?.length && project?.audio && project?.visual && project?.subtitle && project?.timeline);

  async function startProduction() {
    if (!project || !canRender || started.current) return;
    started.current = true;
    setMessage("Salvian memulai produksi visual satu per satu…");
    const settings = { projectId: project.id, projectTitle: project.title, resolution: "1080p", fps: "30 FPS", quality: "High", format: "MP4" };
    try {
      const response = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project, settings }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Mesin produksi gagal menerima pekerjaan.");
      saveRenderJob(data.renderJob); setJob(data.renderJob); setMessage(data.renderJob.message || "Produksi dimulai.");
    } catch (error) { started.current = false; setMessage(error instanceof Error ? error.message : "Produksi gagal dimulai."); }
  }

  useEffect(() => { if (project && canRender && !job) void startProduction(); }, [project?.id, canRender, job?.id]);

  useEffect(() => {
    if (!job?.id || ["succeeded", "failed", "timeouted", "cancelled"].includes(job.status)) return;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/render/status?taskId=${encodeURIComponent(job.id)}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Status produksi tidak dapat diambil.");
        const result = data.result as LiveResult;
        if (!result || stopped) return;
        const next: any = { ...job, status: result.status, stage: result.stage, phase: result.phase, progress: Math.max(0, Math.min(100, Number(result.progress) || 0)), output: result.outputUrl ? { url: result.outputUrl, format: job.settings.format } : job.output, message: result.message, completedClips: result.completedClips, currentClipUrl: result.currentClipUrl, shotPlan: result.shotPlan, shotRuns: result.shotRuns, currentShot: result.currentShot, totalShots: result.totalShots, completedShots: result.completedShots, updatedAt: result.updatedAt };
        saveRenderJob(next); setJob(next); setMessage(result.message || "Salvian melanjutkan proses produksi…");
      } catch (error) { if (!stopped) setMessage(error instanceof Error ? error.message : "Polling produksi gagal."); }
    };
    void poll(); const timer = window.setInterval(poll, 2000); return () => { stopped = true; window.clearInterval(timer); };
  }, [job?.id, job?.status]);

  const live: any = job || {};
  const progress = job?.status === "succeeded" ? 100 : Math.max(0, Math.min(100, Number(live.progress) || 0));
  const currentStage = String(live.phase || live.stage || "planning");
  const currentShot = Number(live.currentShot) || 0;
  const totalShots = Number(live.totalShots) || live.shotPlan?.length || 0;
  const completedShots = Number(live.completedShots) || 0;
  const shotPlan: ShotView[] = Array.isArray(live.shotPlan) ? live.shotPlan : [];
  const shotRuns: Record<string, ShotRun> = live.shotRuns || {};
  const processing = ["starting", "queued", "running", "assembling"].includes(job?.status || "");
  const finalUrl = live.output?.url || live.outputUrl;
  const masterElapsed = useMemo(() => elapsedFrom(job?.createdAt, job?.status === "succeeded" ? job?.updatedAt : undefined, clock), [job?.createdAt, job?.status, job?.updatedAt, clock]);

  return <main style={{ minHeight: "100vh", background: "#fff", color: "#111827" }}>
    <header style={{ height: 64, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, background: "rgba(255,255,255,.96)", zIndex: 10 }}>
      <Link href={`/create?project=${encodeURIComponent(project?.title || "")}&projectId=${encodeURIComponent(project?.id || "")}`} style={{ textDecoration: "none", color: "#111827", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800 }}><span style={{ width: 28, height: 28, borderRadius: 8, background: "#111827", color: "#fff", display: "grid", placeItems: "center" }}>S</span>SALVIAN AI VIDEO</Link>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: processing ? "#2563eb" : "#6b7280" }}>{processing ? "● PRODUKSI LIVE" : job?.status === "succeeded" ? "✓ SELESAI" : "MENYIAPKAN"}</span>
    </header>

    <section style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 18px 70px" }}>
      <Link href={`/create?project=${encodeURIComponent(project?.title || "")}&projectId=${encodeURIComponent(project?.id || "")}`} style={{ color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}><ArrowLeft size={15} /> Kembali ke Studio</Link>
      <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><div style={eyebrow}>PRODUKSI NYATA · {project?.title || "PROJECT VIDEO"}</div><h1 style={{ fontSize: "clamp(28px,5vw,42px)", margin: "7px 0 8px" }}>{job?.status === "succeeded" ? "Video sudah selesai." : "Salvian sedang membuat video."}</h1><p style={{ margin: 0, color: "#6b7280", maxWidth: 720 }}>{stageText(currentStage, currentShot, totalShots)} Tidak ada lagi status kosong: setiap visual memiliki giliran, waktu mulai, waktu selesai, dan hasilnya sendiri.</p></div>
        <div style={{ minWidth: 150, textAlign: "right" }}><strong style={{ fontSize: 34 }}>{progress}%</strong><div style={{ color: "#6b7280", fontSize: 13 }}>{completedShots}/{totalShots || 0} visual selesai</div></div>
      </div>

      <section style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}><div><div style={eyebrow}>PEKERJAAN YANG SEDANG DIJALANKAN</div><h2 style={{ margin: "6px 0 0", fontSize: 22 }}>{message}</h2></div><div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: processing ? "#2563eb" : "#6b7280", fontSize: 13, fontWeight: 800 }}>{processing ? <Loader2 size={16} className="spin" /> : job?.status === "succeeded" ? <CheckCircle2 size={16} /> : <Activity size={16} />} WAKTU {fmt(masterElapsed)}</div></div><div style={{ height: 10, background: "#eef2f7", borderRadius: 999, marginTop: 18, overflow: "hidden" }}><div style={{ height: "100%", width: `${progress}%`, background: "#111827", borderRadius: 999, transition: "width .5s ease" }} /></div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, color: "#6b7280", fontSize: 12 }}><span>MASTER TIMELINE</span><span>{fmt(masterElapsed)}</span></div></section>

      <section style={card}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, marginBottom: 16 }}><div><div style={eyebrow}>PROSES VISUAL SATU PER SATU</div><h2 style={{ margin: "6px 0 0", fontSize: 24 }}>SHOT 1 → SHOT {totalShots || "…"}</h2></div><span style={{ color: "#6b7280", fontSize: 13 }}>{completedShots} selesai</span></div>
        {shotPlan.length === 0 ? <div style={{ border: "1px dashed #d1d5db", borderRadius: 14, padding: 26, color: "#6b7280", textAlign: "center" }}>Salvian sedang menyusun storyboard dan menentukan urutan visual pertama…</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(235px,1fr))", gap: 12 }}>{shotPlan.map((shot, index) => { const run = shotRuns[shot.id] || shot.run; const isActive = shot.status === "active"; const isDone = shot.status === "completed"; const seconds = run?.durationSeconds ?? elapsedFrom(run?.startedAt, run?.completedAt, clock); const media = run?.url || (isDone ? live.completedClips?.[index] : undefined); return <article key={shot.id} style={{ border: `1px solid ${isActive ? "#111827" : "#e5e7eb"}`, borderRadius: 14, overflow: "hidden", background: isActive ? "#f8fafc" : "#fff" }}><div style={{ padding: "11px 12px", display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 900 }}><span>SHOT {index + 1}</span><span style={{ color: isDone ? "#15803d" : isActive ? "#2563eb" : "#9ca3af" }}>{isDone ? "SELESAI" : isActive ? "SEDANG DIBUAT" : "MENUNGGU"}</span></div><div style={{ aspectRatio: "16/9", background: "#eef2f7", position: "relative", overflow: "hidden" }}>{media ? <video src={media} muted playsInline controls={false} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", position: "relative" }}><div style={{ width: 68, height: 68, border: `2px solid ${isActive ? "#2563eb" : "#cbd5e1"}`, borderRadius: "50%" }} /><div style={{ position: "absolute", left: 0, right: 0, height: 2, top: isActive ? "55%" : "50%", background: isActive ? "#2563eb" : "#dbe2ea", animation: isActive ? "salvianScan 1.6s linear infinite" : undefined }} /><span style={{ position: "absolute", fontSize: 11, fontWeight: 900, letterSpacing: ".08em", color: isActive ? "#2563eb" : "#64748b" }}>{isActive ? "MEMPRODUKSI" : "ANTRIAN"}</span></div>}</div><div style={{ padding: 12 }}><strong style={{ display: "block", minHeight: 18 }}>{shot.title || `Visual bagian ${shot.scene}`}</strong><div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 10, fontSize: 12, color: "#6b7280" }}><span>Target {shot.duration}s</span><b style={{ color: isActive ? "#2563eb" : "#111827" }}>{isDone ? `Selesai ${fmt(seconds)}` : isActive ? `Berjalan ${fmt(seconds)}` : "Belum mulai"}</b></div>{run?.startedAt && <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>Mulai: {new Date(run.startedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>}</div></article>; })}</div>}
      </section>

      <section style={card}><div style={eyebrow}>TAHAPAN PRODUKSI</div><div style={{ display: "grid", gap: 4, marginTop: 12 }}>{stages.map(([id, label], index) => { const activeIndex = stageNumber(currentStage) - 1; const done = index < activeIndex || job?.status === "succeeded"; const active = index === activeIndex && processing; return <div key={id} style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: index === stages.length - 1 ? "none" : "1px solid #f0f2f5" }}><span style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${done ? "#111827" : active ? "#2563eb" : "#dbe1e8"}`, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 }}>{done ? <CheckCircle2 size={16} /> : index + 1}</span><div><strong>{label}</strong><div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{active ? "Sedang dikerjakan sekarang" : done ? "Selesai" : "Menunggu giliran"}</div></div><span style={{ fontSize: 12, fontWeight: 800, color: active ? "#2563eb" : "#9ca3af" }}>{active ? "LIVE" : done ? "✓" : "—"}</span></div>; })}</div></section>

      {finalUrl && <section style={card}><div style={eyebrow}>VIDEO FINAL</div><div style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", background: "#111827" }}><video src={finalUrl} controls playsInline style={{ width: "100%", maxHeight: 560, display: "block" }} /></div></section>}
      {job?.status === "failed" && <section style={{ ...card, borderColor: "#fecaca", color: "#991b1b" }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}><XCircle size={18} /> Produksi berhenti karena engine mengembalikan kegagalan nyata. Tidak ada clip palsu yang ditandai selesai.</div></section>}
    </section>
    <style jsx>{`@keyframes salvianScan {0%{transform:translateY(-80px);opacity:.25}50%{opacity:1}100%{transform:translateY(80px);opacity:.25}}`}</style>
  </main>;
}

const card: React.CSSProperties = { marginTop: 18, border: "1px solid #e5e7eb", borderRadius: 18, padding: 18, background: "#fff", boxShadow: "0 2px 12px rgba(15,23,42,.03)" };
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 900, letterSpacing: ".12em", color: "#6b7280" };

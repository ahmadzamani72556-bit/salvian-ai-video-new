"use client";

import "./workspace.css";
import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Clipboard, FolderOpen, Play, Save, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { makeProjectId, readActiveProject, readProjects, saveActiveProject, type VideoProject } from "../../lib/project-store";

const steps = [
  { key: "Konsep", title: "Tentukan ide", description: "Masukkan topik dan pilih gaya video.", tab: "Konsep" },
  { key: "Produksi", title: "Buat video", description: "AI menyusun script, storyboard, audio, visual, dan subtitle.", tab: "Script" },
  { key: "Review", title: "Periksa hasil", description: "Rapikan scene dan timeline sebelum output akhir.", tab: "Timeline" },
  { key: "Render", title: "Render video", description: "Siapkan dan jalankan proses render akhir.", tab: "Timeline" },
] as const;

type AssistantMessage = { role: "user" | "assistant"; text: string };

export default function WorkspacePage() {
  const [title, setTitle] = useState("Project Video Baru");
  const [status, setStatus] = useState("Draft");
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);
  const [saved, setSaved] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantCopied, setAssistantCopied] = useState(false);
  const [assistantDraftSaved, setAssistantDraftSaved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("projectId");
    const projectTitle = params.get("project");
    const projects = readProjects();
    const active = readActiveProject();
    const selected = (id ? projects.find((item) => item.id === id) : null)
      || (projectTitle ? projects.find((item) => item.title === projectTitle) : null)
      || (!id && !projectTitle ? active : null);
    if (selected) {
      setActiveProject(selected);
      setTitle(selected.title);
      setStatus(selected.status || "Draft");
    }
  }, []);

  const projectId = activeProject?.id || makeProjectId(title);
  const assistantHistoryKey = `salvian-video-assistant-history:${projectId}`;
  const studioHref = `/create?project=${encodeURIComponent(title)}&projectId=${encodeURIComponent(projectId)}&from=workspace`;
  const renderHref = `/render?project=${encodeURIComponent(title)}&projectId=${encodeURIComponent(projectId)}&from=workspace`;
  const projectCount = useMemo(() => readProjects().length, [activeProject, saved]);
  const completed = {
    concept: Boolean(activeProject?.topic),
    production: Boolean(activeProject?.script || activeProject?.scenes?.length),
    review: Boolean(activeProject?.timeline),
    render: false,
  };

  useEffect(() => {
    if (!assistantOpen) return;
    try {
      const raw = localStorage.getItem(assistantHistoryKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setAssistantMessages(Array.isArray(parsed) ? parsed.filter((item) => item?.role && item?.text) : []);
    } catch {
      setAssistantMessages([]);
    }
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [assistantOpen, assistantHistoryKey]);

  function saveWorkspace() {
    const cleanTitle = title.trim() || "Project Video Baru";
    const project: VideoProject = {
      ...(activeProject || {}),
      id: activeProject?.id || makeProjectId(cleanTitle),
      title: cleanTitle,
      status,
      duration: activeProject?.duration || 7,
      scenes: activeProject?.scenes || [],
      updatedAt: new Date().toISOString(),
    };
    saveActiveProject(project);
    setActiveProject(project);
    setTitle(project.title);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function persistAssistantHistory(messages: AssistantMessage[]) {
    localStorage.setItem(assistantHistoryKey, JSON.stringify(messages));
  }

  async function copyAssistantReply() {
    const text = [...assistantMessages].reverse().find((message) => message.role === "assistant")?.text || assistantReply;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setAssistantCopied(true);
      window.setTimeout(() => setAssistantCopied(false), 1600);
    } catch {
      setAssistantCopied(false);
    }
  }

  function saveAssistantDraft() {
    persistAssistantHistory(assistantMessages);
    saveWorkspace();
    localStorage.setItem(`salvian-video-assistant-draft:${projectId}`, JSON.stringify({ projectId, title, messages: assistantMessages, savedAt: new Date().toISOString() }));
    setAssistantDraftSaved(true);
    window.setTimeout(() => setAssistantDraftSaved(false), 1800);
  }

  function clearAssistantPage() {
    setAssistantInput("");
    setAssistantReply("");
    setAssistantMessages([]);
  }

  function clearAssistantHistory() {
    localStorage.removeItem(assistantHistoryKey);
    localStorage.removeItem(`salvian-video-assistant-draft:${projectId}`);
    setAssistantMessages([]);
    setAssistantInput("");
    setAssistantReply("");
  }

  async function askAssistant() {
    const message = assistantInput.trim();
    if (!message || assistantLoading) return;
    setAssistantLoading(true);
    setAssistantReply("");
    const userMessage: AssistantMessage = { role: "user", text: message };
    const nextMessages = [...assistantMessages, userMessage];
    setAssistantMessages(nextMessages);
    setAssistantInput("");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          projectTitle: title,
          projectContext: JSON.stringify({ topic: activeProject?.topic || "", duration: activeProject?.duration || 7, scenes: activeProject?.scenes?.length || 0 }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI Assistant gagal merespons.");
      const reply = data.reply || "AI Assistant tidak memberikan jawaban.";
      const completedMessages = [...nextMessages, { role: "assistant" as const, text: reply }];
      setAssistantReply(reply);
      setAssistantMessages(completedMessages);
      persistAssistantHistory(completedMessages);
    } catch (error) {
      const reply = error instanceof Error ? error.message : "AI Assistant tidak dapat merespons.";
      const completedMessages = [...nextMessages, { role: "assistant" as const, text: reply }];
      setAssistantReply(reply);
      setAssistantMessages(completedMessages);
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <main className="simple-workspace">
      <header className="simple-header">
        <div className="simple-brand"><span className="brand-mark">S</span><strong>SALVIAN AI VIDEO</strong></div>
        <div className="simple-header-actions">
          <Link href="/projects" className="text-link"><FolderOpen size={16} /> Project</Link>
          <button className="ghost-btn" type="button" onClick={() => setAssistantOpen(true)}><Bot size={16} /> AI Assistant</button>
        </div>
      </header>

      <section className="simple-main">
        <div className="simple-intro">
          <div>
            <span className="simple-kicker">RUANG KERJA</span>
            <h1>Buat video tanpa bingung.</h1>
            <p>Ikuti 4 langkah. Semua pengaturan produksi ada di Studio.</p>
          </div>
          <button className="ghost-btn save-btn" type="button" onClick={saveWorkspace}><Save size={16} /> {saved ? "Tersimpan" : "Simpan"}</button>
        </div>

        <section className="project-start-card">
          <div className="project-start-copy">
            <span className="simple-kicker">PROJECT</span>
            <label htmlFor="project-title">Nama project</label>
            <input id="project-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Dokumenter Indonesia" />
          </div>
          <div className="project-start-actions">
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status project">
              <option>Draft</option>
              <option>Produksi</option>
              <option>Siap Render</option>
              <option>Selesai</option>
            </select>
            <Link href={studioHref} className="start-btn"><Play size={17} /> Mulai Produksi <ArrowRight size={17} /></Link>
          </div>
        </section>

        <div className="simple-divider"><span>Alur kerja</span><small>{projectCount} project tersimpan</small></div>

        <section className="simple-steps" aria-label="Alur produksi video">
          {steps.map((step, index) => {
            const done = index === 0 ? completed.concept : index === 1 ? completed.production : index === 2 ? completed.review : completed.render;
            const href = step.key === "Render" ? renderHref : `${studioHref}&tab=${encodeURIComponent(step.tab)}`;
            return (
              <Link href={href} className="simple-step" key={step.key}>
                <div className="step-number">{done ? <CheckCircle2 size={21} /> : index + 1}</div>
                <div className="step-copy"><strong>{step.title}</strong><span>{step.description}</span></div>
                <ArrowRight size={18} />
              </Link>
            );
          })}
        </section>

        <section className="simple-help">
          <Sparkles size={18} />
          <div><strong>Butuh bantuan?</strong><span>Gunakan AI Assistant jika ingin dibantu membuat ide, script, storyboard, atau merapikan project.</span></div>
          <button type="button" onClick={() => setAssistantOpen(true)}>Buka Assistant</button>
        </section>
      </section>

      {assistantOpen && (
        <section className="simple-assistant-page" aria-label="AI Assistant">
          <header className="assistant-page-head">
            <div className="assistant-page-title"><button className="assistant-close" type="button" onClick={() => setAssistantOpen(false)} aria-label="Tutup AI Assistant"><X size={20} /></button><div><span className="simple-kicker">AI ASSISTANT</span><h2>Ruang kerja AI</h2><p>Project: <strong>{title}</strong></p></div></div>
            <div className="assistant-page-actions">
              <button type="button" onClick={copyAssistantReply} disabled={!assistantMessages.some((message) => message.role === "assistant")}><Clipboard size={15} /> {assistantCopied ? "Tersalin" : "Salin"}</button>
              <button type="button" onClick={saveAssistantDraft}><Save size={15} /> {assistantDraftSaved ? "Tersimpan" : "Draft"}</button>
              <button type="button" onClick={clearAssistantPage}><Trash2 size={15} /> Hapus halaman</button>
              <button type="button" onClick={clearAssistantHistory}><Trash2 size={15} /> Hapus riwayat</button>
            </div>
          </header>

          <div className="assistant-page-body">
            <div className="assistant-chat-area">
              <div className="assistant-welcome"><Bot size={20} /><div><strong>Saya siap membantu.</strong><span>Buat ide, script, storyboard, revisi narasi, atau bantu merapikan project.</span></div></div>
              <div className="assistant-message-list">
                {assistantMessages.length === 0 && <div className="assistant-empty">Mulai dengan pertanyaan atau gunakan salah satu bantuan cepat di bawah.</div>}
                {assistantMessages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span className="assistant-message-role">{message.role === "user" ? "Kamu" : "AI Assistant"}</span><div>{message.text}</div></div>)}
                {assistantLoading && <div className="assistant-message assistant"><span className="assistant-message-role">AI Assistant</span><div>Sedang menyiapkan jawaban…</div></div>}
              </div>
            </div>

            <aside className="assistant-side-tools">
              <span className="simple-kicker">BANTUAN CEPAT</span>
              <button type="button" onClick={() => setAssistantInput("Buatkan ide script untuk project ini")}>Buat Script</button>
              <button type="button" onClick={() => setAssistantInput("Susun storyboard project ini")}>Storyboard</button>
              <button type="button" onClick={() => setAssistantInput("Bantu saya merapikan project ini")}>Rapikan Project</button>
              <button type="button" onClick={() => setAssistantInput("Buatkan hook pembuka yang kuat untuk project ini")}>Buat Hook</button>
            </aside>
          </div>

          <footer className="assistant-composer">
            <div className="assistant-composer-inner"><input autoFocus value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") askAssistant(); }} placeholder="Tulis apa yang ingin kamu kerjakan…" /><button className="start-btn" type="button" onClick={askAssistant} disabled={assistantLoading || !assistantInput.trim()}>Kirim <ArrowRight size={16} /></button></div>
          </footer>
        </section>
      )}
    </main>
  );
}

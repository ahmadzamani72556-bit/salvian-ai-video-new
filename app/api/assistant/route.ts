import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const CREATOR_ASSISTANT_URL = "https://salvian-ai-creator.vercel.app/api/assistant";

const SYSTEM_PROMPT = `Anda adalah SALVIAN AI ASSISTANT resmi untuk SALVIAN AI VIDEO.

Tugas utama:
- Membantu creator membuat video YouTube panjang dari ide sampai siap render.
- Membantu konsep, script/naskah, storyboard dan scene, voice-over, visual/prompt, subtitle, timeline/editing, musik pendukung, SEO YouTube, dan troubleshooting workflow.
- Berikan jawaban dalam bahasa Indonesia yang ramah, jelas, praktis, dan langsung bisa dipakai.
- Anggap pengguna mungkin menggunakan HP.
- Gunakan konteks project yang diberikan bila relevan.
- Jangan mengarang fitur atau hasil yang belum tersedia.
- Jangan mengaku sudah menjalankan engine, merender video, menyimpan file, atau mengubah project jika tindakan itu belum benar-benar dilakukan.
- Jangan pernah meminta password, API key, token, atau data rahasia.`;

function localFallback(message: string, projectTitle?: string) {
  const text = message.trim();
  const project = projectTitle?.trim() || "project video ini";
  return `Saya siap membantu ${project} untuk konsep, script, storyboard, voice-over, visual, subtitle, timeline, dan SEO YouTube.\n\nPertanyaan Anda: “${text}”\n\nKoneksi AI produksi sedang tidak tersedia, jadi jawaban ini berasal dari mode bantuan lokal.`;
}

function isBillingError(error: any) {
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || error?.type || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  return status === 429 || code === "billing_not_active" || code === "insufficient_quota" || code === "credit_balance_exhausted" || code === "organization_usage_limit_exceeded" || code === "organization_spend_limit_exceeded" || code === "project_spend_limit_exceeded" || /billing|insufficient.?quota|credit.?balance|no credits|quota/.test(message);
}

async function callCreatorAssistant(auth: string, message: string, history: unknown[]) {
  const response = await fetch(CREATOR_ASSISTANT_URL, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ message, messages: history }),
    cache: "no-store",
  });
  const raw = await response.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch {}
  return { response, data };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const projectTitle = typeof body?.projectTitle === "string" ? body.projectTitle.trim() : "";
    const projectContext = typeof body?.projectContext === "string" ? body.projectContext.slice(0, 4000) : "";
    const history = Array.isArray(body?.history) ? body.history : Array.isArray(body?.messages) ? body.messages : [];
    if (!message) return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    if (message.length > 4000) return NextResponse.json({ error: "Pertanyaan terlalu panjang. Ringkas pertanyaan Anda." }, { status: 400 });

    const safeHistory = history
      .filter((item: unknown) => {
        if (!item || typeof item !== "object") return false;
        const value = item as { role?: unknown; content?: unknown };
        return (value.role === "user" || value.role === "assistant") && typeof value.content === "string";
      })
      .slice(-12)
      .map((item: { role: "user" | "assistant"; content: string }) => ({ role: item.role, content: item.content.slice(0, 5000) }));

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ ok: true, mode: "fallback", reply: localFallback(message, projectTitle) });

    const context = projectContext ? `\n\nKonteks project saat ini:\n${projectContext}` : "";
    const input = [...safeHistory, { role: "user" as const, content: message.slice(0, 5000) + context }];
    const model = (process.env.OPENAI_ASSISTANT_MODEL || process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-luna").trim();
    const auth = request.headers.get("authorization");

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.responses.create({
        model,
        instructions: SYSTEM_PROMPT,
        input,
        max_output_tokens: 1000,
      });
      const reply = response.output_text?.trim() || "";
      if (!reply) throw new Error("AI tidak menghasilkan jawaban.");
      return NextResponse.json({ ok: true, mode: "openai", reply, model });
    } catch (error: any) {
      if (isBillingError(error) && auth) {
        try {
          const creator = await callCreatorAssistant(auth, message, safeHistory);
          if (creator.response.ok) {
            const reply = String(creator.data?.text || creator.data?.output_text || creator.data?.response || "").trim();
            if (reply) return NextResponse.json({ ok: true, mode: "creator-fallback", reply });
          }
        } catch (fallbackError) {
          console.error("Creator Assistant fallback error", fallbackError);
        }
      }

      if (isBillingError(error)) {
        return NextResponse.json({ ok: true, mode: "fallback", reply: localFallback(message, projectTitle) });
      }
      console.error("SALVIAN AI VIDEO Assistant OpenAI error", error);
      return NextResponse.json({ error: "AI Assistant sedang mengalami gangguan. Coba lagi." }, { status: 502 });
    }
  } catch (error) {
    console.error("SALVIAN AI VIDEO Assistant error", error);
    return NextResponse.json({ error: "AI Assistant tidak dapat memproses permintaan." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

function fallback(message: string, projectTitle?: string) {
  const text = message.trim();
  const lower = text.toLowerCase();
  const project = projectTitle?.trim() || "project video ini";

  if (lower.includes("script") || lower.includes("naskah")) {
    return `Baik. Untuk ${project}, saya sarankan struktur script seperti ini:\n\n1. Hook 0–20 detik: buka dengan masalah/pertanyaan yang membuat penonton penasaran.\n2. Pembukaan: jelaskan topik dan janji manfaat video.\n3. Isi utama: 4–6 poin dengan contoh yang mudah dipahami.\n4. Penutup: rangkum inti pembahasan.\n5. CTA: ajak penonton subscribe, komentar, dan menonton video berikutnya.\n\nKalau Anda kirim topik spesifiknya, saya bisa susunkan naskah lengkap 5–8 menit.`;
  }

  if (lower.includes("storyboard") || lower.includes("scene")) {
    return `Siap. Storyboard untuk ${project} bisa dibuat per scene dengan format:\n\n• Scene 01 — Hook — 10–15 detik — visual pembuka yang kuat.\n• Scene 02 — Pengenalan — 20–30 detik — konteks topik.\n• Scene 03–06 — Isi utama — masing-masing 40–70 detik — visual pendukung + voice-over.\n• Scene 07 — Kesimpulan — 30–45 detik.\n• Scene 08 — CTA — 10–15 detik.\n\nKirim topik atau script-nya dan saya bisa menyusun storyboard lengkap per scene.`;
  }

  if (lower.includes("seo") || lower.includes("youtube")) {
    return `Untuk SEO YouTube ${project}, gunakan tiga bagian utama:\n\nJUDUL: kata kunci utama + manfaat/keingintahuan.\nDESKRIPSI: 2–3 paragraf yang menjelaskan isi video secara natural, lalu tambahkan CTA.\nTAG: gabungkan kata kunci utama, variasi pencarian, dan topik terkait.\n\nKalau Anda berikan topik videonya, saya bisa membuat paket judul, deskripsi, hashtag, dan tag siap tempel.`;
  }

  if (lower.includes("voice") || lower.includes("suara") || lower.includes("narator")) {
    return `Untuk voice-over ${project}, gunakan suara narator dewasa yang jelas, natural, dan stabil. Atur kalimat pendek, beri jeda pada pergantian ide, dan hindari paragraf terlalu padat. Untuk konten dakwah/renungan, gunakan nada tenang dan berwibawa.`;
  }

  if (lower.includes("visual") || lower.includes("gambar") || lower.includes("prompt")) {
    return `Untuk visual ${project}, buat satu prompt untuk setiap scene agar hasil konsisten. Sertakan subjek, lokasi, waktu, suasana, pencahayaan, kamera, rasio, dan gaya visual. Hindari prompt yang terlalu umum.`;
  }

  if (lower.includes("subtitle") || lower.includes("subtitel")) {
    return `Subtitle sebaiknya mengikuti voice-over secara otomatis, maksimal 1–2 baris per tampilan, dengan ukuran yang mudah dibaca dan kontras tinggi. Untuk video YouTube, gunakan bahasa yang sama dengan voice-over kecuali Anda memang ingin subtitle terjemahan.`;
  }

  if (lower.includes("timeline") || lower.includes("editing") || lower.includes("edit")) {
    return `Untuk timeline ${project}, gunakan pacing Smart: hook cepat di awal, pergantian visual mengikuti ide/kalimat, transisi sederhana, dan beri ruang pada bagian penting agar penonton tidak merasa terlalu cepat.`;
  }

  return `Saya menerima pertanyaan Anda: “${text}”\n\nSaya siap membantu project ${project} pada script, storyboard, voice-over, visual, subtitle, timeline, dan SEO YouTube.\n\nSaat koneksi model AI produksi belum tersedia, saya tetap bisa memberikan panduan kerja langsung dari mode bantuan lokal ini. Untuk jawaban AI generatif penuh, deployment harus memiliki OPENAI_API_KEY yang valid.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const projectTitle = typeof body?.projectTitle === "string" ? body.projectTitle.trim() : "";
    const projectContext = typeof body?.projectContext === "string" ? body.projectContext.slice(0, 4000) : "";
    if (!message) return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
    if (!apiKey) {
      return NextResponse.json({ ok: true, mode: "fallback", reply: fallback(message, projectTitle) });
    }

    const context = projectContext ? `\nKonteks project saat ini:\n${projectContext}` : "";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_ASSISTANT_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna",
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: "Anda adalah SALVIAN AI ASSISTANT untuk SALVIAN AI VIDEO. Jawab dalam bahasa Indonesia secara ringkas, praktis, dan langsung bisa dipakai. Bantu pengguna membuat dan memperbaiki konsep, script, storyboard, voice-over, visual, subtitle, timeline, SEO YouTube, serta workflow project. Gunakan konteks project yang diberikan bila relevan. Jangan mengaku sudah menjalankan engine, merender video, menyimpan file, atau mengubah project jika tindakan itu belum benar-benar dilakukan."
            }]
          },
          { role: "user", content: [{ type: "input_text", text: message + context }] }
        ]
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ ok: true, mode: "fallback", reply: fallback(message, projectTitle) });
      }
      return NextResponse.json({ error: "AI Assistant sedang mengalami gangguan. Coba lagi." }, { status: 502 });
    }

    const reply = typeof data?.output_text === "string" ? data.output_text.trim() : "";
    return NextResponse.json({ ok: true, mode: "openai", reply: reply || "AI Assistant tidak mengembalikan jawaban." });
  } catch {
    return NextResponse.json({ error: "AI Assistant tidak dapat memproses permintaan." }, { status: 500 });
  }
}

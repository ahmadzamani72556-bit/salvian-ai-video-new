import { put } from "@vercel/blob";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function safeName(index: number) {
  return `clip-${String(index + 1).padStart(3, "0")}.mp4`;
}

async function downloadClip(url: string, path: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`Clip ${path} tidak dapat diunduh dari engine.`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(path, buffer);
}

async function runFfmpeg(args: string[]) {
  if (!ffmpegPath) throw new Error("FFmpeg tidak tersedia pada deployment produksi.");
  await execFileAsync(ffmpegPath, args, { maxBuffer: 16 * 1024 * 1024 });
}

export async function assembleVideo(input: {
  clips: string[];
  projectId: string;
  durationSeconds: number;
  resolution?: string;
  fps?: number;
  format?: string;
}) {
  if (!input.clips.length) throw new Error("Tidak ada clip visual yang dapat dirakit.");
  const work = await mkdtemp(join(tmpdir(), "salvian-assembly-"));
  try {
    const paths: string[] = [];
    for (let i = 0; i < input.clips.length; i += 1) {
      const path = join(work, safeName(i));
      await downloadClip(input.clips[i], path);
      paths.push(path);
    }

    const concatPath = join(work, "concat.txt");
    const concat = paths.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join("\n");
    await writeFile(concatPath, `${concat}\n`, "utf8");

    const outputPath = join(work, "master.mp4");
    try {
      await runFfmpeg(["-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", "-movflags", "+faststart", outputPath]);
    } catch {
      await runFfmpeg([
        "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatPath,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputPath,
      ]);
    }

    const master = await readFile(outputPath);
    const blob = await put(
      `salvian-video/${input.projectId}/${Date.now()}-master.mp4`,
      master,
      { access: "public", contentType: "video/mp4", addRandomSuffix: false }
    );
    return { url: blob.url, durationSeconds: input.durationSeconds, resolution: input.resolution || "1080p", fps: input.fps || 30, format: input.format || "MP4" };
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}

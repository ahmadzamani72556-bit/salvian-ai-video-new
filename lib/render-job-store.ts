import { neon } from "@neondatabase/serverless";

export type ShotRunState = { startedAt?: string; completedAt?: string; durationSeconds?: number; url?: string };
export type StageRunState = { startedAt?: string; completedAt?: string; durationSeconds?: number };
export type RenderJobState = {
  id: string;
  projectId: string;
  projectTitle: string;
  project: any;
  settings: any;
  plan: any;
  status: string;
  stage: string;
  progress: number;
  currentShot: number;
  phase?: "planning"|"generation"|"continuity"|"audio"|"assembly"|"finalizing";
  providerTaskId?: string;
  provider?: string;
  completedUrls: string[];
  shotRuns?: Record<string, ShotRunState>;
  stageRuns?: Record<string, StageRunState>;
  outputUrl?: string;
  assemblyStatus?: "queued"|"running"|"succeeded"|"failed";
  message: string;
  logs: any[];
  createdAt: string;
  updatedAt: string;
};

function db() {
  // Vercel/Neon integrations may expose different canonical connection variable names.
  // Prefer DATABASE_URL, then supported PostgreSQL/Neon aliases without logging secrets.
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
  ];
  const url = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  if (!url) {
    throw new Error(
      "Render job database belum dikonfigurasi: DATABASE_URL (atau POSTGRES_URL/NEON_DATABASE_URL) tidak tersedia pada deployment ini."
    );
  }
  return neon(url);
}

export async function ensureRenderJobsTable() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS salvian_render_jobs (id text PRIMARY KEY, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
}

export async function saveRenderJobState(state: RenderJobState) {
  await ensureRenderJobsTable();
  const sql = db();
  await sql`INSERT INTO salvian_render_jobs (id,state,updated_at) VALUES (${state.id},${JSON.stringify(state)}::jsonb,now()) ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, updated_at=now()`;
  return state;
}

export async function getRenderJobState(id: string): Promise<RenderJobState | null> {
  await ensureRenderJobsTable();
  const sql = db();
  const rows = await sql`SELECT state FROM salvian_render_jobs WHERE id=${id} LIMIT 1`;
  return rows[0]?.state ? (rows[0].state as RenderJobState) : null;
}

import { neon } from "@neondatabase/serverless";

export type ShotRunState = { startedAt?: string; completedAt?: string; durationSeconds?: number; url?: string };
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
  outputUrl?: string;
  message: string;
  logs: any[];
  createdAt: string;
  updatedAt: string;
};

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Render job database belum dikonfigurasi.");
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

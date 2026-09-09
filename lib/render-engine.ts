export type RenderEngineRequest = {
  jobId: string;
  projectId: string;
  projectTitle: string;
  project: unknown;
  settings: {
    projectId: string;
    projectTitle: string;
    resolution: string;
    fps: string;
    quality: string;
    format: string;
  };
};

export type RenderEngineResult = {
  status: "queued" | "running" | "succeeded" | "failed" | "timeouted" | "cancelled";
  stage: string;
  progress: number;
  engine: "pending" | "connected";
  output: { url?: string; format?: string } | null;
  message: string;
};

export interface RenderEngineAdapter {
  submit(request: RenderEngineRequest): Promise<RenderEngineResult>;
}

/**
 * Production placeholder: keeps the render contract stable until the real
 * renderer is connected. It deliberately does not create fake media output.
 */
export class PendingRenderEngine implements RenderEngineAdapter {
  async submit(_request: RenderEngineRequest): Promise<RenderEngineResult> {
    return {
      status: "queued",
      stage: "waiting-for-engine",
      progress: 0,
      engine: "pending",
      output: null,
      message: "Render job siap. Sambungkan adapter engine produksi untuk mulai rendering.",
    };
  }
}

export const renderEngine: RenderEngineAdapter = new PendingRenderEngine();

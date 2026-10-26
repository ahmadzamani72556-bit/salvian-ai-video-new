export type RenderEngineRequest = {
  jobId: string;
  projectId: string;
  projectTitle: string;
  project: any;
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
  providerTaskId?: string;
};

export interface RenderEngineAdapter {
  submit(request: RenderEngineRequest): Promise<RenderEngineResult>;
}

/**
 * Native Salvian AI Video render slot.
 *
 * IMPORTANT:
 * - This module deliberately has NO dependency on Salvian AI Creator.
 * - It deliberately has NO dependency on Mureka's video API.
 * - The production video provider will be implemented behind this native
 *   adapter without changing the Studio render contract.
 *
 * Keeping the slot explicit prevents the application from silently falling
 * back to another product while the native Salvian engine is being built.
 */
export class SalvianNativeRenderEngine implements RenderEngineAdapter {
  async submit(request: RenderEngineRequest): Promise<RenderEngineResult> {
    const minutes = Number(request.project?.duration);
    if (!Number.isFinite(minutes) || ![5, 6, 7, 8].includes(minutes)) {
      return {
        status: "failed",
        stage: "invalid-duration",
        progress: 0,
        engine: "pending",
        output: null,
        message: "Produksi long-form hanya mendukung 5, 6, 7, atau 8 menit.",
      };
    }

    return {
      status: "failed",
      stage: "native-engine-pending",
      progress: 0,
      engine: "pending",
      output: null,
      message: "Mesin video native Salvian AI Video belum terhubung. Tidak ada render yang dialihkan ke Salvian AI Creator atau provider video lain.",
    };
  }
}

export const renderEngine: RenderEngineAdapter = new SalvianNativeRenderEngine();

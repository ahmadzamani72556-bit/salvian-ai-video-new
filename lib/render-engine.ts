import { buildLongFormPlan, missingProviderConfiguration, providerEndpoint, type ProductionLog } from "./long-form-engine";

export type RenderEngineRequest = {
  jobId: string;
  projectId: string;
  projectTitle: string;
  project: any;
  settings: { projectId: string; projectTitle: string; resolution: string; fps: string; quality: string; format: string };
};

export type RenderEngineResult = {
  status: "queued" | "running" | "succeeded" | "failed" | "timeouted" | "cancelled";
  stage: string;
  progress: number;
  engine: "pending" | "connected";
  output: { url?: string; format?: string } | null;
  message: string;
  providerTaskId?: string;
  logs?: ProductionLog[];
};

export interface RenderEngineAdapter { submit(request: RenderEngineRequest): Promise<RenderEngineResult>; }

export class SalvianNativeRenderEngine implements RenderEngineAdapter {
  async submit(request: RenderEngineRequest): Promise<RenderEngineResult> {
    const minutes = Number(request.project?.duration);
    if (!Number.isFinite(minutes) || ![5, 6, 7, 8].includes(minutes)) return { status:"failed", stage:"invalid-duration", progress:0, engine:"pending", output:null, message:"Produksi long-form hanya mendukung 5, 6, 7, atau 8 menit." };
    let plan;
    try { plan = buildLongFormPlan(request.project); } catch (error) { return { status:"failed", stage:"planning-failed", progress:0, engine:"pending", output:null, message:error instanceof Error?error.message:"Gagal menyusun rencana long-form." }; }
    const missing = missingProviderConfiguration(plan);
    if (missing.length) return { status:"failed", stage:"engine-not-configured", progress:20, engine:"pending", output:null, message:`Mesin native Salvian sudah menyiapkan orkestrasi multi-engine, tetapi jalur provider belum dikonfigurasi: ${missing.join(", ")}. Tidak ada fallback ke Salvian AI Creator.`, logs:plan.logs };

    const firstProvider = plan.shots[0]?.provider;
    const endpoint = firstProvider ? providerEndpoint(firstProvider) : null;
    if (!endpoint) return { status:"failed", stage:"engine-not-configured", progress:20, engine:"pending", output:null, message:"Tidak ada provider video yang aktif.", logs:plan.logs };

    try {
      const response = await fetch(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ jobId:request.jobId, projectId:request.projectId, title:request.projectTitle, settings:request.settings, plan }) });
      const data = await response.json().catch(()=>({}));
      if (!response.ok || !data.taskId) return { status:"failed", stage:"provider-submit-failed", progress:20, engine:"connected", output:null, message:String(data.message||`Provider ${firstProvider} gagal menerima production plan.`), logs:plan.logs };
      return { status:"queued", stage:"provider-queued", progress:22, engine:"connected", output:null, providerTaskId:String(data.taskId), message:`Produksi long-form diterima. Salvian sedang menjalankan ${plan.shots.length} shot melalui orkestrasi multi-engine.`, logs:plan.logs };
    } catch (error) {
      return { status:"failed", stage:"provider-network-failed", progress:20, engine:"connected", output:null, message:error instanceof Error?error.message:"Koneksi provider gagal.", logs:plan.logs };
    }
  }
}

export const renderEngine: RenderEngineAdapter = new SalvianNativeRenderEngine();

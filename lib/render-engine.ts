import { buildLongFormPlan, missingProviderConfiguration, type LongFormShot, type ProductionLog } from "./long-form-engine";
import { saveRenderJobState, type RenderJobState } from "./render-job-store";
import { submitProvider } from "./video-provider-adapters";

export type RenderEngineRequest={jobId:string;projectId:string;projectTitle:string;project:any;settings:any};
export type RenderEngineResult={status:"queued"|"running"|"succeeded"|"failed";stage:string;progress:number;engine:"pending"|"connected";output:{url?:string;format?:string}|null;message:string;providerTaskId?:string;logs?:ProductionLog[]};

export interface RenderEngineAdapter{submit(request:RenderEngineRequest):Promise<RenderEngineResult>}

export class SalvianNativeRenderEngine implements RenderEngineAdapter {
 async submit(request:RenderEngineRequest):Promise<RenderEngineResult>{
  const minutes=Number(request.project?.duration); if(![5,6,7,8].includes(minutes)) return {status:"failed",stage:"invalid-duration",progress:0,engine:"pending",output:null,message:"Durasi long-form hanya mendukung 5, 6, 7, atau 8 menit."};
  let plan; try{plan=buildLongFormPlan(request.project);}catch(e){return {status:"failed",stage:"planning-failed",progress:0,engine:"pending",output:null,message:e instanceof Error?e.message:"Gagal menyusun rencana long-form."};}
  const missing=missingProviderConfiguration(plan); if(missing.length) return {status:"failed",stage:"engine-not-configured",progress:20,engine:"pending",output:null,message:"Arsitektur multi-engine sudah siap, tetapi semua kredensial engine produksi belum diisi di server.",logs:plan.logs};
  const first=plan.shots[0]; if(!first)return {status:"failed",stage:"planning-failed",progress:0,engine:"pending",output:null,message:"Tidak ada shot yang dapat diproduksi.",logs:plan.logs};
  try{
   const task=await submitProvider(first.provider,first,request.project,request.settings);
   const state:RenderJobState={id:request.jobId,projectId:request.projectId,projectTitle:request.projectTitle,project:request.project,settings:request.settings,plan,status:"queued",stage:"generation",progress:Math.max(20,Math.round(20+(first.duration/plan.durationSeconds)*45)),currentShot:0,providerTaskId:task.taskId,provider:first.provider,completedUrls:[],message:"Salvian memulai produksi shot pertama.",logs:plan.logs,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   await saveRenderJobState(state);
   return {status:"queued",stage:"generation",progress:state.progress,engine:"connected",output:null,message:state.message,providerTaskId:task.taskId,logs:plan.logs};
  }catch(e){return {status:"failed",stage:"provider-submit-failed",progress:20,engine:"connected",output:null,message:e instanceof Error?e.message:"Mesin video tidak dapat menerima tugas produksi.",logs:plan.logs};}
 }
}
export const renderEngine:RenderEngineAdapter=new SalvianNativeRenderEngine();

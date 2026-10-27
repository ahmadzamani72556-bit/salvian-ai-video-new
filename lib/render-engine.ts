import { buildLongFormPlan, type ProductionLog } from "./long-form-engine";
import { ensureRenderJobsTable, saveRenderJobState, type RenderJobState } from "./render-job-store";

export type RenderEngineRequest={jobId:string;projectId:string;projectTitle:string;project:any;settings:any};
export type RenderEngineResult={status:"queued"|"running"|"succeeded"|"failed";stage:string;progress:number;engine:"pending"|"connected";output:{url?:string;format?:string}|null;message:string;providerTaskId?:string;logs?:ProductionLog[]};
export interface RenderEngineAdapter{submit(request:RenderEngineRequest):Promise<RenderEngineResult>}

export class SalvianNativeRenderEngine implements RenderEngineAdapter {
 async submit(request:RenderEngineRequest):Promise<RenderEngineResult>{
  const minutes=Number(request.project?.duration);
  if(![5,6,7,8].includes(minutes)) return {status:"failed",stage:"invalid-duration",progress:0,engine:"pending",output:null,message:"Durasi long-form hanya mendukung 5, 6, 7, atau 8 menit."};
  let plan;
  try{plan=buildLongFormPlan(request.project);}catch(e){return {status:"failed",stage:"planning-failed",progress:0,engine:"pending",output:null,message:e instanceof Error?e.message:"Gagal menyusun rencana long-form."};}
  try{await ensureRenderJobsTable();}catch(e){return {status:"failed",stage:"storage-not-configured",progress:8,engine:"pending",output:null,message:e instanceof Error?e.message:"Penyimpanan job produksi belum dikonfigurasi.",logs:plan.logs};}
  const first=plan.shots[0];
  if(!first) return {status:"failed",stage:"planning-failed",progress:0,engine:"pending",output:null,message:"Tidak ada shot yang dapat diproduksi.",logs:plan.logs};
  try{
   const now=new Date().toISOString();
   const state:RenderJobState={
    id:request.jobId,projectId:request.projectId,projectTitle:request.projectTitle,project:request.project,settings:request.settings,plan,
    status:"queued",stage:"planning",progress:12,currentShot:0,providerTaskId:"",provider:first.provider,completedUrls:[],shotRuns:{},
    message:"Salvian sedang menyusun film, membaca struktur cerita, dan menyiapkan urutan shot.",logs:plan.logs,createdAt:now,updatedAt:now
   };
   await saveRenderJobState(state);
   return {status:"queued",stage:"planning",progress:12,engine:"connected",output:null,message:state.message,providerTaskId:request.jobId,logs:plan.logs};
  }catch(e){return {status:"failed",stage:"storage-save-failed",progress:12,engine:"connected",output:null,message:e instanceof Error?e.message:"Job produksi tidak dapat disimpan.",logs:plan.logs};}
 }
}
export const renderEngine:RenderEngineAdapter=new SalvianNativeRenderEngine();

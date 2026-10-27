import { buildLongFormPlan, missingProviderConfiguration, providerReady, type ProductionLog } from "./long-form-engine";
import { submitProvider } from "./video-provider-adapters";
import { ensureRenderJobsTable, saveRenderJobState, type RenderJobState } from "./render-job-store";

export type RenderEngineRequest={jobId:string;projectId:string;projectTitle:string;project:any;settings:any};
export type RenderEngineResult={status:"queued"|"running"|"succeeded"|"failed";stage:string;progress:number;engine:"pending"|"connected";output:{url?:string;format?:string}|null;message:string;providerTaskId?:string;provider?:string;logs?:ProductionLog[];plan?:any};
export interface RenderEngineAdapter{submit(request:RenderEngineRequest):Promise<RenderEngineResult>}

export class SalvianNativeRenderEngine implements RenderEngineAdapter {
 async submit(request:RenderEngineRequest):Promise<RenderEngineResult>{
  const minutes=Number(request.project?.duration);
  if(![5,6,7,8].includes(minutes)) return {status:"failed",stage:"invalid-duration",progress:0,engine:"pending",output:null,message:"Durasi long-form hanya mendukung 5, 6, 7, atau 8 menit."};
  let plan;
  try{plan=buildLongFormPlan(request.project);}catch(e){return {status:"failed",stage:"planning-failed",progress:0,engine:"pending",output:null,message:e instanceof Error?e.message:"Gagal menyusun rencana long-form."};}
  const missing=missingProviderConfiguration(plan);
  if(missing.length===3){
   return {status:"failed",stage:"engine-not-configured",progress:0,engine:"pending",output:null,message:"Produksi belum dapat dimulai karena belum ada mesin video AI yang benar-benar terhubung. Hubungkan minimal satu provider video (Seedance, Kling, atau Veo) pada environment Production agar job dapat berjalan dari shot pertama sampai video final.",logs:plan.logs,plan};
  }
  try{await ensureRenderJobsTable();}catch(e){return {status:"failed",stage:"storage-not-configured",progress:8,engine:"pending",output:null,message:e instanceof Error?e.message:"Penyimpanan job produksi belum dikonfigurasi.",logs:plan.logs,plan};}
  const first=plan.shots[0];
  if(!first) return {status:"failed",stage:"planning-failed",progress:0,engine:"pending",output:null,message:"Tidak ada shot yang dapat diproduksi.",logs:plan.logs,plan};
  if(!providerReady(first.provider)) return {status:"failed",stage:"engine-not-ready",progress:16,engine:"pending",output:null,message:`Mesin ${first.provider} belum siap di Production. Tidak ada proses palsu yang akan ditampilkan.`,logs:plan.logs,plan};

  const now=new Date().toISOString();
  const initialLogs=[
   {at:now,stage:"planning",label:"Produksi diterima",detail:`Salvian menyiapkan film ${minutes} menit.`,progress:2},
   ...plan.logs.filter((item:any)=>["planning","music-analysis","shot-planning"].includes(item.stage)).map((item:any)=>({...item,at:now}))
  ];
  try{
   const task=await submitProvider(first.provider,first,request.project,request.settings);
   const generationStarted=new Date().toISOString();
   const generationLogs=[
    ...initialLogs,
    {at:generationStarted,stage:"generation",label:"SHOT 1 dikirim ke mesin video",detail:`${first.provider} menerima SHOT 1 dari ${plan.shots.length}. Task ID berhasil diterima; status berikutnya dipantau langsung dari provider.`,progress:20,provider:first.provider}
   ];
   const planningDuration=Math.max(0,Math.floor((new Date(generationStarted).getTime()-new Date(now).getTime())/1000));
   const state:RenderJobState={
    id:request.jobId,projectId:request.projectId,projectTitle:request.projectTitle,project:request.project,settings:request.settings,plan,
    status:"queued",stage:"generation",phase:"generation",progress:20,currentShot:0,providerTaskId:task.taskId,provider:task.provider,completedUrls:[],shotRuns:{[first.id]:{startedAt:generationStarted}},stageRuns:{planning:{startedAt:now,completedAt:generationStarted,durationSeconds:planningDuration},generation:{startedAt:generationStarted}},
    message:`SHOT 1/${plan.shots.length} benar-benar sudah dikirim ke ${first.provider}. Menunggu mesin mengembalikan video.`,logs:generationLogs,createdAt:now,updatedAt:generationStarted
   };
   await saveRenderJobState(state);
   return {status:"queued",stage:"generation",progress:20,engine:"connected",output:null,message:state.message,providerTaskId:task.taskId,provider:task.provider,logs:generationLogs,plan};
  }catch(e){
   const failedAt=new Date().toISOString();
   const message=e instanceof Error?e.message:"Mesin video gagal menerima SHOT 1.";
   const failedLogs=[...initialLogs,{at:failedAt,stage:"generation",label:"SHOT 1 gagal dikirim",detail:message,progress:16,provider:first.provider}];
   try{await saveRenderJobState({id:request.jobId,projectId:request.projectId,projectTitle:request.projectTitle,project:request.project,settings:request.settings,plan,status:"failed",stage:"engine-submit-failed",phase:"generation",progress:16,currentShot:0,providerTaskId:"",provider:first.provider,completedUrls:[],shotRuns:{},stageRuns:{planning:{startedAt:now,completedAt:failedAt}},message,logs:failedLogs,createdAt:now,updatedAt:failedAt});}catch{}
   return {status:"failed",stage:"engine-submit-failed",progress:16,engine:"connected",output:null,message,provider:first.provider,logs:failedLogs,plan};
  }
 }
}
export const renderEngine:RenderEngineAdapter=new SalvianNativeRenderEngine();

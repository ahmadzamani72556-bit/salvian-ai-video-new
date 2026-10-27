import { NextResponse } from "next/server";
import { getRenderJobState, saveRenderJobState } from "../../../../lib/render-job-store";
import { getProviderStatus, submitProvider } from "../../../../lib/video-provider-adapters";
import { providerReady } from "../../../../lib/long-form-engine";

function publicResult(state:any){
 const shots=Array.isArray(state.plan?.shots)?state.plan.shots:[];
 const totalShots=shots.length;
 const completedCount=Array.isArray(state.completedUrls)?state.completedUrls.length:0;
 const completedClips=Array.isArray(state.completedUrls)?state.completedUrls.slice(-8):[];
 const activeIndex=Math.min(totalShots-1,Math.max(0,Number(state.currentShot)||0));
 const shotPlan=shots.map((shot:any,index:number)=>({
  id:String(shot.id||`shot-${index+1}`),scene:Number(shot.scene)||index+1,duration:Number(shot.duration)||0,
  title:String(shot.title||""),prompt:String(shot.prompt||""),provider:shot.provider,
  status:index<completedCount?"completed":index===activeIndex&&["generation","continuity"].includes(String(state.stage))?"active":"queued"
 }));
 const storyScenes=Array.isArray(state.project?.scenes)?state.project.scenes.map((scene:any,index:number)=>({
  number:Number(scene?.number)||index+1,title:String(scene?.title||`Scene ${index+1}`),visual:String(scene?.visual||""),voice:String(scene?.voice||""),duration:Number(scene?.duration)||0,start:Number(scene?.start)||0,end:Number(scene?.end)||0
 })):[];
 return {id:state.id,status:state.status,stage:state.stage,phase:state.phase||state.stage,progress:Math.max(0,Math.min(100,state.progress)),outputUrl:state.outputUrl,message:state.message,logs:state.logs,currentShot:Math.min(totalShots,state.currentShot||0),totalShots,completedShots:completedCount,completedClips,currentClipUrl:completedClips.length?completedClips[completedClips.length-1]:undefined,shotPlan,storyScenes,updatedAt:state.updatedAt};
}
function assemblyConfigured(){return Boolean(process.env.MEDIA_ASSEMBLER_URL&&process.env.MEDIA_ASSEMBLER_API_KEY);}
function numericFps(value:string){const n=Number(String(value||"").replace(/[^0-9.]/g,""));return Number.isFinite(n)&&n>0?n:30;}
function addLog(state:any,stage:string,label:string,detail:string,progress:number){const last=state.logs?.[state.logs.length-1];if(last?.stage===stage&&last?.label===label&&last?.detail===detail)return;state.logs=[...(state.logs||[]),{at:new Date().toISOString(),stage,label,detail,progress}];}
async function submitAssembly(state:any){const url=process.env.MEDIA_ASSEMBLER_URL!.replace(/\/$/,"");const r=await fetch(`${url}/jobs`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.MEDIA_ASSEMBLER_API_KEY}`},body:JSON.stringify({clips:state.completedUrls,durationSeconds:state.plan.durationSeconds,format:String(state.settings.format||"MP4").toLowerCase(),resolution:state.settings.resolution,fps:numericFps(state.settings.fps),audioUrl:state.plan.music?.url||undefined,sourceMode:state.project?.sourceType||"text"})});const d=await r.json().catch(()=>({}));if(!r.ok||!d?.id)throw new Error("Mesin perakitan timeline belum menerima tugas.");return String(d.id);}
async function assemblyStatus(taskId:string){const url=process.env.MEDIA_ASSEMBLER_URL!.replace(/\/$/,"");const r=await fetch(`${url}/jobs/${encodeURIComponent(taskId)}`,{headers:{Authorization:`Bearer ${process.env.MEDIA_ASSEMBLER_API_KEY}`},cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("Status perakitan timeline tidak dapat dibaca.");const s=String(d?.status||"").toLowerCase();return {status:s==="succeeded"||s==="completed"?"succeeded":s==="failed"||s==="cancelled"?"failed":s==="running"||s==="processing"?"running":"queued",outputUrl:d?.outputUrl||d?.output?.url||d?.result?.url};}

export async function GET(request:Request){
 const jobId=new URL(request.url).searchParams.get("taskId")?.trim()||"";
 if(!jobId)return NextResponse.json({error:"taskId wajib diisi."},{status:400});
 try{
  const state=await getRenderJobState(jobId);
  if(!state)return NextResponse.json({error:"Job produksi tidak ditemukan."},{status:404});
  if(["succeeded","failed","cancelled"].includes(state.status))return NextResponse.json({result:publicResult(state)});
  const totalShots=Math.max(1,state.plan?.shots?.length||1);

  if(state.stage==="planning"&&!state.providerTaskId){
   const first=state.plan.shots[state.currentShot||0];
   if(!first)throw new Error("Shot pertama tidak ditemukan.");
   if(!providerReady(first.provider)){
    state.status="queued";state.phase="planning";state.stage="planning";state.progress=Math.max(16,Number(state.progress)||12);state.message="Film dan storyboard sudah tersusun. Salvian menunggu mesin visual produksi siap sebelum membuat shot pertama.";addLog(state,"planning","Menunggu mesin visual","Storyboard sudah siap; produksi visual akan dimulai setelah konfigurasi engine tersedia.",state.progress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
   }
   const task=await submitProvider(first.provider,first,state.project,state.settings);state.provider=first.provider;state.providerTaskId=task.taskId;state.status="queued";state.phase="generation";state.stage="generation";state.progress=20;state.message=`Film sudah tersusun. Salvian mulai membuat visual shot 1 dari ${totalShots}.`;addLog(state,"generation","Membuat visual",`Memulai shot 1 dari ${totalShots}.`,20);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(state.stage==="continuity"&&!state.providerTaskId){
   const next=state.plan.shots[state.currentShot];if(!next)throw new Error("Shot lanjutan tidak ditemukan.");
   if(!providerReady(next.provider)){
    state.status="queued";state.phase="continuity";state.stage="continuity";state.progress=Math.min(87,Math.round(20+(state.currentShot/totalShots)*66));state.message=`Shot ${state.currentShot} selesai. Salvian menunggu mesin visual berikutnya siap sebelum melanjutkan shot ${state.currentShot+1}.`;addLog(state,"continuity","Menunggu mesin visual",`Continuity sudah disiapkan untuk shot ${state.currentShot+1}.`,state.progress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
   }
   const task=await submitProvider(next.provider,next,state.project,state.settings);state.provider=next.provider;state.providerTaskId=task.taskId;state.status="queued";state.phase="generation";state.stage="generation";state.progress=Math.min(86,Math.round(20+(state.currentShot/totalShots)*66));state.message=`Continuity terjaga. Salvian mulai membuat shot ${state.currentShot+1} dari ${totalShots}.`;addLog(state,"generation","Membuat visual",`Membuat shot ${state.currentShot+1} dari ${totalShots}.`,state.progress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(state.stage==="audio"&&!state.providerTaskId){
   if(!assemblyConfigured()){state.status="failed";state.stage="assembly-not-configured";state.phase="audio";state.message="Semua shot sudah selesai, tetapi mesin perakitan video final belum dikonfigurasi di server.";state.progress=90;state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   const assemblyTask=await submitAssembly(state);state.status="assembling";state.stage="assembly";state.phase="assembly";state.progress=92;state.providerTaskId=assemblyTask;state.provider="";state.message="Audio, visual, dan seluruh shot sudah siap. Salvian sedang merakit timeline master.";addLog(state,"assembly","Merakit timeline","Menggabungkan seluruh shot dengan audio dan pengaturan export.",92);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(state.stage==="assembly"){
   if(!state.providerTaskId)throw new Error("Assembly task tidak ditemukan.");const a=await assemblyStatus(state.providerTaskId);
   if(a.status==="succeeded"){state.status="succeeded";state.stage="finalizing";state.phase="finalizing";state.progress=100;state.outputUrl=a.outputUrl;state.message="Video panjang selesai dirakit menjadi satu file final.";addLog(state,"finalizing","Menyiapkan video final","File master siap diputar.",100);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   if(a.status==="failed"){state.status="failed";state.stage="assembly-failed";state.phase="assembly";state.message="Perakitan video final gagal.";state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   state.status="assembling";state.stage="assembly";state.phase="assembly";state.progress=Math.max(92,Math.min(98,state.progress+1));state.message="Salvian sedang merakit seluruh shot menjadi satu video panjang.";state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(!state.providerTaskId||!state.provider)throw new Error("Tugas engine aktif tidak ditemukan.");
  const current=state.plan.shots[state.currentShot];if(!current)throw new Error("Shot aktif tidak ditemukan.");
  const provider=await getProviderStatus(state.provider,state.providerTaskId);const base=20+(Math.min(state.currentShot,totalShots-1)/totalShots)*66;state.progress=Math.min(86,Math.max(20,Math.round(base)));state.stage="generation";state.phase="generation";state.message=provider.message||`Salvian sedang membuat shot ${state.currentShot+1} dari ${totalShots}.`;
  if(provider.status==="failed"){state.status="failed";state.stage="generation-failed";state.message="Salah satu shot visual gagal diproduksi. Salvian menghentikan job agar tidak membuat hasil palsu.";state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  if(provider.status!=="succeeded"){state.status="running";addLog(state,"generation","Membuat visual",`Shot ${state.currentShot+1} dari ${totalShots} masih diproses.`,state.progress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  if(!provider.outputUrl)throw new Error("Engine menyatakan selesai tetapi tidak mengembalikan output video.");
  state.completedUrls.push(provider.outputUrl);state.currentShot++;
  if(state.currentShot>=totalShots){state.status="running";state.stage="audio";state.phase="audio";state.progress=89;state.providerTaskId="";state.provider="";state.message="Semua visual selesai. Salvian sedang menyelaraskan audio dan menyiapkan timeline master.";addLog(state,"audio","Menyelaraskan audio","Menempatkan audio pada timeline final.",89);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  const continuityProgress=Math.min(87,Math.round(20+(state.currentShot/totalShots)*66));state.status="running";state.stage="continuity";state.phase="continuity";state.progress=continuityProgress;state.providerTaskId="";state.message=`Shot ${state.currentShot} selesai. Salvian sedang menjaga continuity sebelum shot berikutnya.`;addLog(state,"continuity","Menjaga continuity",`Menghubungkan shot ${state.currentShot} ke shot ${state.currentShot+1}.`,continuityProgress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Status produksi gagal diproses."},{status:500});}
}

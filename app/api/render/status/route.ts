import { after, NextResponse } from "next/server";
import { getRenderJobState, saveRenderJobState } from "../../../../lib/render-job-store";
import { getProviderStatus, submitProvider } from "../../../../lib/video-provider-adapters";
import { providerReady } from "../../../../lib/long-form-engine";
import { assembleVideo } from "../../../../lib/video-assembler";

export const maxDuration = 300;

function durationSeconds(start?:string,end?:string){if(!start)return undefined;const a=new Date(start).getTime();const b=end?new Date(end).getTime():Date.now();return Math.max(0,Math.floor((b-a)/1000));}
function publicResult(state:any){
 const shots=Array.isArray(state.plan?.shots)?state.plan.shots:[];
 const totalShots=shots.length;
 const completedCount=Array.isArray(state.completedUrls)?state.completedUrls.length:0;
 const completedClips=Array.isArray(state.completedUrls)?state.completedUrls:[];
 const activeIndex=Math.min(Math.max(totalShots-1,0),Math.max(0,Number(state.currentShot)||0));
 const shotRuns=state.shotRuns&&typeof state.shotRuns==="object"?state.shotRuns:{};
 const shotPlan=shots.map((shot:any,index:number)=>{const id=String(shot.id||`shot-${index+1}`);const run=shotRuns[id];return{id,scene:Number(shot.scene)||index+1,duration:Number(shot.duration)||0,title:String(shot.title||shot.prompt||""),prompt:String(shot.prompt||""),provider:shot.provider,status:index<completedCount?"completed":index===activeIndex&&["generation","continuity"].includes(String(state.stage))?"active":"queued",run};});
 const storyScenes=Array.isArray(state.project?.scenes)?state.project.scenes.map((scene:any,index:number)=>({number:Number(scene?.number)||index+1,title:String(scene?.title||`Scene ${index+1}`),visual:String(scene?.visual||""),voice:String(scene?.voice||""),duration:Number(scene?.duration)||0,start:Number(scene?.start)||0,end:Number(scene?.end)||0})):[];
 const planLogs=Array.isArray(state.plan?.logs)?state.plan.logs:[];
 const liveLogs=Array.isArray(state.logs)?state.logs:[];
 return {id:state.id,status:state.status,stage:state.stage,phase:state.phase||state.stage,progress:Math.max(0,Math.min(100,state.progress)),outputUrl:state.outputUrl,message:state.message,logs:liveLogs,productionTimeline:[...planLogs,...liveLogs],currentShot:Math.min(totalShots,state.currentShot||0),totalShots,completedShots:completedCount,completedClips,currentClipUrl:completedClips.length?completedClips[completedClips.length-1]:undefined,shotPlan,shotRuns,storyScenes,assemblyStatus:state.assemblyStatus||undefined,masterStartedAt:state.createdAt,updatedAt:state.updatedAt};
}
function addLog(state:any,stage:string,label:string,detail:string,progress:number){const last=state.logs?.[state.logs.length-1];if(last?.stage===stage&&last?.label===label&&last?.detail===detail)return;state.logs=[...(state.logs||[]),{at:new Date().toISOString(),stage,label,detail,progress}];}

async function runNativeAssembly(jobId:string){
 const state=await getRenderJobState(jobId);if(!state||state.stage!=="assembly"||state.assemblyStatus!=="queued")return;
 try{state.assemblyStatus="running";state.status="assembling";state.progress=Math.max(92,Number(state.progress)||92);state.message="Salvian sedang merakit semua clip menjadi satu timeline video utuh.";addLog(state,"assembly","Merakit timeline","Menggabungkan clip yang sudah selesai menjadi satu master video.",state.progress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);
  const result=await assembleVideo({clips:state.completedUrls,projectId:state.projectId,durationSeconds:state.plan.durationSeconds,resolution:state.settings?.resolution,fps:Number(String(state.settings?.fps||30).replace(/[^0-9.]/g,""))||30,format:state.settings?.format||"MP4"});
  const finalState=await getRenderJobState(jobId);if(!finalState)return;finalState.assemblyStatus="succeeded";finalState.status="succeeded";finalState.stage="finalizing";finalState.phase="finalizing";finalState.progress=100;finalState.outputUrl=result.url;finalState.message="Video panjang selesai dirakit menjadi satu file final.";addLog(finalState,"finalizing","Menyiapkan video final","File master siap diputar.",100);finalState.updatedAt=new Date().toISOString();await saveRenderJobState(finalState);
 }catch(error){const finalState=await getRenderJobState(jobId);if(!finalState)return;finalState.assemblyStatus="failed";finalState.status="failed";finalState.stage="assembly-failed";finalState.phase="assembly";finalState.progress=Math.max(92,Number(finalState.progress)||92);finalState.message=error instanceof Error?error.message:"Perakitan video final gagal.";finalState.updatedAt=new Date().toISOString();await saveRenderJobState(finalState);}
}

export async function GET(request:Request){
 const jobId=new URL(request.url).searchParams.get("taskId")?.trim()||"";if(!jobId)return NextResponse.json({error:"taskId wajib diisi."},{status:400});
 try{
  const state=await getRenderJobState(jobId);if(!state)return NextResponse.json({error:"Job produksi tidak ditemukan."},{status:404});
  if(["succeeded","failed","cancelled"].includes(state.status))return NextResponse.json({result:publicResult(state)});
  const totalShots=Math.max(1,state.plan?.shots?.length||1);

  if(state.stage==="planning"&&!state.providerTaskId){
   const first=state.plan.shots[state.currentShot||0];if(!first)throw new Error("Shot pertama tidak ditemukan.");
   if(!providerReady(first.provider)){state.status="queued";state.phase="planning";state.stage="planning";state.progress=Math.max(16,Number(state.progress)||12);state.message="Film dan storyboard sudah tersusun. Salvian sedang mencari mesin visual yang tersedia.";addLog(state,"planning","Menunggu mesin visual","Belum ada mesin visual siap untuk shot pertama.",state.progress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   const task=await submitProvider(first.provider,first,state.project,state.settings);const startedAt=new Date().toISOString();state.shotRuns=state.shotRuns||{};state.shotRuns[first.id]={...(state.shotRuns[first.id]||{}),startedAt};state.provider=first.provider;state.providerTaskId=task.taskId;state.status="queued";state.phase="generation";state.stage="generation";state.progress=20;state.message=`Storyboard siap. Salvian mulai membuat visual shot 1 dari ${totalShots}.`;addLog(state,"generation","Membuat visual",`Memulai shot 1 dari ${totalShots}.`,20);state.updatedAt=startedAt;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(state.stage==="continuity"&&!state.providerTaskId){
   const next=state.plan.shots[state.currentShot];if(!next)throw new Error("Shot lanjutan tidak ditemukan.");
   if(!providerReady(next.provider)){state.status="queued";state.phase="continuity";state.stage="continuity";state.progress=Math.min(87,Math.round(20+(state.currentShot/totalShots)*66));state.message=`Shot ${state.currentShot} selesai. Salvian sedang memilih mesin visual berikutnya yang tersedia.`;addLog(state,"continuity","Menunggu mesin visual",`Continuity sudah disiapkan untuk shot ${state.currentShot+1}.`,state.progress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   const task=await submitProvider(next.provider,next,state.project,state.settings);const startedAt=new Date().toISOString();state.shotRuns=state.shotRuns||{};state.shotRuns[next.id]={...(state.shotRuns[next.id]||{}),startedAt};state.provider=next.provider;state.providerTaskId=task.taskId;state.status="queued";state.phase="generation";state.stage="generation";state.progress=Math.min(86,Math.round(20+(state.currentShot/totalShots)*66));state.message=`Continuity terkunci. Salvian mulai membuat shot ${state.currentShot+1} dari ${totalShots}.`;addLog(state,"generation","Membuat visual",`Membuat shot ${state.currentShot+1} dari ${totalShots}.`,state.progress);state.updatedAt=startedAt;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(state.stage==="audio"&&!state.providerTaskId){state.status="assembling";state.stage="assembly";state.phase="assembly";state.progress=92;state.providerTaskId=`native:${state.id}`;state.assemblyStatus="queued";state.message="Semua visual selesai. Salvian sedang menyelaraskan audio dan menyiapkan timeline master.";addLog(state,"audio","Menyelaraskan audio","Menempatkan audio pada timeline final.",89);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);after(()=>runNativeAssembly(state.id));return NextResponse.json({result:publicResult(state)});}

  if(state.stage==="assembly"){
   if(state.assemblyStatus==="succeeded"&&state.outputUrl){state.status="succeeded";state.stage="finalizing";state.phase="finalizing";state.progress=100;state.message="Video panjang selesai dirakit menjadi satu file final.";state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   if(state.assemblyStatus==="failed"){state.status="failed";state.stage="assembly-failed";state.phase="assembly";state.message=state.message||"Perakitan video final gagal.";state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   state.status="assembling";state.progress=Math.min(99,Math.max(92,Number(state.progress)||92)+1);state.stage="assembly";state.phase="assembly";state.message="Salvian sedang merakit semua clip menjadi satu video utuh.";state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(!state.providerTaskId||!state.provider)throw new Error("Tugas engine aktif tidak ditemukan.");
  const current=state.plan.shots[state.currentShot];if(!current)throw new Error("Shot aktif tidak ditemukan.");
  const provider=await getProviderStatus(state.provider,state.providerTaskId);const base=20+(Math.min(state.currentShot,totalShots-1)/totalShots)*66;state.progress=Math.min(86,Math.max(20,Math.round(base)));state.stage="generation";state.phase="generation";state.message=provider.message||`Salvian sedang membuat shot ${state.currentShot+1} dari ${totalShots}.`;
  if(provider.status==="failed"){state.status="failed";state.stage="generation-failed";state.message="Salah satu shot visual gagal diproduksi. Salvian menghentikan job agar tidak membuat hasil palsu.";state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  if(provider.status!=="succeeded"){state.status="running";addLog(state,"generation","Membuat visual",`Shot ${state.currentShot+1} dari ${totalShots} masih diproses.`,state.progress);state.updatedAt=new Date().toISOString();await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  if(!provider.outputUrl)throw new Error("Engine menyatakan selesai tetapi tidak mengembalikan output video.");
  const completedAt=new Date().toISOString();state.shotRuns=state.shotRuns||{};state.shotRuns[current.id]={...(state.shotRuns[current.id]||{}),completedAt,durationSeconds:durationSeconds(state.shotRuns[current.id]?.startedAt,completedAt),url:provider.outputUrl};state.completedUrls.push(provider.outputUrl);state.currentShot++;
  if(state.currentShot>=totalShots){state.status="running";state.stage="audio";state.phase="audio";state.progress=89;state.providerTaskId="";state.provider="";state.message="Semua visual selesai. Salvian sedang menyelaraskan audio dan menyiapkan timeline master.";addLog(state,"audio","Menyelaraskan audio","Menempatkan audio pada timeline final.",89);state.updatedAt=completedAt;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  const continuityProgress=Math.min(87,Math.round(20+(state.currentShot/totalShots)*66));state.status="running";state.stage="continuity";state.phase="continuity";state.progress=continuityProgress;state.providerTaskId="";state.provider="";state.message=`Shot ${state.currentShot} selesai. Salvian sedang menjaga continuity sebelum shot berikutnya.`;addLog(state,"continuity","Menjaga continuity",`Menghubungkan shot ${state.currentShot} ke shot ${state.currentShot+1}.`,continuityProgress);state.updatedAt=completedAt;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Status produksi gagal diproses."},{status:500});}
}

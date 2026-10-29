import { after, NextResponse } from "next/server";
import { getRenderJobState, saveRenderJobState } from "../../../../lib/render-job-store";
import { getProviderStatus, submitProvider } from "../../../../lib/video-provider-adapters";
import { providerReady, buildLongFormPlan } from "../../../../lib/long-form-engine";
import { assembleVideo } from "../../../../lib/video-assembler";

export const maxDuration = 300;

function durationSeconds(start?:string,end?:string){if(!start)return undefined;const a=new Date(start).getTime();const b=end?new Date(end).getTime():Date.now();return Math.max(0,Math.floor((b-a)/1000));}
function ensureStageRuns(state:any){state.stageRuns=state.stageRuns&&typeof state.stageRuns==="object"?state.stageRuns:{};return state.stageRuns;}
function startStage(state:any,stage:string,at=new Date().toISOString()){const runs=ensureStageRuns(state);const current=runs[stage];if(!current?.startedAt)runs[stage]={startedAt:at};}
function finishStage(state:any,stage:string,at=new Date().toISOString()){const runs=ensureStageRuns(state);const current=runs[stage];if(current?.startedAt&&!current.completedAt){current.completedAt=at;current.durationSeconds=durationSeconds(current.startedAt,at);}}
function transitionStage(state:any,from:string,to:string,at=new Date().toISOString()){if(from)finishStage(state,from,at);startStage(state,to,at);}
function publicResult(state:any){
 const shots=Array.isArray(state.plan?.shots)?state.plan.shots:[];
 const totalShots=shots.length;
 const completedCount=Array.isArray(state.completedUrls)?state.completedUrls.length:0;
 const completedClips=Array.isArray(state.completedUrls)?state.completedUrls:[];
 const activeIndex=Math.min(Math.max(totalShots-1,0),Math.max(0,Number(state.currentShot)||0));
 const shotRuns=state.shotRuns&&typeof state.shotRuns==="object"?state.shotRuns:{};
 const shotPlan=shots.map((shot:any,index:number)=>{const id=String(shot.id||`shot-${index+1}`);const run=shotRuns[id];const shotStatus=run?.status==="completed"||index<completedCount&&!(state as any).parallelMode?"completed":run?.status==="failed"?"failed":run?.status==="running"?"active":index===activeIndex&&["generation","continuity"].includes(String(state.stage))?"active":"queued";return{id,scene:Number(shot.scene)||index+1,duration:Number(shot.duration)||0,title:String(shot.title||shot.prompt||""),prompt:String(shot.prompt||""),provider:shot.provider,status:shotStatus,run};});
 const storyScenes=Array.isArray(state.project?.scenes)?state.project.scenes.map((scene:any,index:number)=>({number:Number(scene?.number)||index+1,title:String(scene?.title||`Scene ${index+1}`),visual:String(scene?.visual||""),voice:String(scene?.voice||""),duration:Number(scene?.duration)||0,start:Number(scene?.start)||0,end:Number(scene?.end)||0})):[];
 const liveLogs=Array.isArray(state.logs)?state.logs:[];
 return {id:state.id,status:state.status,stage:state.stage,phase:state.phase||state.stage,progress:Math.max(0,Math.min(100,state.progress)),outputUrl:state.outputUrl,message:state.message,providerTaskId:state.providerTaskId||undefined,provider:state.provider||undefined,logs:liveLogs,productionTimeline:liveLogs,currentShot:Math.min(totalShots,state.currentShot||0),totalShots,completedShots:completedCount,completedClips,currentClipUrl:completedClips.length?completedClips[completedClips.length-1]:undefined,shotPlan,shotRuns,stageRuns:state.stageRuns||{},storyScenes,assemblyStatus:state.assemblyStatus||undefined,masterStartedAt:state.createdAt,updatedAt:state.updatedAt};
}
function addLog(state:any,stage:string,label:string,detail:string,progress:number){const last=state.logs?.[state.logs.length-1];if(last?.stage===stage&&last?.label===label&&last?.detail===detail)return;state.logs=[...(state.logs||[]),{at:new Date().toISOString(),stage,label,detail,progress}];}
function failGeneration(state:any,message:string,now:string){finishStage(state,"generation",now);state.status="failed";state.stage="generation-failed";state.phase="generation";state.message=message;state.updatedAt=now;addLog(state,"generation","Produksi berhenti",message,Math.max(20,Number(state.progress)||20));}
function isNonRetryableProviderError(message:string){return /\b(?:400|401|402|403)\b|overdue balance|insufficient balance|billing|payment required|invalid api key|unauthorized|permission denied|does not exist or you do not have access|invalid request|unsupported duration|duration.*(?:limit|maximum)/i.test(message);}
function providerFailureSummary(runs:any,ids:string[]){const reason=ids.map(id=>String(runs?.[id]?.error||"")).find(isNonRetryableProviderError)||ids.map(id=>String(runs?.[id]?.error||"")).find(Boolean)||"";if(/overdue balance/i.test(reason))return "Mesin Seedance menolak tugas karena saldo akun penyedia tertunggak (HTTP 403). Tidak ada shot yang bisa diproduksi sampai tagihan akun diselesaikan. Setelah pembayaran, mulai job baru; shot tidak akan terus diulang sia-sia.";if(/insufficient balance|billing|payment required/i.test(reason))return "Mesin video menolak tugas karena masalah saldo atau penagihan akun penyedia. Selesaikan penagihan terlebih dahulu, lalu mulai job baru.";if(/\b(?:401|403)\b|invalid api key|unauthorized|permission denied|does not exist or you do not have access/i.test(reason))return "Mesin video menolak akses (401/403). Periksa izin model, API key, dan akses endpoint di penyedia sebelum mengulang produksi.";return "Shot "+ids.join(", ")+" gagal setelah percobaan otomatis. "+(reason?"Penyebab terakhir: "+reason:"")+" Visual yang sudah selesai tetap tersimpan.";}

async function runNativeAssembly(jobId:string){
 const state=await getRenderJobState(jobId);if(!state||state.stage!=="assembly"||state.assemblyStatus!=="queued")return;
 try{const started=new Date().toISOString();state.assemblyStatus="running";state.status="assembling";state.progress=Math.max(92,Number(state.progress)||92);state.message="Salvian sedang merakit semua clip menjadi satu timeline video utuh.";startStage(state,"assembly",started);addLog(state,"assembly","Merakit timeline","Menggabungkan clip yang sudah selesai menjadi satu master video.",state.progress);state.updatedAt=started;await saveRenderJobState(state);
  const result=await assembleVideo({clips:state.completedUrls,audioUrl:state.project?.musicAsset?.url,projectId:state.projectId,durationSeconds:state.plan.durationSeconds,resolution:state.settings?.resolution,fps:Number(String(state.settings?.fps||30).replace(/[^0-9.]/g,""))||30,format:state.settings?.format||"MP4"});
  const finalState=await getRenderJobState(jobId);if(!finalState)return;const done=new Date().toISOString();finishStage(finalState,"assembly",done);startStage(finalState,"finalizing",done);finishStage(finalState,"finalizing",done);finalState.assemblyStatus="succeeded";finalState.status="succeeded";finalState.stage="finalizing";finalState.phase="finalizing";finalState.progress=100;finalState.outputUrl=result.url;finalState.message="Video panjang selesai dirakit menjadi satu file final.";addLog(finalState,"finalizing","Menyiapkan video final","File master siap diputar.",100);finalState.updatedAt=done;await saveRenderJobState(finalState);
 }catch(error){const finalState=await getRenderJobState(jobId);if(!finalState)return;const done=new Date().toISOString();finishStage(finalState,"assembly",done);finalState.assemblyStatus="failed";finalState.status="failed";finalState.stage="assembly-failed";finalState.phase="assembly";finalState.progress=Math.max(92,Number(finalState.progress)||92);finalState.message=error instanceof Error?error.message:"Perakitan video final gagal.";finalState.updatedAt=done;await saveRenderJobState(finalState);}
}

export async function GET(request:Request){
 const jobId=new URL(request.url).searchParams.get("taskId")?.trim()||"";if(!jobId)return NextResponse.json({error:"taskId wajib diisi."},{status:400});
 try{
  const state=await getRenderJobState(jobId);if(!state)return NextResponse.json({error:"Job produksi tidak ditemukan."},{status:404});
  // Recover jobs that failed only because an older deployment used an overly strict Mureka readiness gate.
  // Keep the existing job ID and source assets; do not require a re-upload.
  if(state.project?.sourceType==="song" && state.status==="failed" && /Mesin mureka belum siap|engine-not-ready/i.test(String(state.message||""))){
   const resumedAt=new Date().toISOString();
   state.status="queued";state.stage="planning";state.phase="planning";state.progress=12;state.currentShot=0;
   state.providerTaskId="";state.provider="mureka";state.completedUrls=[];state.shotRuns={};(state as any).parallelMode=false;
   state.assemblyStatus=undefined;state.outputUrl=undefined;
   state.message="Melanjutkan job video musik yang sebelumnya tertahan pada pemeriksaan kesiapan Mureka.";
   state.logs=[...(state.logs||[]),{at:resumedAt,stage:"planning",label:"Melanjutkan job yang tertahan",detail:"Pemeriksaan kesiapan Mureka telah diperbaiki. Job lama dilanjutkan tanpa meminta unggah ulang.",progress:12}];
   state.updatedAt=resumedAt;await saveRenderJobState(state);
  }
  // If the cinematic endpoint rejected every request shape, migrate this failed job once to the documented Lyrics Video fallback.
  if(state.project?.sourceType==="song" && state.status==="failed" && /Invalid Request/i.test(String(state.message||"")) && state.plan?.version!=="mureka-lyrics-fallback-v1"){
   state.project.murekaVideoApiUnavailable=true;state.project.murekaVideoFallback="lyrics-video";
  }
  // Song projects use a bounded segment plan; stale jobs are upgraded in place.
  const expectedMusicPlan=state.project?.sourceType==="song"?buildLongFormPlan(state.project):undefined;
  if(state.project?.sourceType==="song" && (state.plan?.version!==expectedMusicPlan?.version || state.plan?.shots?.length!==expectedMusicPlan?.shots.length || (state.status==="failed" && /Mesin mureka belum siap|engine-not-ready/i.test(String(state.message||""))))){
   const musicPlan=expectedMusicPlan!;
   state.plan=musicPlan;state.parallelMode=false;state.shotRuns={};state.completedUrls=[];state.currentShot=0;state.providerTaskId="";state.provider="mureka";state.status="queued";state.stage="planning";state.phase="planning";state.progress=12;state.assemblyStatus=undefined;state.outputUrl=undefined;
   const fallbackMode=state.project?.murekaVideoFallback==="lyrics-video";
   state.message=fallbackMode?"Mureka cinematic ditolak; melanjutkan lewat Lyrics Video dengan segmen panjang agar satu video penuh tetap selesai.":"Alur video musik aktif: seluruh lagu dibagi menjadi segmen pendek dan dirakit otomatis menjadi satu file final.";
   state.logs=[...(state.logs||[]),{at:new Date().toISOString(),stage:"planning",label:fallbackMode?"Mengaktifkan fallback Lyrics Video":"Mengaktifkan segmen video musik",detail:fallbackMode?`${musicPlan.shots.length} segmen Lyrics Video berurutan; audio asli akan dipasang sekali pada master akhir.`:`${musicPlan.shots.length} segmen maksimal 15 detik; audio asli akan dipasang sekali pada master akhir.`,progress:12}];
   state.updatedAt=new Date().toISOString();await saveRenderJobState(state);
  }
  const totalShots=Math.max(1,state.plan?.shots?.length||1);const now=new Date().toISOString();ensureStageRuns(state);
  if(["succeeded","failed","cancelled"].includes(state.status))return NextResponse.json({result:publicResult(state)});

  // Parallel long-form pipeline: submit every storyboard shot, track each task independently,
  // preserve storyboard order, retry transient failures, and assemble only after all clips finish.
  if((state as any).parallelMode || (state.stage==="planning"&&!state.providerTaskId)){
   const shots=Array.isArray(state.plan?.shots)?state.plan.shots:[];
   if(!(state as any).parallelMode){
    (state as any).parallelMode=true;state.shotRuns=state.shotRuns||{};state.status="running";state.stage="generation";state.phase="generation";state.progress=20;
    state.message=`Mengirim ${shots.length} visual secara bersamaan. Hasil akan dirangkai mengikuti urutan cerita.`;
    addLog(state,"generation","Memulai render paralel",`${shots.length} shot dikirim sebagai tugas independen; penggabungan menunggu semua visual selesai.`,20);
    let initialSlots=3;
    const submissions=await Promise.all(shots.map(async(shot:any,index:number)=>{
     const id=String(shot.id||`shot-${index+1}`);
     if(initialSlots<=0)return {id,shot,run:{startedAt:now,attempts:0,provider:shot.provider,status:"queued"}};
     initialSlots--;
     try{
      if(!providerReady(shot.provider))throw new Error(`Mesin ${shot.provider} belum siap.`);
      const task=await submitProvider(shot.provider,shot,state.project,state.settings);
      return {id,shot,run:{startedAt:now,attempts:1,provider:shot.provider,taskId:task.taskId,status:"running"}};
     }catch(error){
      return {id,shot,run:{startedAt:now,attempts:0,provider:shot.provider,status:"failed",error:error instanceof Error?error.message:"Pengiriman shot gagal."}};
     }
    }));
    for(const item of submissions)state.shotRuns[item.id]=item.run;
    const sent=submissions.filter(x=>x.run.status==="running").length;
    state.provider="parallel";state.providerTaskId="parallel";state.currentShot=0;state.progress=20;
    state.message=state.project?.murekaVideoFallback==="lyrics-video"?`${sent}/${shots.length} segmen telah dikirim; memakai fallback Lyrics Video agar lagu tetap selesai.`:`${sent}/${shots.length} visual telah dikirim ke mesin; maksimal tiga segmen berjalan bersamaan.`;
    state.updatedAt=now;await saveRenderJobState(state);
    return NextResponse.json({result:publicResult(state)});
   }

   const runs=state.shotRuns||{};let completed=0;let active=0;let permanentFailures:string[]=[];let slotsAvailable=Math.max(0,3-shots.filter((shot:any,index:number)=>{const id=String(shot.id||`shot-${index+1}`);return runs[id]?.status==="running"&&Boolean(runs[id]?.taskId);}).length);
   const updates=await Promise.all(shots.map(async(shot:any,index:number)=>{
    const id=String(shot.id||`shot-${index+1}`);const run=runs[id]||{};
    if(run.status==="completed"&&run.url)return {id,run,kind:"completed"};
    if(run.status==="running"&&run.taskId){
     try{
      const result=await getProviderStatus(run.provider||shot.provider,run.taskId);
      if(result.status==="succeeded"&&result.outputUrl)return {id,run:{...run,status:"completed",url:result.outputUrl,completedAt:now},kind:"completed"};
      if(result.status==="failed")return {id,run:{...run,status:"failed",error:result.message||"Engine menandai shot gagal."},kind:"failed"};
      return {id,run:{...run,status:"running"},kind:"active"};
     }catch(error){
       const pollErrors=(Number(run.pollErrors)||0)+1;
       const pollError=error instanceof Error?error.message:"Status engine gagal dibaca.";
       if(pollErrors<5)return {id,run:{...run,status:"running",pollErrors,lastPollError:pollError},kind:"active"};
       return {id,run:{...run,status:"failed",pollErrors,error:pollError},kind:"failed"};
      }
    }
    if(run.status==="failed"){
     const attempts=Number(run.attempts)||0;
     if(isNonRetryableProviderError(String(run.error||"")))return {id,run,kind:"permanent"};
     if(attempts<3&&!isNonRetryableProviderError(String(run.error||""))){
      if(slotsAvailable<=0)return {id,run,kind:"queued"};
      slotsAvailable--;
      try{const task=await submitProvider(run.provider||shot.provider,shot,state.project,state.settings);return {id,run:{...run,status:"running",taskId:task.taskId,provider:run.provider||shot.provider,attempts:attempts+1,startedAt:now},kind:"active"};}
      catch(error){const nextAttempts=attempts+1;return {id,run:{...run,attempts:nextAttempts,error:error instanceof Error?error.message:"Retry pengiriman gagal.",status:"failed"},kind:nextAttempts>=3?"permanent":"failed"};}
     }
     return {id,run,kind:"permanent"};
    }
    if(slotsAvailable<=0)return {id,run:{...run,status:"queued"},kind:"queued"};
    slotsAvailable--;
    try{const task=await submitProvider(shot.provider,shot,state.project,state.settings);return {id,run:{...run,status:"running",taskId:task.taskId,provider:shot.provider,attempts:1,startedAt:now},kind:"active"};}
    catch(error){return {id,run:{status:"failed",provider:shot.provider,attempts:1,error:error instanceof Error?error.message:"Pengiriman shot gagal."},kind:"failed"};}
   }));
   for(const item of updates){runs[item.id]=item.run;if(item.kind==="completed")completed++;else if(item.kind==="active")active++;else if(item.kind==="permanent")permanentFailures.push(item.id);else if(item.kind!=="queued")active++;}
   state.shotRuns=runs;state.completedUrls=shots.map((shot:any,index:number)=>runs[String(shot.id||`shot-${index+1}`)]?.url).filter((url:any)=>typeof url==="string"&&url.length>0);
   state.currentShot=completed;state.progress=Math.min(88,Math.max(20,Math.round(20+(completed/Math.max(1,shots.length))*68)));
   if(permanentFailures.length){
    state.status="failed";state.stage="generation-failed";state.phase="generation";state.message=providerFailureSummary(runs,permanentFailures);
    addLog(state,"generation","Shot gagal permanen",state.message,state.progress);state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
   }
   if(completed===shots.length){
    state.status="running";state.stage="audio";state.phase="audio";state.progress=89;state.providerTaskId="";state.provider="";startStage(state,"audio",now);
    state.message="Semua visual selesai. Salvian memulai penggabungan otomatis sesuai urutan storyboard.";
    addLog(state,"audio","Semua visual selesai","Semua clip tersedia; mulai penggabungan mengikuti urutan cerita.",89);
    state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
   }
   state.status="running";state.stage="generation";state.phase="generation";state.message=state.project?.murekaVideoFallback==="lyrics-video"?`${completed}/${shots.length} segmen Lyrics Video selesai; ${active} tugas aktif, ${Math.max(0,shots.length-completed-active)} menunggu giliran.`:`${completed}/${shots.length} visual selesai; ${active} tugas aktif, ${Math.max(0,shots.length-completed-active)} menunggu giliran.`;
   state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(state.stage==="planning"&&!state.providerTaskId){
   const first=state.plan.shots[state.currentShot||0];if(!first)throw new Error("Shot pertama tidak ditemukan.");
   if(!providerReady(first.provider)){state.status="failed";state.stage="engine-not-ready";state.phase="planning";state.progress=Math.max(16,Number(state.progress)||12);state.message="Mesin visual untuk shot pertama belum siap di Production. Produksi dihentikan tanpa membuat hasil palsu.";addLog(state,"planning","Mesin belum siap",state.message,state.progress);state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   try{const task=await submitProvider(first.provider,first,state.project,state.settings);const startedAt=new Date().toISOString();finishStage(state,"planning",startedAt);startStage(state,"generation",startedAt);state.shotRuns=state.shotRuns||{};state.shotRuns[first.id]={...(state.shotRuns[first.id]||{}),startedAt,attempts:(Number(state.shotRuns?.[first.id]?.attempts)||0)+1};state.provider=first.provider;state.providerTaskId=task.taskId;state.status="queued";state.phase="generation";state.stage="generation";state.progress=20;state.message=`SHOT 1/${totalShots} dikirim ke ${first.provider}. Task ID: ${task.taskId}`;addLog(state,"generation","SHOT 1 dikirim ke mesin video",`Provider: ${first.provider} · Task ID: ${task.taskId}`,20);state.updatedAt=startedAt;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}catch(error){failGeneration(state,error instanceof Error?error.message:"Mesin video gagal menerima SHOT 1.",now);await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  }

  if(state.stage==="continuity"&&!state.providerTaskId){
   const next=state.plan.shots[state.currentShot];if(!next)throw new Error("Shot lanjutan tidak ditemukan.");
   if(!providerReady(next.provider)){state.status="failed";state.stage="engine-not-ready";state.phase="continuity";state.progress=Math.min(87,Math.round(20+(state.currentShot/totalShots)*66));state.message=`Mesin ${next.provider} belum siap untuk shot ${state.currentShot+1}. Produksi dihentikan tanpa hasil palsu.`;addLog(state,"continuity","Mesin belum siap",state.message,state.progress);state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   try{const task=await submitProvider(next.provider,next,state.project,state.settings);const startedAt=new Date().toISOString();finishStage(state,"continuity",startedAt);startStage(state,"generation",startedAt);state.shotRuns=state.shotRuns||{};state.shotRuns[next.id]={...(state.shotRuns[next.id]||{}),startedAt,attempts:(Number(state.shotRuns?.[next.id]?.attempts)||0)+1};state.provider=next.provider;state.providerTaskId=task.taskId;state.status="queued";state.phase="generation";state.stage="generation";state.progress=Math.min(86,Math.round(20+(state.currentShot/totalShots)*66));state.message=`SHOT ${state.currentShot+1}/${totalShots} dikirim ke ${next.provider}. Task ID: ${task.taskId}`;addLog(state,"generation","Shot berikutnya dikirim ke mesin video",`Provider: ${next.provider} · Task ID: ${task.taskId}`,state.progress);state.updatedAt=startedAt;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}catch(error){failGeneration(state,error instanceof Error?error.message:`Mesin video gagal menerima shot ${state.currentShot+1}.`,now);await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  }

  if(state.stage==="audio"&&!state.providerTaskId){state.status="assembling";state.stage="assembly";state.phase="assembly";state.progress=92;state.providerTaskId=`native:${state.id}`;state.assemblyStatus="queued";state.message="Semua visual selesai. Salvian sedang menyelaraskan audio dan menyiapkan timeline master.";transitionStage(state,"audio","assembly",now);addLog(state,"audio","Menyelaraskan audio","Menempatkan audio pada timeline final.",89);state.updatedAt=now;await saveRenderJobState(state);after(()=>runNativeAssembly(state.id));return NextResponse.json({result:publicResult(state)});}

  if(state.stage==="assembly"){
   if(state.assemblyStatus==="succeeded"&&state.outputUrl){state.status="succeeded";state.stage="finalizing";state.phase="finalizing";state.progress=100;state.message="Video panjang selesai dirakit menjadi satu file final.";state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   if(state.assemblyStatus==="failed"){state.status="failed";state.stage="assembly-failed";state.phase="assembly";state.message=state.message||"Perakitan video final gagal.";state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   state.status="assembling";state.progress=Math.min(99,Math.max(92,Number(state.progress)||92)+1);state.stage="assembly";state.phase="assembly";state.message="Salvian sedang merakit semua clip menjadi satu video utuh.";state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }

  if(!state.providerTaskId||!state.provider)throw new Error("Tugas engine aktif tidak ditemukan.");
  const current=state.plan.shots[state.currentShot];if(!current)throw new Error("Shot aktif tidak ditemukan.");
  let provider:any;try{provider=await getProviderStatus(state.provider,state.providerTaskId);}catch(error){failGeneration(state,error instanceof Error?error.message:"Status mesin video tidak dapat dibaca.",now);await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  const base=20+(Math.min(state.currentShot,totalShots-1)/totalShots)*66;state.progress=Math.min(86,Math.max(20,Math.round(base)));state.stage="generation";state.phase="generation";state.message=provider.message||`Salvian sedang membuat shot ${state.currentShot+1} dari ${totalShots}.`;
  if(provider.status==="failed"){
   const attempts=Number(state.shotRuns?.[current.id]?.attempts)||1;
   if(attempts<3&&!isNonRetryableProviderError(String(provider.message||""))){
    try{const retry=await submitProvider(current.provider,current,state.project,state.settings);state.provider=current.provider;state.providerTaskId=retry.taskId;state.shotRuns=state.shotRuns||{};state.shotRuns[current.id]={...(state.shotRuns[current.id]||{}),startedAt:now,attempts:attempts+1};state.status="queued";state.stage="generation";state.phase="generation";state.message=`SHOT ${state.currentShot+1}/${totalShots} gagal pada percobaan sebelumnya; mencoba ulang otomatis (${attempts+1}/3).`;addLog(state,"generation","Mengulang shot yang gagal",`Percobaan ${attempts+1}/3 untuk shot ${state.currentShot+1}. Clip yang telah selesai tetap disimpan.`,state.progress);state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}catch(error){failGeneration(state,error instanceof Error?error.message:"Pengiriman ulang shot gagal.",now);await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
   }
   failGeneration(state,`Shot ${state.currentShot+1} gagal setelah ${attempts} percobaan. Clip yang sudah selesai tetap disimpan; produksi dihentikan agar tidak membuat hasil palsu.`,now);await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
  }
  if(provider.status!=="succeeded"){state.status="running";addLog(state,"generation","Membuat visual",`Shot ${state.currentShot+1} dari ${totalShots} masih diproses. Task ID: ${state.providerTaskId}`,state.progress);state.updatedAt=now;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  if(!provider.outputUrl){failGeneration(state,"Engine menyatakan selesai tetapi tidak mengembalikan output video.",now);await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  const completedAt=new Date().toISOString();state.shotRuns=state.shotRuns||{};state.shotRuns[current.id]={...(state.shotRuns[current.id]||{}),completedAt,durationSeconds:durationSeconds(state.shotRuns[current.id]?.startedAt,completedAt),url:provider.outputUrl};state.completedUrls.push(provider.outputUrl);state.currentShot++;
  finishStage(state,"generation",completedAt);
  if(state.currentShot>=totalShots){state.status="running";state.stage="audio";state.phase="audio";state.progress=89;state.providerTaskId="";state.provider="";startStage(state,"audio",completedAt);state.message="Semua visual selesai. Salvian sedang menyelaraskan audio dan menyiapkan timeline master.";addLog(state,"audio","Menyelaraskan audio","Menempatkan audio pada timeline final.",89);state.updatedAt=completedAt;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});}
  const continuityProgress=Math.min(87,Math.round(20+(state.currentShot/totalShots)*66));state.status="running";state.stage="continuity";state.phase="continuity";state.progress=continuityProgress;state.providerTaskId="";state.provider="";startStage(state,"continuity",completedAt);state.message=`Shot ${state.currentShot} selesai. Salvian sedang menjaga continuity sebelum shot berikutnya.`;addLog(state,"continuity","Menjaga continuity",`Menghubungkan shot ${state.currentShot} ke shot ${state.currentShot+1}.`,continuityProgress);state.updatedAt=completedAt;await saveRenderJobState(state);return NextResponse.json({result:publicResult(state)});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Status produksi gagal diproses."},{status:500});}
}

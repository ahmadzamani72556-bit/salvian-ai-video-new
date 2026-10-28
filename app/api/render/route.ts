import { NextResponse } from "next/server";
import { buildLongFormPlan } from "../../../lib/long-form-engine";
import { ensureRenderJobsTable, saveRenderJobState, type RenderJobState } from "../../../lib/render-job-store";

type RenderSettings={projectId:string;projectTitle:string;resolution:string;fps:string;quality:string;format:string};
type RenderProject={id?:string;title?:string;duration?:number;durationSeconds?:number;sourceType?:string;sourcePrompt?:string;topic?:string;ratio?:string;updatedAt?:string;scenes?:unknown[];script?:string;musicAsset?:{url?:string;name?:string;durationSeconds?:number;syncMode?:string};audio?:unknown;visual?:unknown;subtitle?:unknown;timeline?:unknown};
const ALLOWED_RESOLUTIONS=new Set(["720p","1080p","4K"]),ALLOWED_FPS=new Set(["24 FPS","30 FPS","60 FPS"]),ALLOWED_QUALITY=new Set(["Standard","High","Maximum"]),ALLOWED_FORMATS=new Set(["MP4","WebM"]);
const renderRequestCache=new Map<string,string>();
function requestKey(project:RenderProject,settings:RenderSettings){return JSON.stringify({projectId:project.id,projectUpdatedAt:project.updatedAt||"",duration:project.duration||0,settings});}

export async function POST(request:Request){
 try{
  const body=(await request.json()) as {project?:RenderProject;settings?:RenderSettings;jobId?:string};
  const inputProject=body.project,settings=body.settings;const project=inputProject?{...inputProject,script:String(inputProject.script||inputProject.sourcePrompt||inputProject.topic||"").trim()}:undefined;
  if(!project?.id||!project.title)return NextResponse.json({error:"Project render tidak valid."},{status:400});
  if(!settings||settings.projectId!==project.id||settings.projectTitle!==project.title)return NextResponse.json({error:"Pengaturan render tidak cocok dengan project."},{status:400});
  if(!ALLOWED_RESOLUTIONS.has(settings.resolution)||!ALLOWED_FPS.has(settings.fps)||!ALLOWED_QUALITY.has(settings.quality)||!ALLOWED_FORMATS.has(settings.format))return NextResponse.json({error:"Pengaturan render tidak didukung."},{status:400});
  const readiness={concept:Boolean(project.script?.trim()),storyboard:Array.isArray(project.scenes)&&project.scenes.length>0,audio:Boolean(project.audio),visual:Boolean(project.visual),subtitle:Boolean(project.subtitle),timeline:Boolean(project.timeline)};
  if(!readiness.concept)return NextResponse.json({error:"Cerita wajib tersedia sebelum produksi dimulai.",readiness},{status:409});
  if(project.sourceType==="song"&&(!project.audio||!project.musicAsset?.url||Number(project.musicAsset.durationSeconds)<10))return NextResponse.json({error:"Unggah lagu penuh dan pastikan durasi audio minimal 10 detik terbaca."},{status:409});
  if(project.sourceType!=="song"&&(!project.audio||!project.musicAsset?.url))return NextResponse.json({error:"Audio sumber wajib tersedia sebelum render."},{status:409});
  const key=requestKey(project,settings),cachedId=body.jobId?undefined:renderRequestCache.get(key);if(cachedId)return NextResponse.json({renderJob:{id:cachedId,projectId:project.id,projectTitle:project.title,status:"queued",stage:"planning",progress:12,settings,readiness,message:`Job ID: ${cachedId} · Produksi sudah diterima.`,providerTaskId:"",provider:"",currentShot:0,totalShots:0,completedShots:0,completedClips:[],productionTimeline:[],updatedAt:new Date().toISOString()},duplicate:true},{status:202});
  const plan=buildLongFormPlan(project);
  const first=plan.shots[0];
  if(!first)return NextResponse.json({error:"Tidak ada shot yang dapat diproduksi."},{status:409});
  const jobId=String(body.jobId||`render-${crypto.randomUUID()}`);const now=new Date().toISOString();
  const initialLogs=[{at:now,stage:"planning",label:"Produksi diterima",detail:`Salvian menyiapkan video ${Math.round(Number(project.duration)*60)} detik. Job ID: ${jobId}`,progress:2},...plan.logs.filter((item:any)=>["planning","music-analysis","shot-planning"].includes(item.stage)).map((item:any)=>({...item,at:now}))];
  const state:RenderJobState={id:jobId,projectId:project.id,projectTitle:project.title,project,settings,plan,status:"queued",stage:"planning",phase:"planning",progress:12,currentShot:0,providerTaskId:"",provider:first.provider,completedUrls:[],shotRuns:{},stageRuns:{planning:{startedAt:now}},message:`Job ID: ${jobId} · Menyiapkan SHOT 1/${plan.shots.length} untuk ${first.provider}.`,logs:initialLogs,createdAt:now,updatedAt:now};
  renderRequestCache.set(key,jobId);
  await ensureRenderJobsTable();
  await saveRenderJobState(state);
  console.info("[render] job persisted",JSON.stringify({jobId,projectId:project.id,shotCount:plan.shots.length,provider:first.provider}));
  const renderJob={id:jobId,projectId:project.id,projectTitle:project.title,status:state.status,stage:state.stage,progress:state.progress,settings,readiness,createdAt:now,updatedAt:now,engine:"connected",output:null,message:state.message,providerTaskId:"",provider:first.provider,shotPlan:plan.shots,shotRuns:{},currentShot:0,totalShots:plan.shots.length,completedShots:0,completedClips:[],productionTimeline:initialLogs};
  return NextResponse.json({renderJob,duplicate:false},{status:202});
 }catch(error){console.error("[render] POST failed",error);return NextResponse.json({error:error instanceof Error?error.message:"Permintaan render tidak dapat diproses."},{status:500});}
}

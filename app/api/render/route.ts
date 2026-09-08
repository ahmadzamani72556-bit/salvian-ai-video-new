import { NextResponse } from "next/server";
import { renderEngine } from "../../../lib/render-engine";

type RenderSettings = { projectId:string; projectTitle:string; resolution:string; fps:string; quality:string; format:string };
type RenderProject = { id?:string; title?:string; duration?:number; ratio?:string; scenes?:unknown[]; script?:string; audio?:unknown; visual?:unknown; subtitle?:unknown; timeline?:unknown };
const ALLOWED_RESOLUTIONS=new Set(["720p","1080p","4K"]);
const ALLOWED_FPS=new Set(["24 FPS","30 FPS","60 FPS"]);
const ALLOWED_QUALITY=new Set(["Standard","High","Maximum"]);
const ALLOWED_FORMATS=new Set(["MP4","WebM"]);

export async function POST(request:Request){
 try{
  const body=(await request.json()) as {project?:RenderProject;settings?:RenderSettings};
  const project=body.project,settings=body.settings;
  if(!project?.id||!project.title)return NextResponse.json({error:"Project render tidak valid."},{status:400});
  if(!settings||settings.projectId!==project.id||settings.projectTitle!==project.title)return NextResponse.json({error:"Pengaturan render tidak cocok dengan project."},{status:400});
  if(!ALLOWED_RESOLUTIONS.has(settings.resolution)||!ALLOWED_FPS.has(settings.fps)||!ALLOWED_QUALITY.has(settings.quality)||!ALLOWED_FORMATS.has(settings.format))return NextResponse.json({error:"Pengaturan render tidak didukung."},{status:400});
  const readiness={concept:Boolean(project.script?.trim()),storyboard:Array.isArray(project.scenes)&&project.scenes.length>0,audio:Boolean(project.audio),visual:Boolean(project.visual),subtitle:Boolean(project.subtitle),timeline:Boolean(project.timeline)};
  const readyCount=Object.values(readiness).filter(Boolean).length;
  if(readyCount<5)return NextResponse.json({error:"Project belum siap untuk antrean render.",readiness,readyCount},{status:409});
  const jobId=`render-${crypto.randomUUID()}`,now=new Date().toISOString();
  const engineResult=await renderEngine.submit({jobId,projectId:project.id,projectTitle:project.title,project,settings});
  return NextResponse.json({renderJob:{id:jobId,projectId:project.id,projectTitle:project.title,status:engineResult.status,stage:engineResult.stage,progress:engineResult.progress,settings,readiness,createdAt:now,updatedAt:now,engine:engineResult.engine,output:engineResult.output,message:engineResult.message}},{status:202});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Permintaan render tidak dapat diproses."},{status:400});}
}

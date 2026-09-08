export type VideoScene = {
  number: number;
  title: string;
  visual: string;
  duration: number;
  voice?: string;
};

export type AudioConfig = { voice:string; music:string; language:string; voiceVolume:number; musicVolume:number; fadeIn:boolean; fadeOut:boolean; voiceEngine:string; musicEngine:string; ducking:boolean; muted:boolean };
export type VisualConfig = { style:string; cameraMotion:string; lighting:string; transition:string; assetMode:string };
export type SubtitleConfig = { enabled:boolean; language:string; style:string; position:string; size:string; outline:boolean };
export type TimelineConfig = { pacing:string; transitionDuration:number; introDuration:number; outroDuration:number };
export type VideoProject = { id:string; title:string; status:string; duration:number; topic?:string; style?:string; ratio?:string; language?:string; voice?:string; music?:string; script?:string; autoStoryboard?:boolean; autoSubtitle?:boolean; smartPacing?:boolean; audio?:AudioConfig; visual?:VisualConfig; subtitle?:SubtitleConfig; timeline?:TimelineConfig; scenes:VideoScene[]; updatedAt:string };
export type RenderSettings = { projectId:string; projectTitle:string; resolution:string; fps:string; quality:string; format:string; updatedAt:string };
export type RenderJob = { id:string; projectId:string; projectTitle:string; status:"queued"|"running"|"succeeded"|"failed"|"cancelled"; stage:string; progress:number; settings:Omit<RenderSettings,"updatedAt">; readiness:Record<string,boolean>; createdAt:string; updatedAt:string; engine:"pending"|"connected"; output:{url?:string;format?:string}|null; message:string };

const ACTIVE_KEY="salvian-video-active-project", WORKSPACE_KEY="salvian-video-workspace", PROJECTS_KEY="salvian-video-projects", RENDER_KEY="salvian-video-render-settings", RENDER_JOBS_KEY="salvian-video-render-jobs", DRAFT_PREFIX="salvian-video-draft:";
export function makeProjectId(title:string){return `video-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"project"}`;}
export function createProjectId(title:string){return `${makeProjectId(title)}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}
function buildDefaultAudio(v:Partial<VideoProject>):AudioConfig{return {voice:v.voice||"Narator Natural",music:v.music||"Ambient Cinematic",language:v.language||"Indonesia",voiceVolume:100,musicVolume:35,fadeIn:true,fadeOut:true,voiceEngine:"Provider Voice",musicEngine:"Provider Music",ducking:true,muted:false};}
function buildDefaultVisual(v:Partial<VideoProject>):VisualConfig{return {style:v.style||"Cinematic",cameraMotion:"Smart",lighting:"Natural",transition:"Smooth",assetMode:"AI + Upload"};}
function buildDefaultSubtitle(v:Partial<VideoProject>):SubtitleConfig{return {enabled:v.autoSubtitle!==false,language:v.language||"Indonesia",style:"Clean White",position:"Bottom",size:"Medium",outline:true};}
function buildDefaultTimeline(v:Partial<VideoProject>):TimelineConfig{return {pacing:v.smartPacing===false?"Manual":"Smart",transitionDuration:.5,introDuration:2,outroDuration:3};}
function normalizeProject(v:Partial<VideoProject>):VideoProject|null{if(!v.title)return null;const audio={...buildDefaultAudio(v),...(v.audio||{})},visual={...buildDefaultVisual(v),...(v.visual||{})},subtitle={...buildDefaultSubtitle(v),...(v.subtitle||{})},timeline={...buildDefaultTimeline(v),...(v.timeline||{})};return {id:v.id||makeProjectId(v.title),title:v.title,status:v.status||"Draft",duration:Number(v.duration)||7,topic:v.topic,style:v.style||visual.style,ratio:v.ratio||"16:9",language:v.language||audio.language,voice:v.voice||audio.voice,music:v.music||audio.music,script:v.script,autoStoryboard:v.autoStoryboard!==false,autoSubtitle:v.autoSubtitle!==false,smartPacing:v.smartPacing!==false,audio,visual,subtitle,timeline,scenes:Array.isArray(v.scenes)?v.scenes:[],updatedAt:v.updatedAt||new Date().toISOString()};}
function hydrateFromDraft(project:VideoProject):VideoProject{if(typeof window==="undefined")return project;try{const raw=localStorage.getItem(`${DRAFT_PREFIX}${project.id}`);if(!raw)return project;const d=JSON.parse(raw) as Partial<VideoProject>&{projectId?:string};if(d.projectId&&d.projectId!==project.id)return project;return normalizeProject({...project,...d,id:project.id,title:d.projectTitle||project.title})||project;}catch{return project;}}
export function readActiveProject():VideoProject|null{if(typeof window==="undefined")return null;try{const raw=localStorage.getItem(ACTIVE_KEY);if(!raw)return null;const p=normalizeProject(JSON.parse(raw));return p?hydrateFromDraft(p):null;}catch{return null;}}
export function readProjects():VideoProject[]{if(typeof window==="undefined")return[];try{const raw=localStorage.getItem(PROJECTS_KEY);if(!raw){const a=readActiveProject();return a?[a]:[];}const p=JSON.parse(raw);if(!Array.isArray(p))return[];return p.map((x)=>normalizeProject(x)).filter(Boolean).map((x)=>hydrateFromDraft(x as VideoProject)) as VideoProject[];}catch{return[];}}
export function readProject(id?:string,title?:string):VideoProject|null{const ps=readProjects();if(id){const byId=ps.find(p=>p.id===id);if(byId)return byId;}return title?ps.find(p=>p.title===title)||null:null;}
export function saveActiveProject(project:VideoProject){if(typeof window==="undefined")return;const n=normalizeProject(project);if(!n)return;localStorage.setItem(ACTIVE_KEY,JSON.stringify(n));localStorage.setItem(WORKSPACE_KEY,JSON.stringify(n));const ps=readProjects().filter(p=>p.id!==n.id);localStorage.setItem(PROJECTS_KEY,JSON.stringify([n,...ps]));}
export function saveProject(project:VideoProject){saveActiveProject(project);}
export function deleteProject(id:string){if(typeof window==="undefined")return;const ps=readProjects().filter(p=>p.id!==id);localStorage.setItem(PROJECTS_KEY,JSON.stringify(ps));localStorage.removeItem(`${DRAFT_PREFIX}${id}`);if(readActiveProject()?.id===id){localStorage.removeItem(ACTIVE_KEY);localStorage.removeItem(WORKSPACE_KEY);}localStorage.setItem(RENDER_JOBS_KEY,JSON.stringify(readRenderJobs().filter(j=>j.projectId!==id)));}
function readRenderMap():Record<string,RenderSettings>{if(typeof window==="undefined")return{};try{const p=JSON.parse(localStorage.getItem(RENDER_KEY)||"null");if(!p)return{};if(p.projectId&&p.projectTitle)return{[p.projectId]:p};return typeof p==="object"&&!Array.isArray(p)?p:{};}catch{return{};}}
export function saveRenderSettings(s:RenderSettings){if(typeof window==="undefined")return;const m=readRenderMap();m[s.projectId]=s;localStorage.setItem(RENDER_KEY,JSON.stringify(m));}
export function readRenderSettings(id?:string):RenderSettings|null{const m=readRenderMap();if(id&&m[id])return m[id];const a=readActiveProject();return a?.id&&m[a.id]?m[a.id]:Object.values(m)[0]||null;}
export function readRenderJobs(id?:string):RenderJob[]{if(typeof window==="undefined")return[];try{const p=JSON.parse(localStorage.getItem(RENDER_JOBS_KEY)||"[]");return Array.isArray(p)?id?p.filter((j:RenderJob)=>j.projectId===id):p:[];}catch{return[];}}
export function saveRenderJob(job:RenderJob){if(typeof window==="undefined")return;localStorage.setItem(RENDER_JOBS_KEY,JSON.stringify([job,...readRenderJobs().filter(j=>j.id!==job.id)].slice(0,50)));}
export function clearProjectState(){if(typeof window==="undefined")return;[ACTIVE_KEY,WORKSPACE_KEY,PROJECTS_KEY,RENDER_KEY,RENDER_JOBS_KEY].forEach(k=>localStorage.removeItem(k));}

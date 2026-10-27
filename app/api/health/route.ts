import { NextResponse } from "next/server";

function configured(value?:string){return Boolean(value&&value.trim());}

export async function GET(){
 const engines={
  seedance:configured(process.env.SEEDANCE_API_KEY),
  kling:configured(process.env.KLING_API_KEY),
  veo:configured(process.env.VEO_ACCESS_TOKEN||process.env.GOOGLE_CLOUD_ACCESS_TOKEN||process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  openaiDirector:configured(process.env.OPENAI_API_KEY),
  blob:configured(process.env.BLOB_READ_WRITE_TOKEN),
 };
 const visualEngine=engines.seedance||engines.kling||engines.veo;
 return NextResponse.json({ok:true,app:"SALVIAN AI VIDEO",version:"native-long-form",production:{generation:engines.openaiDirector?"ready":"waiting-for-director-key",visual:visualEngine?"provider-configured":"waiting-for-engine-key",engines,assembly:engines.blob?"native-blob-ready":"waiting-for-storage",credits:"central-creator"},message:visualEngine&&engines.blob?"Salvian siap menjalankan produksi video long-form.":"Konfigurasi produksi belum lengkap.",timestamp:new Date().toISOString()});
}

import { NextResponse } from 'next/server';

export async function GET(){
  return NextResponse.json({ plan:'Free', credits:100, monthlyCredits:100, premium:false });
}

export async function POST(req: Request){
  try { const body = await req.json(); const cost = Number(body?.cost ?? 0); if(!Number.isFinite(cost)||cost<0) return NextResponse.json({error:'Invalid credit cost'},{status:400}); if(cost>100) return NextResponse.json({error:'Kredit tidak cukup'},{status:402}); return NextResponse.json({ok:true, creditsRemaining:100-cost}); }
  catch { return NextResponse.json({error:'Invalid request'},{status:400}); }
}

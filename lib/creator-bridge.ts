import { getVideoCreditCostFromDescription } from "./credit-pricing";

export const CREATOR_ORIGIN = "https://salvian-ai-creator.vercel.app";
export const CREATOR_ACCOUNT_URL = `${CREATOR_ORIGIN}/akun.html?from=video`;
export const CREATOR_CREDIT_BRIDGE_URL = `${CREATOR_ORIGIN}/credit-bridge.html`;

export type CreatorProfile = { display_name: string; email: string; plan: string; credits: number };
export function isCreatorProfile(value: unknown): value is CreatorProfile { if (!value || typeof value !== "object") return false; const p=value as Record<string,unknown>; return typeof p.display_name === "string" && typeof p.email === "string" && Number.isFinite(Number(p.credits)); }

export function openCreatorAccountAndReturn(nextPath = "/create") {
  if (typeof window === "undefined") return false;
  const next = `${window.location.origin}${nextPath.startsWith("/") ? nextPath : `/${nextPath}`}`;
  const url = `${CREATOR_ACCOUNT_URL}&returnTo=${encodeURIComponent(next)}`;
  const popup = window.open(url, "salvianCreatorAccount", "popup,width=520,height=820,resizable=yes,scrollbars=yes");
  if (!popup) {
    window.location.href = url;
    return false;
  }
  try { popup.focus(); } catch {}
  const timer = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(timer);
      window.location.href = next;
    }
  }, 500);
  window.setTimeout(() => window.clearInterval(timer), 30 * 60 * 1000);
  return true;
}

export function openCreatorAccount(){ if(typeof window==="undefined")return null; return window.open(CREATOR_ACCOUNT_URL,"salvianCreatorAccount","popup,width=520,height=820,resizable=yes,scrollbars=yes"); }

/** Canonical charge gate: retired client amounts cannot undercharge a long-form production. */
export function consumeCreatorCredits(amount:number,description:string){return new Promise<{success:boolean;balance:number;message:string}>((resolve,reject)=>{if(typeof window==="undefined")return reject(new Error("Browser context required."));const cost=getVideoCreditCostFromDescription(description,amount);if(!Number.isFinite(cost)||cost<=0)return reject(new Error("Biaya kredit tidak valid."));const requestId=crypto.randomUUID();const handler=(event:MessageEvent)=>{if(event.origin!==CREATOR_ORIGIN||event.data?.type!=="SALVIAN_CREDIT_RESULT"||event.data?.requestId!==requestId)return;window.clearTimeout(timer);window.removeEventListener("message",handler);resolve({success:event.data.success===true,balance:Number(event.data.balance||0),message:String(event.data.message||"")});};const timer=window.setTimeout(()=>{window.removeEventListener("message",handler);reject(new Error("Creator belum merespons. Pastikan akun Creator sudah login."));},15000);window.addEventListener("message",handler);const popup=window.open(CREATOR_CREDIT_BRIDGE_URL,"salvianCreatorCredit","popup,width=440,height=360,resizable=yes");if(!popup){window.clearTimeout(timer);window.removeEventListener("message",handler);reject(new Error("Popup Creator diblokir browser. Izinkan popup untuk SALVIAN AI CREATOR."));return;}const send=()=>{try{popup.postMessage({type:"SALVIAN_CONSUME_CREDITS",requestId,amount:cost,description},CREATOR_ORIGIN);}catch{}};window.setTimeout(send,1000);window.setTimeout(send,2500);window.setTimeout(send,5000);});}

export function refundCreatorCredits(amount:number,description:string){return new Promise<{success:boolean;balance:number;message:string}>((resolve,reject)=>{if(typeof window==="undefined")return reject(new Error("Browser context required."));const cost=getVideoCreditCostFromDescription(description,amount);if(!Number.isFinite(cost)||cost<=0)return reject(new Error("Jumlah refund tidak valid."));const requestId=crypto.randomUUID();const handler=(event:MessageEvent)=>{if(event.origin!==CREATOR_ORIGIN||event.data?.type!=="SALVIAN_REFUND_RESULT"||event.data?.requestId!==requestId)return;window.clearTimeout(timer);window.removeEventListener("message",handler);resolve({success:event.data.success===true,balance:Number(event.data.balance||0),message:String(event.data.message||"")});};const timer=window.setTimeout(()=>{window.removeEventListener("message",handler);reject(new Error("Creator tidak merespons permintaan refund."));},15000);window.addEventListener("message",handler);const popup=window.open(CREATOR_CREDIT_BRIDGE_URL,"salvianCreatorCredit","popup,width=440,height=360,resizable=yes,scrollbars=yes");if(!popup){window.clearTimeout(timer);window.removeEventListener("message",handler);reject(new Error("Popup Creator diblokir browser."));return;}const send=()=>{try{popup.postMessage({type:"SALVIAN_REFUND_CREDITS",requestId,amount:cost,description},CREATOR_ORIGIN);}catch{}};window.setTimeout(send,1000);window.setTimeout(send,2500);window.setTimeout(send,5000);});}

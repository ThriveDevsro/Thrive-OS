import { Resend } from "resend";

export function resendConfigured(){return Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL&&process.env.APP_URL)}

export async function sendTeamInvitation(input:{to:string;name:string;invitedBy:string;token:string}){
  const apiKey=process.env.RESEND_API_KEY;const from=process.env.RESEND_FROM_EMAIL;const appUrl=process.env.APP_URL?.replace(/\/$/,"");
  if(!apiKey||!from||!appUrl)throw new Error("Resend is not configured. Add RESEND_API_KEY, RESEND_FROM_EMAIL and APP_URL to .env.");
  const inviteUrl=`${appUrl}/accept-invite/${encodeURIComponent(input.token)}`;
  const safeName=escapeHtml(input.name);const safeInviter=escapeHtml(input.invitedBy);
  const resend=new Resend(apiKey);
  const {error}=await resend.emails.send({from,to:[input.to],subject:"You’re invited to Thrive OS",html:`<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#18181b"><div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:36px"><div style="font-weight:800;font-size:20px;margin-bottom:28px">Thrive OS</div><h1 style="font-size:24px;margin:0 0 12px">Welcome, ${safeName}</h1><p style="font-size:15px;line-height:1.6;color:#52525b">${safeInviter} invited you to the private Thrive Dev workspace.</p><a href="${inviteUrl}" style="display:inline-block;margin:18px 0;padding:13px 20px;border-radius:9px;background:#18181b;color:#fff;text-decoration:none;font-weight:700">Set your password</a><p style="font-size:13px;line-height:1.5;color:#71717a">This secure link expires in 24 hours and can be used once.</p><p style="font-size:12px;color:#a1a1aa;margin-top:30px">If you did not expect this invitation, you can ignore this email.</p></div></body></html>`,text:`Welcome to Thrive OS, ${input.name}. ${input.invitedBy} invited you to the private Thrive Dev workspace. Set your password within 24 hours: ${inviteUrl}`});
  if(error)throw new Error(error.message);
}

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]??char)}

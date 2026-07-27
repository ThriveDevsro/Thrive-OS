import { createHash } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { InviteForm } from "./invite-form";

export default async function AcceptInvitePage({params}:{params:Promise<{token:string}>}){const{token}=await params;const preview=process.env.NODE_ENV==="development"&&token==="preview-demo-token";const tokenHash=createHash("sha256").update(token).digest("hex");const invitation=preview?null:await prisma.userInvitation.findUnique({where:{tokenHash},include:{user:true,workspace:true}});const valid=preview||Boolean(invitation&&!invitation.acceptedAt&&invitation.expiresAt>new Date());const workspaceName=preview?"Thrive OS":invitation?.workspace.name;const name=preview?"Patrik":invitation?.user.name?.trim().split(/\s+/)[0];return <main className="invite-page"><section><Image src="/logo.png" alt="Thrive Dev" width={1563} height={2048}/>{valid?<><p className="eyebrow">PRIVATE COMPANY WORKSPACE</p><h1>Join {workspaceName}</h1><p>Hi {name}, create your password to activate your Thrive OS account.</p><InviteForm token={token} preview={preview}/></>:<div className="invite-invalid"><h1>Invitation unavailable</h1><p>This link is invalid, expired or has already been used. Ask the workspace founder to send a new invitation.</p><Link href="/login">Back to sign in</Link></div>}</section></main>}

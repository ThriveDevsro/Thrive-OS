"use server";

import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export type AcceptInviteState={ok?:string;error?:string};
export async function acceptInvitation(_:AcceptInviteState,formData:FormData):Promise<AcceptInviteState>{const parsed=z.object({token:z.string().min(20),password:z.string().min(8,"Password must have at least 8 characters."),confirmPassword:z.string()}).refine(data=>data.password===data.confirmPassword,{message:"Passwords do not match.",path:["confirmPassword"]}).safeParse(Object.fromEntries(formData));if(!parsed.success)return{error:parsed.error.issues[0]?.message??"Check the password."};const tokenHash=createHash("sha256").update(parsed.data.token).digest("hex");const invitation=await prisma.userInvitation.findUnique({where:{tokenHash},include:{user:true}});if(!invitation||invitation.acceptedAt||invitation.expiresAt<new Date())return{error:"This invitation is invalid or has expired."};await prisma.$transaction([prisma.user.update({where:{id:invitation.userId},data:{passwordHash:await hash(parsed.data.password,12),status:"ACTIVE"}}),prisma.userInvitation.update({where:{id:invitation.id},data:{acceptedAt:new Date()}}),prisma.auditLog.create({data:{workspaceId:invitation.workspaceId,userId:invitation.userId,action:"user.invitation.accepted",recordType:"User",recordId:invitation.userId,source:"MANUAL"}})]);return{ok:"Your account is active. You can now sign in."};}

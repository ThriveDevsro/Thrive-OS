"use server";
import { revalidatePath } from "next/cache";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
export async function toggleAutomation(formData:FormData){const session=await auth();if(session?.user.role!=="founder")return;const workspace=await prisma.workspace.findUnique({where:{slug:"thrive-dev"}});const id=String(formData.get("id"));const automation=await prisma.automation.findFirst({where:{id,workspaceId:workspace?.id}});if(!automation)return;await prisma.automation.update({where:{id},data:{active:!automation.active}});revalidatePath("/automations")}

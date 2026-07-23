import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";

export async function requireFounder(){const session=await auth();if(!session?.user)redirect("/login");if(session.user.role!=="founder")redirect("/dashboard");return session;}
export async function getAccessContext(){const session=await auth();if(!session?.user)redirect("/login");const workspace=await prisma.workspace.findUnique({where:{slug:"thrive-dev"}});const user=await prisma.user.findFirst({where:{workspaceId:workspace?.id,email:session.user.email??undefined}});if(!workspace||!user)redirect("/login");return{session,workspace,user,founder:session.user.role==="founder"};}

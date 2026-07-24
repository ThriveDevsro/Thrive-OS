import { prisma } from "@/lib/prisma";
import { Dashboard } from "@/components/dashboard";
import { getAccessContext } from "@/lib/role-access";
import { measureServerOperation } from "@/lib/performance";

export default async function DashboardPage(){
  const {session,workspace,user,founder}=await getAccessContext();
  const now=new Date();const todayEnd=new Date(now);todayEnd.setHours(23,59,59,999);
  const leadWhere={workspaceId:workspace.id,...(!founder?{assigneeId:user.id}:{})};
  const opportunityWhere={workspaceId:workspace.id,...(!founder?{ownerId:user.id}:{})};
  const taskWhere={workspaceId:workspace.id,status:{in:["OPEN","IN_PROGRESS"] as ("OPEN"|"IN_PROGRESS")[]},...(!founder?{assigneeId:user.id}:{})};
  const [leads,opportunities,tasks,meetings,activities,companyCount,openInbox]=await measureServerOperation("route:dashboard:data",()=>Promise.all([
    prisma.lead.findMany({where:leadWhere,include:{company:true,assignee:true},orderBy:{createdAt:"desc"},take:100}),
    prisma.opportunity.findMany({where:opportunityWhere,include:{stage:true,company:true},orderBy:{updatedAt:"desc"},take:100}),
    prisma.task.findMany({where:taskWhere,include:{company:true,assignee:true},orderBy:{dueAt:"asc"},take:100}),
    prisma.meeting.findMany({where:{workspaceId:workspace.id,startsAt:{gte:now},...(!founder?{OR:[{createdById:user.id},{visibility:{in:["TEAM","WORKSPACE"]}}]}:{})},include:{company:true},orderBy:{startsAt:"asc"},take:5}),
    prisma.activity.findMany({where:{workspaceId:workspace.id,...(!founder?{actorId:user.id}:{})},include:{company:true},orderBy:{occurredAt:"desc"},take:6}),
    prisma.company.count({where:{workspaceId:workspace.id,deletedAt:null,...(!founder?{ownerId:user.id}:{})}}),
    prisma.emailThread.count({where:{workspaceId:workspace.id,status:"OPEN"}}),
  ]));
  const openDeals=opportunities.filter(item=>!item.stage.terminal);
  const pipelineValue=openDeals.reduce((sum,item)=>sum+Number(item.valueMinor)/100,0);
  const weightedValue=openDeals.reduce((sum,item)=>sum+(Number(item.valueMinor)/100)*(item.probability/100),0);
  const attentionLeads=leads.filter(item=>["NEW","REVIEW","ASSIGNED"].includes(item.status));
  const overdue=tasks.filter(item=>item.dueAt<now);
  const dueToday=tasks.filter(item=>item.dueAt>=now&&item.dueAt<=todayEnd);
  const pipeline=[...Map.groupBy(openDeals,item=>item.stage.name).entries()].map(([stage,items])=>({stage,count:items.length,value:items.reduce((sum,item)=>sum+Number(item.valueMinor)/100,0)})).sort((a,b)=>b.value-a.value).slice(0,6);
  return <Dashboard firstName={session?.user?.name?.split(" ")[0]??"there"} role={founder?"founder":"salesperson"} metrics={{companyCount,attentionLeads:attentionLeads.length,pipelineValue,weightedValue,openDeals:openDeals.length,overdue:overdue.length,dueToday:dueToday.length,openInbox}} pipeline={pipeline} leads={attentionLeads.slice(0,5).map(item=>({id:item.id,title:item.title,status:item.status,company:item.company?.name??item.country??"Unlinked lead",owner:item.assignee?.name??"Unassigned"}))} tasks={tasks.slice(0,6).map(item=>({id:item.id,title:item.title,company:item.company?.name??"Internal",dueAt:item.dueAt,priority:item.priority,owner:item.assignee.name}))} meetings={meetings.map(item=>({id:item.id,title:item.title,startsAt:item.startsAt,company:item.company?.name??"Internal"}))} activities={activities.map(item=>({id:item.id,title:item.title,company:item.company?.name??"Workspace",occurredAt:item.occurredAt}))}/>;
}

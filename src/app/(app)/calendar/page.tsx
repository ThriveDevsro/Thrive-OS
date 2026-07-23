import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, MapPin, UsersRound, Video } from "lucide-react";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { CalendarModal, OpenCalendarModal } from "./calendar-modal";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const color: Record<string,string> = { MEETING:"blue", TASK:"violet", DEADLINE:"red", REMINDER:"amber", TIME_OFF:"green" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ created?:string; month?:string; view?:string; date?:string }> }) {
  const { created, month, view, date } = await searchParams;
  const weekView = view === "week";
  const session = await auth();
  const workspace = await prisma.workspace.findUnique({ where: { slug: "thrive-dev" } });
  const user = await prisma.user.findFirst({ where: { workspaceId: workspace?.id, email: session?.user?.email ?? undefined } });
  const parsed = month?.match(/^(\d{4})-(\d{2})$/);
  const today = new Date();
  const year = parsed ? Number(parsed[1]) : today.getFullYear();
  const monthIndex = parsed ? Number(parsed[2])-1 : today.getMonth();
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex+1, 1);
  const gridStart = new Date(start); gridStart.setDate(start.getDate()-((start.getDay()+6)%7));
  const gridEnd = new Date(end); gridEnd.setDate(end.getDate()+(7-((end.getDay()+6)%7))%7);
  const selectedDate = date?.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(`${date}T12:00:00`) : today;
  const weekStart = new Date(selectedDate); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+7);
  const rangeStart = weekView ? weekStart : gridStart;
  const rangeEnd = weekView ? weekEnd : gridEnd;
  const [companies, meetings] = await Promise.all([
    prisma.company.findMany({ where: { workspaceId: workspace?.id, deletedAt:null }, select:{id:true,name:true}, orderBy:{name:"asc"} }),
    prisma.meeting.findMany({ where:{workspaceId:workspace?.id,startsAt:{gte:rangeStart,lt:rangeEnd},OR:[{visibility:{in:["TEAM","WORKSPACE"]}},{createdById:user?.id}]}, include:{company:true,createdBy:{select:{name:true}}}, orderBy:{startsAt:"asc"} }),
  ]);
  const days: Date[]=[]; for(let day=new Date(gridStart);day<gridEnd;day.setDate(day.getDate()+1)) days.push(new Date(day));
  const previous = new Date(year,monthIndex-1,1); const next = new Date(year,monthIndex+1,1);
  const previousWeek = new Date(weekStart); previousWeek.setDate(previousWeek.getDate()-7);
  const nextWeek = new Date(weekStart); nextWeek.setDate(nextWeek.getDate()+7);
  const key=(date:Date)=>`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const byDay=Map.groupBy(meetings,event=>key(event.startsAt));
  const upcoming=meetings.filter(event=>event.endsAt>=today).slice(0,8);

  return <>
    <div className="list-heading calendar-heading"><div><p className="eyebrow">PLANNING · COMPANY CALENDAR</p><h1>Calendar</h1><p>Shared meetings, internal events, deadlines and private reminders</p></div><OpenCalendarModal/></div>
    <nav className="calendar-view-switch" aria-label="Calendar view">
      <Link className={!weekView?"active":""} href={`/calendar?month=${year}-${String(monthIndex+1).padStart(2,"0")}`}>Month</Link>
      <Link className={weekView?"active":""} href={`/calendar?view=week&date=${localDate(selectedDate)}`}>Week</Link>
    </nav>
    {created&&<div className="calendar-success"><CheckCircle2 size={16}/><span>Event created. You can now add it to your phone or desktop calendar.</span></div>}
    <div className="calendar-shell">
      <section className={weekView ? "week-calendar" : "month-calendar"}>
        <header className="month-toolbar"><div><CalendarDays size={18}/><h2>{weekView ? weekRangeLabel(weekStart, weekEnd) : start.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</h2></div><nav><Link href={weekView?`/calendar?view=week&date=${localDate(previousWeek)}`:`/calendar?month=${previous.getFullYear()}-${String(previous.getMonth()+1).padStart(2,"0")}`} aria-label={weekView?"Previous week":"Previous month"}><ChevronLeft/></Link><Link className="today-link" href={weekView?`/calendar?view=week&date=${localDate(today)}`:"/calendar"}>Today</Link><Link href={weekView?`/calendar?view=week&date=${localDate(nextWeek)}`:`/calendar?month=${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}`} aria-label={weekView?"Next week":"Next month"}><ChevronRight/></Link></nav></header>
        {weekView ? <div className="week-grid">{Array.from({length:7},(_,index)=>{const day=new Date(weekStart);day.setDate(day.getDate()+index);const events=byDay.get(key(day))??[];const dayDate=localDate(day);const isToday=key(day)===key(today);return <article className={isToday?"today":""} key={dayDate}><header><span>{day.toLocaleDateString("en-GB",{weekday:"short"})}</span><time>{day.getDate()}</time><OpenCalendarModal date={dayDate} compact/></header><div>{events.length?events.map(event=><a className={`week-event ${color[event.eventType]??"blue"}`} href={`#event-${event.id}`} key={event.id}><time>{event.allDay?"All day":event.startsAt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</time><strong>{event.title}</strong><small>{event.company?.name??(event.visibility==="PRIVATE"?"Private":"Internal")}</small></a>):<div className="week-empty-add"><OpenCalendarModal date={dayDate} compact/><span>No events</span></div>}</div></article>})}</div> : <>
        <div className="weekday-row">{weekDays.map(day=><span key={day}>{day}</span>)}</div>
        <div className="month-grid">{days.map(day=>{const events=byDay.get(key(day))??[];const current=day.getMonth()===monthIndex;const isToday=key(day)===key(today);const date=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;return <article className={`${current?"":"outside"} ${isToday?"today":""}`} key={key(day)}><time>{day.getDate()}</time><OpenCalendarModal date={date} compact/><div>{events.slice(0,4).map(event=><a className={`calendar-event ${color[event.eventType]??"blue"}`} href={`#event-${event.id}`} key={event.id}><b>{event.allDay?"All day":event.startsAt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</b><span>{event.title}</span>{event.visibility==="PRIVATE"&&<i>Private</i>}</a>)}{events.length>4&&<small>+{events.length-4} more</small>}</div></article>})}</div>
        </>}
      </section>
      <aside className="calendar-side"><section className="calendar-upcoming"><header><h2>Upcoming</h2><span>{upcoming.length}</span></header>{upcoming.length?upcoming.map(event=><article id={`event-${event.id}`} key={event.id}><i className={color[event.eventType]??"blue"}/><div><strong>{event.title}</strong><p>{event.startsAt.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} · {event.allDay?"All day":event.startsAt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</p><small><UsersRound size={11}/>{event.visibility==="WORKSPACE"?"Entire company":event.visibility==="TEAM"?"Internal team":"Only me"}{event.location&&<><MapPin size={11}/>{event.location}</>}</small><div className="event-actions">{event.meetingUrl&&<a href={event.meetingUrl} target="_blank" rel="noreferrer"><Video size={12}/>Join</a>}<a href={`/api/calendar/${event.id}/ics`}><Download size={12}/>Apple / phone / Outlook</a><a target="_blank" rel="noreferrer" href={googleUrl(event)}>Google Calendar</a></div></div></article>):<div className="empty-state"><Clock3/><p>No upcoming events this month.</p></div>}</section></aside>
    </div>
    <CalendarModal companies={companies}/>
  </>;
}

function googleUrl(event:{title:string;startsAt:Date;endsAt:Date;agenda:string|null;location:string|null;meetingUrl:string|null}) {
  const fmt=(date:Date)=>date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const params=new URLSearchParams({action:"TEMPLATE",text:event.title,dates:`${fmt(event.startsAt)}/${fmt(event.endsAt)}`,details:[event.agenda,event.meetingUrl].filter(Boolean).join("\n"),location:event.location??""});
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function localDate(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function weekRangeLabel(start:Date,end:Date){const last=new Date(end);last.setDate(last.getDate()-1);const sameMonth=start.getMonth()===last.getMonth();return sameMonth?`${start.getDate()}–${last.getDate()} ${last.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}`:`${start.toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – ${last.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}`;}

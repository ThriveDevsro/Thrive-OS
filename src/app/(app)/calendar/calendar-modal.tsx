"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { MeetingForm } from "./meeting-form";

const eventName = "thrive:open-calendar-event";
type Company = { id: string; name: string };

export function OpenCalendarModal({ date, compact=false }: { date?: string; compact?: boolean }) {
  return <button type="button" className={compact ? "day-create-trigger" : "primary-link calendar-new-trigger"} aria-label={compact ? `Add event on ${date}` : "Add event"} onClick={() => window.dispatchEvent(new CustomEvent(eventName,{detail:{date}}))}>{compact?<Plus size={13}/>:<><Plus size={15}/>New event</>}</button>;
}

export function CalendarModal({ companies }: { companies: Company[] }) {
  const searchParams = useSearchParams();
  const [date,setDate]=useState<string|null>(() => searchParams.get("new") === "1" ? localDate(new Date()) : null);
  useEffect(()=>{const open=(event:Event)=>{const selected=(event as CustomEvent<{date?:string}>).detail?.date;setDate(selected??localDate(new Date()));};window.addEventListener(eventName,open);return()=>window.removeEventListener(eventName,open);},[]);
  if(!date)return null;
  const start=`${date}T09:00`; const end=`${date}T10:00`;
  return <div className="calendar-modal" role="dialog" aria-modal="true" aria-label="Add calendar event"><button type="button" className="calendar-modal-scrim" onClick={()=>setDate(null)} aria-label="Close"/><section><header><div><h2>New event</h2><p>{new Date(`${date}T12:00`).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p></div><button type="button" onClick={()=>setDate(null)} aria-label="Close"><X size={19}/></button></header><MeetingForm key={date} companies={companies} defaultStart={start} defaultEnd={end} onCancel={()=>setDate(null)}/></section></div>;
}

function localDate(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}

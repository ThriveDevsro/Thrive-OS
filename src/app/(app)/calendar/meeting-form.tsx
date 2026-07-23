"use client";

import { useActionState } from "react";
import { CalendarPlus, ChevronDown, LoaderCircle } from "lucide-react";
import { createMeeting } from "./actions";

export function MeetingForm({ companies, defaultStart, defaultEnd, onCancel }: { companies: { id: string; name: string }[]; defaultStart?: string; defaultEnd?: string; onCancel?: () => void }) {
  const [state, action, pending] = useActionState(createMeeting, {});
  const error = (name: string) => state.errors?.[name]?.[0];

  return <form action={action} className="meeting-form apple-event-form">
    <label className="event-title-field"><input name="title" required autoFocus placeholder="Event title"/>{error("title")&&<small>{error("title")}</small>}</label>

    <div className="event-form-row date-row"><span>Starts</span><input name="startsAt" type="datetime-local" defaultValue={defaultStart} required/></div>
    <div className="event-form-row date-row"><span>Ends</span><input name="endsAt" type="datetime-local" defaultValue={defaultEnd} required/>{error("endsAt")&&<small>{error("endsAt")}</small>}</div>

    <div className="event-form-row visibility-row"><span>Visible to</span><select name="visibility" defaultValue="WORKSPACE"><option value="WORKSPACE">Entire company</option><option value="TEAM">Internal team</option><option value="PRIVATE">Only me</option></select></div>

    <details className="event-advanced">
      <summary>More options <ChevronDown size={14}/></summary>
      <div className="event-advanced-fields">
        <div className="event-form-row"><span>Type</span><select name="eventType" defaultValue="MEETING"><option value="MEETING">Meeting</option><option value="TASK">Task</option><option value="DEADLINE">Deadline</option><option value="REMINDER">Reminder</option><option value="TIME_OFF">Time off</option></select></div>
        <label className="event-switch"><span>All-day event</span><input name="allDay" type="checkbox"/></label>
        <div className="event-form-row"><span>Company</span><select name="companyId"><option value="">None — internal event</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="event-form-row"><span>Location</span><input name="location" placeholder="Add location"/></div>
        <div className="event-form-row"><span>Video call</span><input name="meetingUrl" type="url" placeholder="Paste meeting link"/>{error("meetingUrl")&&<small>{error("meetingUrl")}</small>}</div>
        <label className="event-notes"><span>Notes</span><textarea name="agenda" rows={3} placeholder="Add notes or preparation details"/></label>
      </div>
    </details>

    {state.message&&<p className="form-message">{state.message}</p>}
    <div className="event-form-buttons">{onCancel&&<button type="button" className="event-cancel" onClick={onCancel}>Cancel</button>}<button className="event-save" disabled={pending}>{pending?<LoaderCircle className="spin" size={16}/>:<><CalendarPlus size={16}/>Add event</>}</button></div>
  </form>;
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { acceptInvitation, type AcceptInviteState } from "./actions";

export function InviteForm({token}:{token:string}){const[state,action,pending]=useActionState<AcceptInviteState,FormData>(acceptInvitation,{});if(state.ok)return <div className="invite-complete"><CheckCircle2/><h2>Account activated</h2><p>{state.ok}</p><Link href="/login">Sign in</Link></div>;return <form action={action} className="invite-form"><input type="hidden" name="token" value={token}/><label><span>Create password</span><input name="password" type="password" minLength={8} required autoComplete="new-password"/></label><label><span>Confirm password</span><input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password"/></label>{state.error&&<p>{state.error}</p>}<button disabled={pending}>{pending?<LoaderCircle className="spin"/>:"Activate account"}</button></form>}

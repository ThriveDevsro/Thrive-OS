"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="login-form">
      <label><span>Work email</span><div className="input-wrap"><Mail size={17} /><input name="email" type="email" autoComplete="email" placeholder="you@thrivedev.sk" required /></div></label>
      <label><span>Password</span><div className="input-wrap"><LockKeyhole size={17} /><input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" minLength={8} required /></div></label>
      {state.error && <div className="login-error-block"><p className="form-error" role="alert">{state.error}</p><Link href="/forgot-password">Forgot password?</Link></div>}
      <button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spin" size={18} /> : <>Sign in <ArrowRight size={17} /></>}</button>
    </form>
  );
}

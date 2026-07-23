import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "../../../auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await auth()) redirect("/dashboard");
  return <main className="login-page"><section className="login-panel"><div className="login-logo symbol-login-logo"><Image src="/logo.png" alt="Thrive Dev" width={1563} height={2048} priority /></div><h1>Welcome to Thrive OS</h1><p className="login-copy">Sign in to continue to your workspace.</p><LoginForm /></section><aside className="login-aside" aria-hidden="true"><div className="aside-glow" /><Image className="login-visual-mark" src="/logo.png" alt="" width={1563} height={2048} priority /></aside></main>;
}

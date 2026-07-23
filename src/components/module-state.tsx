import { ArrowLeft, Construction, ShieldCheck } from "lucide-react";
import Link from "next/link";
export function ModuleState({ title }: { title: string }) {
  return (
    <div className="module-state">
      <span className="module-icon">
        <Construction size={27} />
      </span>
      <p className="eyebrow">PLANNED MODULE</p>
      <h1>{title}</h1>
      <p>
        This area is intentionally gated until its implementation phase. The
        shared navigation, permissions, audit model, data contracts and
        responsive states are ready.
      </p>
      <div className="phase-note">
        <ShieldCheck size={18} />
        <span>No placeholder records or unsafe actions are exposed.</span>
      </div>
      <Link href="/dashboard">
        <ArrowLeft size={16} /> Return to dashboard
      </Link>
    </div>
  );
}

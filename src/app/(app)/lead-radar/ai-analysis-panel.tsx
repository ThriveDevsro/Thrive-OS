"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import type { PublicAnalysis } from "@/lib/ai/lead-analysis/service";

type ApiResponse = {
  success: boolean;
  analysis?: PublicAnalysis;
  error?: { code: string; message: string };
};

export function AiAnalysisPanel({
  leadId,
  enabled,
  canForceRerun,
  initialAnalysis,
}: {
  leadId: string;
  enabled: boolean;
  canForceRerun: boolean;
  initialAnalysis: PublicAnalysis | null;
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(Boolean(initialAnalysis));

  async function analyze(force = false) {
    setPending(true);
    setError(null);
    setOpen(true);
    try {
      const response = await fetch(`/api/ai/leads/${leadId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(force ? { force: true } : {}),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.analysis) {
        setError(
          result.error?.message ?? "AI analysis could not be completed.",
        );
        return;
      }
      setAnalysis(result.analysis);
    } catch {
      setError("AI analysis is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  async function setDecision(action: "approve" | "ignore") {
    if (!analysis) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/leads/${leadId}/analysis-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id, action }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.analysis) {
        setError(result.error?.message ?? "The analysis could not be updated.");
        return;
      }
      setAnalysis(result.analysis);
    } catch {
      setError("The analysis could not be updated.");
    } finally {
      setPending(false);
    }
  }

  if (!enabled) {
    return (
      <section className="lead-ai-panel disabled">
        <BrainCircuit size={16} />
        <div>
          <strong>AI Analysis</strong>
          <small>AI is disabled for this workspace.</small>
        </div>
      </section>
    );
  }

  return (
    <section className={`lead-ai-panel ${open ? "open" : ""}`}>
      <header>
        <button type="button" onClick={() => setOpen((value) => !value)}>
          <BrainCircuit size={16} />
          <span>
            <strong>AI Analysis</strong>
            <small>{statusText(analysis, pending, error)}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        {!analysis && !pending && (
          <button
            type="button"
            className="ai-analyze-button"
            onClick={() => analyze()}
          >
            <Sparkles size={14} /> Analyze lead
          </button>
        )}
      </header>
      {open && (
        <div className="lead-ai-content">
          {pending ? (
            <div className="ai-loading">
              <LoaderCircle className="spin" />
              <strong>Analyzing lead securely…</strong>
              <small>No CRM changes will be made automatically.</small>
            </div>
          ) : error ? (
            <div className="ai-error">
              <AlertTriangle />
              <div>
                <strong>Analysis failed</strong>
                <p>{error}</p>
              </div>
              <button type="button" onClick={() => analyze()}>
                Try again
              </button>
            </div>
          ) : analysis ? (
            <>
              {analysis.status === "FAILED" ? (
                <div className="ai-error">
                  <AlertTriangle />
                  <div>
                    <strong>Analysis failed</strong>
                    <p>{friendlyError(analysis.errorCode)}</p>
                  </div>
                  <button type="button" onClick={() => analyze()}>
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <div className="ai-analysis-top">
                    <div>
                      <span>Summary</span>
                      <p>{analysis.summary}</p>
                    </div>
                  </div>
                  <div className="ai-analysis-grid">
                    <Info label="Priority" value={analysis.priority} />
                    <Info label="Category" value={analysis.category} />
                    <Info label="Detected budget" value={budget(analysis)} />
                  </div>
                  <div className="ai-next-action">
                    <span>Suggested next action</span>
                    <p>{analysis.suggestedNextAction}</p>
                  </div>
                  <TagGroup
                    label="Technologies"
                    values={analysis.technologies}
                  />
                  <TagGroup
                    label="Risk flags"
                    values={analysis.riskFlags}
                    danger
                  />
                  <TagGroup
                    label="Missing information"
                    values={analysis.missingFields}
                  />
                  <footer>
                    <small>
                      {analysis.provider} · {analysis.model} ·{" "}
                      {analysis.durationMs
                        ? `${analysis.durationMs} ms`
                        : "saved result"}
                    </small>
                    <div>
                      <button
                        type="button"
                        onClick={() => setDecision("ignore")}
                        disabled={analysis.status === "IGNORED"}
                      >
                        <X size={13} /> Ignore
                      </button>
                      {canForceRerun && (
                        <button type="button" onClick={() => analyze(true)}>
                          <RefreshCw size={13} /> Re-run
                        </button>
                      )}
                      <button
                        type="button"
                        className="approve"
                        onClick={() => setDecision("approve")}
                        disabled={analysis.status === "APPROVED"}
                      >
                        <Check size={13} />
                        {analysis.status === "APPROVED"
                          ? "Suggestion accepted"
                          : "Accept suggestion"}
                      </button>
                    </div>
                  </footer>
                  {analysis.status === "APPROVED" && (
                    <p className="ai-safety-note">
                      Suggestion approved for review. No CRM field, email, deal
                      or pipeline stage was changed.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="ai-empty">
              <BrainCircuit />
              <strong>Not analyzed</strong>
              <p>
                Gemini receives only redacted, explicitly allowed lead fields.
              </p>
              <button type="button" onClick={() => analyze()}>
                <Sparkles size={14} /> Analyze lead
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function TagGroup({
  label,
  values,
  danger = false,
}: {
  label: string;
  values: string[];
  danger?: boolean;
}) {
  if (!values.length) return null;
  return (
    <div className={`ai-tags ${danger ? "danger" : ""}`}>
      <span>{label}</span>
      <div>
        {values.map((value) => (
          <i key={value}>{value}</i>
        ))}
      </div>
    </div>
  );
}

function statusText(
  analysis: PublicAnalysis | null,
  pending: boolean,
  error: string | null,
) {
  if (pending) return "Processing";
  if (error) return "Failed";
  if (!analysis) return "Not analyzed";
  return analysis.status.toLowerCase();
}

function budget(analysis: PublicAnalysis) {
  const { min, max, currency } = analysis.detectedBudget;
  if (min === null && max === null) return null;
  const range =
    min !== null && max !== null
      ? `${min.toLocaleString()} – ${max.toLocaleString()}`
      : (min ?? max)?.toLocaleString();
  return `${currency ?? ""} ${range}`.trim();
}

function friendlyError(code: string | null) {
  if (code === "AI_RATE_LIMITED") return "The daily AI limit was reached.";
  if (code === "AI_PROVIDER_TIMEOUT") return "The provider timed out.";
  if (code === "AI_INVALID_OUTPUT")
    return "The provider returned an invalid response.";
  return "The AI provider is temporarily unavailable.";
}

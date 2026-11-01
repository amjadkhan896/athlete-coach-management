"use server";

import { attempt, field, type ActionState } from "@/lib/actions";
import { send } from "@/lib/api";

/** "sprint_20m_s=3.4, passing_pct=82" → { sprint_20m_s: 3.4, passing_pct: 82 } */
function parseMetrics(raw: string | undefined): Record<string, number | string> | undefined {
  if (!raw) return undefined;
  const metrics: Record<string, number | string> = {};
  for (const pair of raw.split(/[,\n]/)) {
    const [key, ...rest] = pair.split("=");
    const value = rest.join("=").trim();
    if (!key?.trim() || !value) continue;
    metrics[key.trim().replace(/\s+/g, "_")] = Number.isFinite(Number(value)) ? Number(value) : value;
  }
  return metrics;
}

export async function recordAssessment(athleteId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const score = field(form, "overallScore");
  return attempt(
    () =>
      send("POST", "/assessments", {
        athleteId,
        assessedOn: field(form, "assessedOn"),
        category: field(form, "category"),
        overallScore: score === undefined ? undefined : Number(score),
        metrics: parseMetrics(field(form, "metrics")),
        notes: field(form, "notes"),
        sessionId: field(form, "sessionId"),
        supersedesId: field(form, "supersedesId"),
      }),
    field(form, "supersedesId") ? "Correction saved" : "Assessment saved",
    [`/athletes/${athleteId}`, "/assessments"],
  );
}

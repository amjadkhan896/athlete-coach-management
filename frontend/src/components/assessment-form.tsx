import Link from "next/link";
import { recordAssessment } from "@/app/assessments/actions";
import { formatDate, today } from "@/lib/format";
import type { Assessment } from "@/lib/types";
import { ActionForm, Fields } from "./action-form";
import { Badge, Disclosure, Empty, Input, Textarea } from "./ui";

const metricsText = (m: Record<string, number | string>, sep = ", ") =>
  Object.entries(m)
    .map(([k, v]) => `${k}=${v}`)
    .join(sep);

/** Records an assessment, or a correction of `previous` (saved as a new record). */
export function AssessmentForm({ athleteId, previous }: { athleteId: string; previous?: Assessment }) {
  return (
    <ActionForm action={recordAssessment.bind(null, athleteId)} submitLabel={previous ? "Save correction" : "Save assessment"}>
      {previous && <input type="hidden" name="supersedesId" value={previous.id} />}
      <Fields cols={3}>
        <Input label="Date" name="assessedOn" type="date" required defaultValue={previous?.assessedOn ?? today()} />
        <Input label="Category" name="category" required placeholder="technical, fitness…" defaultValue={previous?.category} />
        <Input label="Overall score (0–10)" name="overallScore" type="number" min={0} max={10} step={0.1} defaultValue={previous?.overallScore ?? undefined} />
      </Fields>
      <Input
        label="Metrics (name=value, comma-separated)"
        name="metrics"
        placeholder="sprint_20m_s=3.4, passing_pct=82"
        defaultValue={previous ? metricsText(previous.metrics) : undefined}
      />
      <Textarea label="Notes" name="notes" defaultValue={previous?.notes ?? undefined} />
    </ActionForm>
  );
}

export function AssessmentList({ items, canCorrect, athleteId }: { items: Assessment[]; canCorrect: boolean; athleteId?: string }) {
  const corrected = new Set(items.map((a) => a.supersedesId).filter(Boolean));
  if (items.length === 0) return <Empty>No assessments yet.</Empty>;
  return (
    <ul className="-my-3 divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((a) => {
        const isCorrected = corrected.has(a.id);
        return (
          <li key={a.id} className={`py-3 ${isCorrected ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium capitalize">
                <Link href={`/assessments/${a.id}`} className="hover:text-brand-600">
                  {a.category}
                </Link>
                {isCorrected && <Badge value="corrected" tone="gray" />}
                {a.supersedesId && <Badge value="correction" tone="amber" />}
              </span>
              <span className="text-sm text-slate-500 tabular-nums">
                {formatDate(a.assessedOn)}
                {a.overallScore !== null && <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">{a.overallScore}/10</span>}
              </span>
            </div>
            {Object.keys(a.metrics).length > 0 && <p className="mt-1 text-xs text-slate-500">{metricsText(a.metrics, " · ")}</p>}
            {a.notes && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{a.notes}</p>}
            {canCorrect && !isCorrected && athleteId && (
              <div className="mt-2">
                <Disclosure label="Correct this assessment">
                  <AssessmentForm athleteId={athleteId} previous={a} />
                </Disclosure>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { Badge, Card, Empty, FilterBar, PageHeader, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

interface AuditEntry {
  id: string;
  entity: string;
  entityId: string;
  action: "insert" | "update";
  changedAt: string;
  changedByName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
}

const ENTITIES: Record<string, string> = {
  athletes: "Athletes",
  coaches: "Coaches",
  teams: "Teams",
  athlete_team_assignments: "Athlete assignments",
  coach_team_assignments: "Coach assignments",
  training_sessions: "Sessions",
  attendance_records: "Attendance",
  performance_assessments: "Assessments",
  academy_memberships: "User access",
};

const HIDDEN = new Set(["id", "academy_id", "created_at", "updated_at", "version"]);
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Fields that changed (updates) or were set (creations), excluding bookkeeping columns. */
function changes(e: AuditEntry) {
  return Object.keys(e.after)
    .filter((k) => !HIDDEN.has(k))
    .filter((k) => (e.before ? JSON.stringify(e.before[k]) !== JSON.stringify(e.after[k]) : e.after[k] !== null))
    .map((k) => ({ key: k.replaceAll("_", " "), from: e.before ? show(e.before[k]) : null, to: show(e.after[k]) }));
}

async function AuditList({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const { entity = "" } = await searchParams;
  const entries = await api<AuditEntry[]>(`/audit?limit=100${entity ? `&entity=${entity}` : ""}`);

  return (
    <Card>
      <FilterBar>
        <Select label="Area" name="entity" defaultValue={entity} placeholder="Everything" options={Object.entries(ENTITIES).map(([value, label]) => ({ value, label }))} />
      </FilterBar>
      {entries.length === 0 ? (
        <Empty>No changes recorded.</Empty>
      ) : (
        <ol className="relative ml-2 border-l border-slate-200 dark:border-slate-800">
          {entries.map((e) => (
            <li key={e.id} className="mb-5 ml-5">
              <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-white bg-brand-500 dark:border-slate-900" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge value={e.action} />
                <span className="font-medium">{ENTITIES[e.entity] ?? e.entity}</span>
                <span className="text-slate-500">by {e.changedByName ?? "system"}</span>
                <span className="text-xs text-slate-400">{formatDateTime(e.changedAt)}</span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                {changes(e)
                  .slice(0, 6)
                  .map((c) => (
                    <li key={c.key}>
                      <span className="capitalize">{c.key}</span>:{" "}
                      {c.from !== null && <span className="text-slate-400 line-through">{c.from}</span>} <span className="font-medium text-slate-700 dark:text-slate-300">{c.to}</span>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default function AuditPage(props: PageProps<"/audit">) {
  return (
    <Shell>
      <PageHeader title="Audit log" subtitle="Every change to academy data: who made it, when, and what changed. Entries are written by the database and can’t be edited." />
      <Suspense fallback={<Skeleton rows={8} />}>
        <AuditList searchParams={props.searchParams as Promise<{ entity?: string }>} />
      </Suspense>
    </Shell>
  );
}

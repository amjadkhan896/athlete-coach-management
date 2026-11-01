import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { getMe, isAdmin } from "@/lib/session";
import { Badge, Card, Empty } from "./ui";

interface AuditEntry {
  id: string;
  action: "insert" | "update";
  changedAt: string;
  changedByName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
}

const HIDDEN = new Set(["id", "academy_id", "created_at", "updated_at", "version", "user_id"]);
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

export function describeChanges(e: Pick<AuditEntry, "before" | "after">) {
  return Object.keys(e.after)
    .filter((k) => !HIDDEN.has(k))
    .filter((k) => (e.before ? JSON.stringify(e.before[k]) !== JSON.stringify(e.after[k]) : e.after[k] !== null))
    .map((k) => ({ key: k.replaceAll("_", " "), from: e.before ? show(e.before[k]) : null, to: show(e.after[k]) }));
}

/** Audit trail for one record. Rendered for admins only. */
export async function ChangeHistory({ entity, entityId }: { entity: string; entityId: string }) {
  if (!isAdmin(await getMe())) return null;
  const entries = await api<AuditEntry[]>(`/audit?entity=${entity}&entityId=${entityId}&limit=20`);
  return (
    <Card title="Change history" description="Who changed this record, and what changed">
      {entries.length === 0 ? (
        <Empty>No changes recorded since auditing started.</Empty>
      ) : (
        <ul className="-my-2 divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map((e) => (
            <li key={e.id} className="py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={e.action} />
                <span className="text-slate-600 dark:text-slate-400">by {e.changedByName ?? "system"}</span>
                <span className="text-xs text-slate-400">{formatDateTime(e.changedAt)}</span>
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                {describeChanges(e)
                  .slice(0, 6)
                  .map((c) => (
                    <li key={c.key}>
                      <span className="capitalize">{c.key}</span>: {c.from !== null && <span className="line-through">{c.from}</span>}{" "}
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.to}</span>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

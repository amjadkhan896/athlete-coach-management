import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Fields } from "@/components/action-form";
import { ChangeHistory } from "@/components/change-history";
import { Shell } from "@/components/shell";
import { Avatar, Badge, Card, Disclosure, Empty, Input, PageHeader, Skeleton, Textarea, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDateTime, fullName, isoToAcademyLocal } from "@/lib/format";
import { getMe, isAdmin } from "@/lib/session";
import type { AttendanceRecord, AttendanceStatus, Roster, Team, TrainingSession } from "@/lib/types";
import { saveAttendance, setSessionStatus, updateSession } from "../actions";

const STATUSES: { value: AttendanceStatus; label: string; style: string }[] = [
  { value: "present", label: "Present", style: "has-checked:border-emerald-500 has-checked:bg-emerald-50 has-checked:text-emerald-700 dark:has-checked:bg-emerald-950 dark:has-checked:text-emerald-300" },
  { value: "late", label: "Late", style: "has-checked:border-amber-500 has-checked:bg-amber-50 has-checked:text-amber-700 dark:has-checked:bg-amber-950 dark:has-checked:text-amber-300" },
  { value: "absent", label: "Absent", style: "has-checked:border-red-500 has-checked:bg-red-50 has-checked:text-red-700 dark:has-checked:bg-red-950 dark:has-checked:text-red-300" },
  { value: "excused", label: "Excused", style: "has-checked:border-slate-500 has-checked:bg-slate-100 has-checked:text-slate-700 dark:has-checked:bg-slate-800 dark:has-checked:text-slate-200" },
];

async function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await api<TrainingSession>(`/sessions/${id}`);
  const localStart = isoToAcademyLocal(session.startsAt);
  const sessionDate = localStart.slice(0, 10);
  const [me, team, roster, records] = await Promise.all([
    getMe(),
    api<Team>(`/teams/${session.teamId}`),
    api<Roster>(`/teams/${session.teamId}/roster?date=${sessionDate}`),
    api<AttendanceRecord[]>(`/sessions/${id}/attendance`),
  ]);
  const canManage = isAdmin(me) || (me.coachId !== null && roster.coaches.some((c) => c.id === me.coachId));
  const recorded = new Map(records.map((r) => [r.athleteId, r.status]));
  const counts = STATUSES.map((s) => ({ ...s, n: records.filter((r) => r.status === s.value).length }));
  const editable = canManage && session.status !== "cancelled";

  return (
    <>
      <PageHeader
        title={session.title}
        back={{ href: "/sessions", label: "Training sessions" }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/teams/${team.id}`} className={linkStyle}>
              {team.name}
            </Link>
            · {formatDateTime(session.startsAt)} – {isoToAcademyLocal(session.endsAt).slice(11)} · {session.location ?? "No location"} ·
            <Badge value={session.status} />
          </span>
        }
        actions={
          canManage && (
            <>
              {session.status === "scheduled" && (
                <>
                  <ActionForm action={setSessionStatus.bind(null, session.id, session.version, "completed")} submitLabel="Mark completed" variant="secondary" inline />
                  <ActionForm action={setSessionStatus.bind(null, session.id, session.version, "cancelled")} submitLabel="Cancel session" variant="danger" inline />
                </>
              )}
              {session.status !== "scheduled" && (
                <ActionForm action={setSessionStatus.bind(null, session.id, session.version, "scheduled")} submitLabel="Reopen" variant="secondary" inline />
              )}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card
            title="Attendance"
            description={`${records.length} of ${roster.athletes.length} athletes recorded`}
            action={
              <div className="flex flex-wrap gap-1.5">
                {counts.map((c) => (
                  <span key={c.value} className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Badge value={c.value} /> {c.n}
                  </span>
                ))}
              </div>
            }
          >
            {roster.athletes.length === 0 ? (
              <Empty>No athletes were on this team on {sessionDate}.</Empty>
            ) : session.status === "cancelled" ? (
              <Empty>This session was cancelled.</Empty>
            ) : (
              <ActionForm action={saveAttendance.bind(null, session.id)} submitLabel="Save attendance">
                <ul className="-mx-5 divide-y divide-slate-100 dark:divide-slate-800">
                  {roster.athletes.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <Link href={`/athletes/${a.id}`} className={`flex items-center gap-3 ${linkStyle}`}>
                        <Avatar name={fullName(a)} />
                        {fullName(a)}
                      </Link>
                      <div className="flex gap-1.5">
                        {STATUSES.map((s) => (
                          <label
                            key={s.value}
                            className={`cursor-pointer rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400 ${s.style} ${editable ? "" : "pointer-events-none opacity-70"}`}
                          >
                            <input type="radio" name={`status:${a.id}`} value={s.value} defaultChecked={recorded.get(a.id) === s.value} className="sr-only" disabled={!editable} />
                            {s.label}
                          </label>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                {!editable && <p className="text-xs text-slate-500">Only an admin or a coach of this team can record attendance.</p>}
              </ActionForm>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Coaches">
            {roster.coaches.length === 0 ? (
              <Empty>No coaches assigned.</Empty>
            ) : (
              <ul className="space-y-3">
                {roster.coaches.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <Avatar name={fullName(c)} />
                    <Link href={`/coaches/${c.id}`} className={linkStyle}>
                      {fullName(c)}
                    </Link>
                    {c.role && <Badge value={c.role} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {session.notes && (
            <Card title="Notes">
              <p className="text-sm whitespace-pre-line text-slate-600 dark:text-slate-400">{session.notes}</p>
            </Card>
          )}
          {editable && (
            <Disclosure label="Edit session">
              <ActionForm action={updateSession.bind(null, session.id)} submitLabel="Save changes">
                <input type="hidden" name="version" value={session.version} />
                <Input label="Title" name="title" required defaultValue={session.title} />
                <Fields cols={3}>
                  <Input label="Date" name="date" type="date" required defaultValue={sessionDate} />
                  <Input label="Start" name="startTime" type="time" required defaultValue={localStart.slice(11)} />
                  <Input label="End" name="endTime" type="time" required defaultValue={isoToAcademyLocal(session.endsAt).slice(11)} />
                </Fields>
                <Input label="Location" name="location" defaultValue={session.location ?? ""} />
                <Textarea label="Notes" name="notes" defaultValue={session.notes ?? ""} />
              </ActionForm>
            </Disclosure>
          )}
          <ChangeHistory entity="training_sessions" entityId={session.id} />
        </div>
      </div>
    </>
  );
}

export default function SessionPage(props: PageProps<"/sessions/[id]">) {
  return (
    <Shell>
      <Suspense fallback={<Skeleton rows={6} />}>
        <SessionDetail params={props.params} />
      </Suspense>
    </Shell>
  );
}

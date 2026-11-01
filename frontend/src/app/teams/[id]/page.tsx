import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Fields } from "@/components/action-form";
import { RecurringSessionForm, SessionForm } from "@/components/session-form";
import { ChangeHistory } from "@/components/change-history";
import { Shell } from "@/components/shell";
import { Avatar, Badge, Card, Disclosure, Empty, Input, PageHeader, Select, Skeleton, Table, buttonBase, buttonStyles, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, fullName, today } from "@/lib/format";
import { getMe, isAdmin } from "@/lib/session";
import type { Athlete, Coach, Page, Roster, Team, TrainingSession } from "@/lib/types";
import { addAthleteToTeam, addCoachToTeam, endAthleteAssignment, endCoachAssignment, updateTeam } from "../actions";

type Search = { date?: string; tab?: string };

interface Summary {
  from: string;
  to: string;
  sessions: number;
  athletes: { athleteId: string; name: string; present: number; late: number; absent: number; excused: number; attendanceRate: number | null }[];
}

interface HistoryRow {
  id: string;
  kind: "athlete" | "coach";
  personId: string;
  name: string;
  role: "head" | "assistant" | null;
  validFrom: string;
  validTo: string | null;
  reason: string | null;
}

const TABS = [
  { key: "roster", label: "Roster" },
  { key: "sessions", label: "Sessions" },
  { key: "attendance", label: "Attendance report" },
  { key: "history", label: "History" },
];

async function TeamDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const [{ id }, { date, tab = "roster" }] = await Promise.all([params, searchParams]);
  const [me, team, roster] = await Promise.all([getMe(), api<Team>(`/teams/${id}`), api<Roster>(`/teams/${id}/roster${date ? `?date=${date}` : ""}`)]);
  const admin = isAdmin(me);
  const coachesOnTeam = new Set(roster.coaches.map((c) => c.id));
  const canSchedule = admin || (me.coachId !== null && coachesOnTeam.has(me.coachId));

  return (
    <>
      <PageHeader
        title={team.name}
        back={{ href: "/teams", label: "Teams" }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2 capitalize">
            {team.sport} · {team.ageGroup ?? "All ages"} · {team.season ?? "No season"} · <Badge value={team.status} />
          </span>
        }
      />

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/teams/${team.id}?tab=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap ${
              tab === t.key ? "border-brand-600 text-brand-700 dark:text-brand-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "roster" && <RosterTab team={team} roster={roster} admin={admin} date={date} />}
      {tab === "sessions" && <SessionsTab team={team} canSchedule={canSchedule} />}
      {tab === "attendance" && <AttendanceTab teamId={team.id} />}
      {tab === "history" && (
        <div className="flex flex-col gap-6">
          <HistoryTab teamId={team.id} />
          <ChangeHistory entity="teams" entityId={team.id} />
        </div>
      )}
    </>
  );
}

async function RosterTab({ team, roster, admin, date }: { team: Team; roster: Roster; admin: boolean; date?: string }) {
  const isToday = !date || date === today();
  const [athletes, coaches] = admin
    ? await Promise.all([api<Page<Athlete>>("/athletes?status=active&limit=100"), api<Page<Coach>>("/coaches?status=active&limit=100")])
    : [{ items: [] as Athlete[] }, { items: [] as Coach[] }];
  const onRoster = new Set(roster.athletes.map((a) => a.id));
  const coachesOnTeam = new Set(roster.coaches.map((c) => c.id));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="flex flex-col gap-6 xl:col-span-2">
        <Card
          title={`Athletes (${roster.athletes.length})`}
          description={isToday ? "Current roster" : `Roster on ${formatDate(roster.date)}`}
          action={
            <form className="flex items-center gap-2">
              <input type="hidden" name="tab" value="roster" />
              <input type="date" name="date" defaultValue={roster.date} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
              <button className={`${buttonBase} ${buttonStyles.secondary} px-2.5 py-1.5`}>View date</button>
            </form>
          }
        >
          {roster.athletes.length === 0 ? (
            <Empty>No athletes on this team{isToday ? "" : " on that date"}.</Empty>
          ) : (
            <Table head={["Athlete", "Since", ""]}>
              {roster.athletes.map((a) => (
                <tr key={a.assignmentId}>
                  <td>
                    <Link href={`/athletes/${a.id}`} className={`flex items-center gap-3 ${linkStyle}`}>
                      <Avatar name={fullName(a)} />
                      {fullName(a)}
                    </Link>
                  </td>
                  <td className="text-slate-600 tabular-nums dark:text-slate-400">{formatDate(a.validFrom)}</td>
                  <td className="text-right">
                    {admin && isToday && <ActionForm action={endAthleteAssignment.bind(null, a.assignmentId, team.id)} submitLabel="Remove" variant="danger" inline />}
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <p className="mt-4 text-xs text-slate-500">Removing someone ends their assignment today. The history stays on their profile and in the History tab.</p>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card title={`Coaches (${roster.coaches.length})`}>
          {roster.coaches.length === 0 ? (
            <Empty>No coaches assigned.</Empty>
          ) : (
            <ul className="space-y-3">
              {roster.coaches.map((c) => (
                <li key={c.assignmentId} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-3">
                    <Avatar name={fullName(c)} />
                    <span>
                      <Link href={`/coaches/${c.id}`} className={linkStyle}>
                        {fullName(c)}
                      </Link>
                      <span className="block">{c.role && <Badge value={c.role} />}</span>
                    </span>
                  </span>
                  {admin && isToday && <ActionForm action={endCoachAssignment.bind(null, c.assignmentId, team.id)} submitLabel="Remove" variant="danger" inline />}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {admin && (
          <>
            <Disclosure label="Add athlete">
              <ActionForm action={addAthleteToTeam.bind(null, team.id)} submitLabel="Add athlete">
                <Select label="Athlete" name="athleteId" required placeholder="Choose athlete" options={athletes.items.filter((a) => !onRoster.has(a.id)).map((a) => ({ value: a.id, label: fullName(a) }))} />
                <Input label="From" name="validFrom" type="date" defaultValue={today()} />
              </ActionForm>
            </Disclosure>
            <Disclosure label="Assign coach">
              <ActionForm action={addCoachToTeam.bind(null, team.id)} submitLabel="Assign coach">
                <Select label="Coach" name="coachId" required placeholder="Choose coach" options={coaches.items.filter((c) => !coachesOnTeam.has(c.id)).map((c) => ({ value: c.id, label: fullName(c) }))} />
                <Select label="Role" name="role" options={[{ value: "assistant", label: "Assistant" }, { value: "head", label: "Head coach" }]} />
                <Input label="From" name="validFrom" type="date" defaultValue={today()} />
              </ActionForm>
            </Disclosure>
            <Disclosure label="Edit team details">
              <ActionForm action={updateTeam.bind(null, team.id)} submitLabel="Save">
                <input type="hidden" name="version" value={team.version} />
                <Fields cols={1}>
                  <Input label="Name" name="name" required defaultValue={team.name} />
                  <Input label="Sport" name="sport" required defaultValue={team.sport} />
                  <Input label="Age group" name="ageGroup" defaultValue={team.ageGroup ?? ""} />
                  <Input label="Season" name="season" defaultValue={team.season ?? ""} />
                  <Select label="Status" name="status" defaultValue={team.status} options={["active", "archived"].map((s) => ({ value: s, label: s }))} />
                </Fields>
              </ActionForm>
            </Disclosure>
          </>
        )}
      </div>
    </div>
  );
}

async function SessionsTab({ team, canSchedule }: { team: Team; canSchedule: boolean }) {
  const sessions = await api<Page<TrainingSession>>(`/sessions?teamId=${team.id}&limit=50`);
  return (
    <div className="flex flex-col gap-6">
      {canSchedule && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Disclosure label="Schedule a session">
            <SessionForm teams={[team]} />
          </Disclosure>
          <Disclosure label="Schedule a weekly series">
            <RecurringSessionForm teams={[team]} />
          </Disclosure>
        </div>
      )}
      <Card title="All sessions" description={`${sessions.total} sessions`}>
        {sessions.items.length === 0 ? (
          <Empty>No sessions yet.</Empty>
        ) : (
          <Table head={["Session", "When", "Location", "Status"]}>
            {sessions.items.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/sessions/${s.id}`} className={linkStyle}>
                    {s.title}
                  </Link>
                </td>
                <td className="whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDateTime(s.startsAt)}</td>
                <td className="text-slate-600 dark:text-slate-400">{s.location ?? "—"}</td>
                <td>
                  <Badge value={s.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

async function AttendanceTab({ teamId }: { teamId: string }) {
  const summary = await api<Summary>(`/attendance/summary?teamId=${teamId}`);
  return (
    <Card title="Attendance report" description={`${formatDate(summary.from)} – ${formatDate(summary.to)} · ${summary.sessions} sessions`}>
      {summary.athletes.length === 0 ? (
        <Empty>No attendance recorded in the last 30 days.</Empty>
      ) : (
        <Table head={["Athlete", "Present", "Late", "Absent", "Excused", "Rate"]}>
          {summary.athletes.map((a) => (
            <tr key={a.athleteId}>
              <td>
                <Link href={`/athletes/${a.athleteId}`} className={linkStyle}>
                  {a.name}
                </Link>
              </td>
              <td className="tabular-nums">{a.present}</td>
              <td className="tabular-nums">{a.late}</td>
              <td className="tabular-nums">{a.absent}</td>
              <td className="tabular-nums">{a.excused}</td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${a.attendanceRate ?? 0}%` }} />
                  </div>
                  <span className="text-xs font-medium tabular-nums">{a.attendanceRate ?? "—"}%</span>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

async function HistoryTab({ teamId }: { teamId: string }) {
  const history = await api<HistoryRow[]>(`/teams/${teamId}/history`);
  return (
    <Card title="Assignment history" description="Everyone who has ever been on this team">
      {history.length === 0 ? (
        <Empty>No history yet.</Empty>
      ) : (
        <Table head={["Person", "Type", "From", "Until", "Reason"]}>
          {history.map((h) => (
            <tr key={h.id}>
              <td>
                <Link href={`/${h.kind === "coach" ? "coaches" : "athletes"}/${h.personId}`} className={linkStyle}>
                  {h.name}
                </Link>
              </td>
              <td>
                <Badge value={h.kind === "coach" ? (h.role ?? "coach") : "athlete"} tone={h.kind === "coach" ? "violet" : "gray"} />
              </td>
              <td className="text-slate-600 tabular-nums dark:text-slate-400">{formatDate(h.validFrom)}</td>
              <td className="tabular-nums">{h.validTo ? <span className="text-slate-600 dark:text-slate-400">{formatDate(h.validTo)}</span> : <Badge value="current" tone="green" />}</td>
              <td className="text-slate-500">{h.reason ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

export default function TeamPage(props: PageProps<"/teams/[id]">) {
  return (
    <Shell>
      <Suspense fallback={<Skeleton rows={8} />}>
        <TeamDetail params={props.params} searchParams={props.searchParams as Promise<Search>} />
      </Suspense>
    </Shell>
  );
}

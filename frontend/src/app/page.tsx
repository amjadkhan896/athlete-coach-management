import { Activity, CalendarDays, ClipboardCheck, UserCog, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GettingStarted } from "@/components/getting-started";
import { Shell } from "@/components/shell";
import { Badge, Card, Empty, PageHeader, Skeleton, Stat, Table, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { getMe, isAdmin, isStaff } from "@/lib/session";
import type {
  Assessment,
  AttendanceHistoryEntry,
  Athlete,
  Coach,
  CurrentUser,
  Page,
  Team,
  TeamHistoryEntry,
  TrainingSession,
} from "@/lib/types";

interface AuditEntry {
  id: string;
  entity: string;
  entityId: string;
  action: "insert" | "update";
  changedAt: string;
  changedByName: string | null;
}

const ENTITY_LABEL: Record<string, string> = {
  athletes: "Athlete",
  coaches: "Coach",
  teams: "Team",
  training_sessions: "Session",
  attendance_records: "Attendance",
  performance_assessments: "Assessment",
  athlete_team_assignments: "Athlete assignment",
  coach_team_assignments: "Coach assignment",
  academy_memberships: "User access",
};

async function StaffDashboard({ me }: { me: CurrentUser }) {
  await connection(); // "upcoming" depends on the current time
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 864e5);
  const mine = me.role === "coach" ? "&mine=true" : "";
  const [athletes, teams, coaches, upcoming, activity] = await Promise.all([
    api<Page<Athlete>>("/athletes?status=active&limit=1"),
    api<Page<Team>>("/teams?status=active&limit=100"),
    api<Page<Coach>>("/coaches?status=active&limit=1"),
    api<Page<TrainingSession>>(`/sessions?status=scheduled&limit=8&from=${now.toISOString()}&to=${week.toISOString()}${mine}`),
    isAdmin(me) ? api<AuditEntry[]>("/audit?limit=8") : Promise.resolve([]),
  ]);
  const teamName = new Map(teams.items.map((t) => [t.id, t.name]));

  return (
    <div className="flex flex-col gap-6">
      {isAdmin(me) && <GettingStarted />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active athletes" value={athletes.total} icon={<Users className="size-4" />} />
        <Stat label="Active teams" value={teams.total} icon={<UsersRound className="size-4" />} />
        <Stat label="Coaches" value={coaches.total} icon={<UserCog className="size-4" />} />
        <Stat
          label={me.role === "coach" ? "My sessions this week" : "Sessions this week"}
          value={upcoming.total}
          icon={<CalendarDays className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Upcoming sessions" description="Next 7 days" action={<Link href="/sessions" className="text-sm font-medium text-brand-600">View all</Link>}>
            {upcoming.items.length === 0 ? (
              <Empty>Nothing scheduled in the next 7 days.</Empty>
            ) : (
              <Table head={["Session", "Team", "When", "Location"]}>
                {upcoming.items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/sessions/${s.id}`} className={linkStyle}>
                        {s.title}
                      </Link>
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{teamName.get(s.teamId) ?? "—"}</td>
                    <td className="whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDateTime(s.startsAt)}</td>
                    <td className="text-slate-600 dark:text-slate-400">{s.location ?? "—"}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <Card title="Teams" action={<Link href="/teams" className="text-sm font-medium text-brand-600">View all</Link>}>
          {teams.items.length === 0 ? (
            <Empty>No teams yet.</Empty>
          ) : (
            <ul className="-my-2 divide-y divide-slate-100 dark:divide-slate-800">
              {teams.items.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <Link href={`/teams/${t.id}`} className="flex items-center justify-between py-2.5 hover:text-brand-600">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-slate-500 capitalize">{t.sport}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {isAdmin(me) && (
        <Card title="Recent activity" action={<Link href="/audit" className="text-sm font-medium text-brand-600">Audit log</Link>}>
          {activity.length === 0 ? (
            <Empty>No changes recorded yet.</Empty>
          ) : (
            <ul className="-my-2 divide-y divide-slate-100 dark:divide-slate-800">
              {activity.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <Activity className="size-4 text-slate-400" />
                    <Badge value={e.action} /> {ENTITY_LABEL[e.entity] ?? e.entity}
                    <span className="text-slate-500">by {e.changedByName ?? "system"}</span>
                  </span>
                  <span className="text-xs text-slate-500">{formatDateTime(e.changedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

async function AthleteDashboard({ me }: { me: CurrentUser }) {
  if (!me.athleteId) return <Empty>Your account is not linked to an athlete profile yet. Ask your academy admin.</Empty>;
  const [teams, attendance, assessments] = await Promise.all([
    api<TeamHistoryEntry[]>(`/athletes/${me.athleteId}/team-history`),
    api<AttendanceHistoryEntry[]>("/attendance"),
    api<Page<Assessment>>("/assessments?limit=5"),
  ]);
  const current = teams.filter((t) => !t.validTo);
  const attended = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const rate = attendance.length ? `${Math.round((attended / attendance.length) * 100)}%` : "—";
  const latest = assessments.items.find((a) => a.overallScore !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="My teams" value={current.length} hint={current.map((t) => t.teamName).join(", ") || "None"} icon={<UsersRound className="size-4" />} />
        <Stat label="Attendance" value={rate} hint={`${attended} of ${attendance.length} sessions`} icon={<CalendarDays className="size-4" />} />
        <Stat label="Latest score" value={latest ? `${latest.overallScore}/10` : "—"} hint={latest ? `${latest.category} · ${formatDate(latest.assessedOn)}` : undefined} icon={<ClipboardCheck className="size-4" />} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Recent attendance">
          {attendance.length === 0 ? (
            <Empty>No attendance recorded yet.</Empty>
          ) : (
            <Table head={["Session", "When", "Status"]}>
              {attendance.slice(0, 8).map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="font-medium">{a.title}</span>
                    <span className="block text-xs text-slate-500">{a.teamName}</span>
                  </td>
                  <td className="whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDateTime(a.startsAt)}</td>
                  <td>
                    <Badge value={a.status} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card title="Recent assessments" action={<Link href="/assessments" className="text-sm font-medium text-brand-600">View all</Link>}>
          {assessments.items.length === 0 ? (
            <Empty>No assessments yet.</Empty>
          ) : (
            <Table head={["Category", "Date", "Score"]}>
              {assessments.items.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium capitalize">{a.category}</td>
                  <td className="text-slate-600 dark:text-slate-400">{formatDate(a.assessedOn)}</td>
                  <td className="tabular-nums">{a.overallScore ?? "—"}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

async function Dashboard() {
  const me = await getMe();
  return (
    <>
      <PageHeader title={`Welcome, ${me.fullName.split(" ")[0]}`} subtitle="Here’s what’s happening at your academy." />
      {isStaff(me) ? <StaffDashboard me={me} /> : <AthleteDashboard me={me} />}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Shell>
      <Suspense fallback={<Skeleton rows={6} />}>
        <Dashboard />
      </Suspense>
    </Shell>
  );
}

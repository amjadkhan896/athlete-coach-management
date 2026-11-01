import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Fields } from "@/components/action-form";
import { AssessmentForm, AssessmentList } from "@/components/assessment-form";
import { ChangeHistory } from "@/components/change-history";
import { Shell } from "@/components/shell";
import { Badge, Card, Disclosure, Empty, Input, PageHeader, Select, Skeleton, Stat, Table, Textarea, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, fullName, today } from "@/lib/format";
import { getMe, isAdmin, isStaff } from "@/lib/session";
import type { Assessment, Athlete, AttendanceHistoryEntry, Page, Team, TeamHistoryEntry } from "@/lib/types";
import { assignToTeam, transferAthlete, updateAthlete } from "../actions";

async function AthleteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  const [athlete, history, attendance, assessments, teams] = await Promise.all([
    api<Athlete>(`/athletes/${id}`),
    api<TeamHistoryEntry[]>(`/athletes/${id}/team-history`),
    api<AttendanceHistoryEntry[]>(`/attendance?athleteId=${id}`),
    api<Page<Assessment>>(`/assessments?athleteId=${id}&includeSuperseded=true&limit=100`),
    isAdmin(me) ? api<Page<Team>>("/teams?status=active&limit=100") : Promise.resolve({ items: [] as Team[] }),
  ]);
  const admin = isAdmin(me);
  const currentTeams = history.filter((h) => !h.validTo);
  const teamOptions = teams.items.map((t) => ({ value: t.id, label: t.name }));
  const attended = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const latest = assessments.items.find((a) => a.overallScore !== null);

  return (
    <>
      <PageHeader
        title={fullName(athlete)}
        back={isStaff(me) ? { href: "/athletes", label: "Athletes" } : undefined}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Born {formatDate(athlete.dateOfBirth)} · <Badge value={athlete.status} />
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Current teams" value={currentTeams.length} hint={currentTeams.map((t) => t.teamName).join(", ") || "None"} />
        <Stat label="Attendance" value={attendance.length ? `${Math.round((attended / attendance.length) * 100)}%` : "—"} hint={`${attended} of ${attendance.length} sessions`} />
        <Stat label="Latest score" value={latest ? `${latest.overallScore}/10` : "—"} hint={latest ? `${latest.category} · ${formatDate(latest.assessedOn)}` : "No scored assessments"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Team history" description="Every team this athlete has been on, with dates">
          {history.length === 0 ? (
            <Empty>Not on any team yet.</Empty>
          ) : (
            <Table head={["Team", "From", "Until", "Reason"]}>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>
                    {isStaff(me) ? (
                      <Link href={`/teams/${h.teamId}`} className={linkStyle}>
                        {h.teamName}
                      </Link>
                    ) : (
                      <span className="font-medium">{h.teamName}</span>
                    )}
                  </td>
                  <td className="text-slate-600 tabular-nums dark:text-slate-400">{formatDate(h.validFrom)}</td>
                  <td className="tabular-nums">{h.validTo ? <span className="text-slate-600 dark:text-slate-400">{formatDate(h.validTo)}</span> : <Badge value="current" tone="green" />}</td>
                  <td className="text-slate-500">{h.reason ?? "—"}</td>
                </tr>
              ))}
            </Table>
          )}
          {admin && (
            <div className="mt-5 flex flex-col gap-3">
              {currentTeams.length > 0 && (
                <Disclosure label="Transfer to another team">
                  <ActionForm action={transferAthlete.bind(null, athlete.id)} submitLabel="Transfer">
                    <Fields>
                      <Select label="From" name="fromTeamId" required options={currentTeams.map((t) => ({ value: t.teamId, label: t.teamName }))} />
                      <Select label="To" name="toTeamId" required placeholder="Choose team" options={teamOptions} />
                      <Input label="Effective date" name="effectiveDate" type="date" defaultValue={today()} />
                      <Input label="Reason" name="reason" placeholder="Promoted, moved…" />
                    </Fields>
                  </ActionForm>
                </Disclosure>
              )}
              <Disclosure label="Add to a team">
                <ActionForm action={assignToTeam.bind(null, athlete.id)} submitLabel="Add to team">
                  <Fields>
                    <Select label="Team" name="teamId" required placeholder="Choose team" options={teamOptions} />
                    <Input label="From" name="validFrom" type="date" defaultValue={today()} />
                  </Fields>
                </ActionForm>
              </Disclosure>
            </div>
          )}
        </Card>

        <Card title="Assessments" description="Corrections are added as new entries; originals are kept">
          <AssessmentList items={assessments.items} canCorrect={isStaff(me)} athleteId={athlete.id} />
          {isStaff(me) && (
            <div className="mt-5">
              <Disclosure label="Record a new assessment">
                <AssessmentForm athleteId={athlete.id} />
              </Disclosure>
            </div>
          )}
        </Card>

        <Card title="Attendance history">
          {attendance.length === 0 ? (
            <Empty>No attendance recorded.</Empty>
          ) : (
            <Table head={["Session", "When", "Status"]}>
              {attendance.map((a) => (
                <tr key={a.id}>
                  <td>
                    {isStaff(me) ? (
                      <Link href={`/sessions/${a.sessionId}`} className={linkStyle}>
                        {a.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{a.title}</span>
                    )}
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

        <Card title="Profile">
          {admin ? (
            <ActionForm action={updateAthlete.bind(null, athlete.id)} submitLabel="Save changes">
              <input type="hidden" name="version" value={athlete.version} />
              <Fields>
                <Input label="First name" name="firstName" required defaultValue={athlete.firstName} />
                <Input label="Last name" name="lastName" required defaultValue={athlete.lastName} />
                <Input label="Date of birth" name="dateOfBirth" type="date" required defaultValue={athlete.dateOfBirth} />
                <Select label="Gender" name="gender" defaultValue={athlete.gender ?? ""} placeholder="—" options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
                <Select label="Status" name="status" defaultValue={athlete.status} options={["active", "inactive", "archived"].map((s) => ({ value: s, label: s }))} />
              </Fields>
              <Textarea label="Notes" name="notes" defaultValue={athlete.notes ?? ""} />
            </ActionForm>
          ) : (
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-slate-500">Gender</dt>
              <dd className="capitalize">{athlete.gender ?? "—"}</dd>
              <dt className="text-slate-500">Notes</dt>
              <dd>{athlete.notes ?? "—"}</dd>
            </dl>
          )}
        </Card>

        <ChangeHistory entity="athletes" entityId={athlete.id} />
      </div>
    </>
  );
}

export default function AthletePage(props: PageProps<"/athletes/[id]">) {
  return (
    <Shell>
      <Suspense fallback={<Skeleton rows={8} />}>
        <AthleteDetail params={props.params} />
      </Suspense>
    </Shell>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { endCoachAssignment } from "@/app/teams/actions";
import { ActionForm, Fields } from "@/components/action-form";
import { ChangeHistory } from "@/components/change-history";
import { Shell } from "@/components/shell";
import { Badge, Card, Disclosure, Empty, Input, PageHeader, Select, Skeleton, Table, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, fullName, today } from "@/lib/format";
import { getMe, isAdmin } from "@/lib/session";
import type { Coach, Page, Team, TeamHistoryEntry } from "@/lib/types";
import { assignCoachToTeam, updateCoach } from "../actions";

async function CoachDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, coach, history, teams] = await Promise.all([
    getMe(),
    api<Coach>(`/coaches/${id}`),
    api<TeamHistoryEntry[]>(`/coaches/${id}/team-history`),
    api<Page<Team>>("/teams?status=active&limit=100"),
  ]);
  const admin = isAdmin(me);

  return (
    <>
      <PageHeader
        title={fullName(coach)}
        back={{ href: "/coaches", label: "Coaches" }}
        subtitle={
          <span className="flex items-center gap-2">
            {coach.specialization ?? "Coach"} · <Badge value={coach.status} />
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Team history" description="Current and past team assignments">
            {history.length === 0 ? (
              <Empty>Not assigned to any team.</Empty>
            ) : (
              <Table head={["Team", "Role", "From", "Until", ""]}>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <Link href={`/teams/${h.teamId}`} className={linkStyle}>
                        {h.teamName}
                      </Link>
                    </td>
                    <td>{h.role && <Badge value={h.role} />}</td>
                    <td className="text-slate-600 tabular-nums dark:text-slate-400">{formatDate(h.validFrom)}</td>
                    <td className="tabular-nums">{h.validTo ? <span className="text-slate-600 dark:text-slate-400">{formatDate(h.validTo)}</span> : <Badge value="current" tone="green" />}</td>
                    <td className="text-right">
                      {admin && !h.validTo && <ActionForm action={endCoachAssignment.bind(null, h.id, h.teamId)} submitLabel="End" variant="danger" inline />}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
            {admin && (
              <div className="mt-5">
                <Disclosure label="Assign to a team">
                  <ActionForm action={assignCoachToTeam.bind(null, coach.id)} submitLabel="Assign">
                    <Fields cols={3}>
                      <Select label="Team" name="teamId" required placeholder="Choose team" options={teams.items.map((t) => ({ value: t.id, label: t.name }))} />
                      <Select label="Role" name="role" options={[{ value: "assistant", label: "Assistant" }, { value: "head", label: "Head coach" }]} />
                      <Input label="From" name="validFrom" type="date" defaultValue={today()} />
                    </Fields>
                  </ActionForm>
                </Disclosure>
              </div>
            )}
          </Card>
        </div>
        <Card title="Profile">
          {admin ? (
            <ActionForm action={updateCoach.bind(null, coach.id)} submitLabel="Save changes">
              <input type="hidden" name="version" value={coach.version} />
              <Fields cols={1}>
                <Input label="First name" name="firstName" required defaultValue={coach.firstName} />
                <Input label="Last name" name="lastName" required defaultValue={coach.lastName} />
                <Input label="Specialization" name="specialization" defaultValue={coach.specialization ?? ""} />
                <Select label="Status" name="status" defaultValue={coach.status} options={["active", "inactive"].map((s) => ({ value: s, label: s }))} />
              </Fields>
            </ActionForm>
          ) : (
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-slate-500">Specialization</dt>
              <dd>{coach.specialization ?? "—"}</dd>
              <dt className="text-slate-500">Has login</dt>
              <dd>{coach.userId ? "Yes" : "No"}</dd>
            </dl>
          )}
        </Card>
        <div className="xl:col-span-3">
          <ChangeHistory entity="coaches" entityId={coach.id} />
        </div>
      </div>
    </>
  );
}

export default function CoachPage(props: PageProps<"/coaches/[id]">) {
  return (
    <Shell>
      <Suspense fallback={<Skeleton rows={6} />}>
        <CoachDetail params={props.params} />
      </Suspense>
    </Shell>
  );
}

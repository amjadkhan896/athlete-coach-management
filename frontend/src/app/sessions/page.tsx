import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { RecurringSessionForm, SessionForm } from "@/components/session-form";
import { Shell } from "@/components/shell";
import { Badge, Card, Disclosure, Empty, FilterBar, PageHeader, Select, Skeleton, Table, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { getMe } from "@/lib/session";
import type { Page, Team, TrainingSession } from "@/lib/types";

type Search = { when?: string; teamId?: string; status?: string; mine?: string; page?: string };

async function SessionList({ searchParams }: { searchParams: Promise<Search> }) {
  const { when = "upcoming", teamId = "", status = "", mine = "", page = "1" } = await searchParams;
  await connection();
  const now = new Date().toISOString();
  const query = new URLSearchParams({ page, limit: "25" });
  if (when === "upcoming") query.set("from", now);
  if (when === "past") query.set("to", now);
  if (teamId) query.set("teamId", teamId);
  if (status) query.set("status", status);
  if (mine) query.set("mine", "true");

  const [me, sessions, teams] = await Promise.all([getMe(), api<Page<TrainingSession>>(`/sessions?${query}`), api<Page<Team>>("/teams?limit=100")]);
  const teamName = new Map(teams.items.map((t) => [t.id, t.name]));
  const items = when === "past" ? [...sessions.items].reverse() : sessions.items;
  const pages = Math.max(1, Math.ceil(sessions.total / sessions.limit));
  const pageLink = (p: number) => `/sessions?${new URLSearchParams({ when, teamId, status, mine, page: String(p) })}`;

  return (
    <Card>
      <FilterBar>
        <Select label="When" name="when" defaultValue={when} options={[{ value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }, { value: "all", label: "All" }]} />
        <Select label="Team" name="teamId" defaultValue={teamId} placeholder="All teams" options={teams.items.map((t) => ({ value: t.id, label: t.name }))} />
        <Select
          label="Status"
          name="status"
          defaultValue={status}
          placeholder="Any status"
          options={["scheduled", "completed", "cancelled"].map((s) => ({ value: s, label: s }))}
        />
        {me.role === "coach" && <input type="hidden" name="mine" value="true" />}
      </FilterBar>
      {items.length === 0 ? (
        <Empty>No sessions found.</Empty>
      ) : (
        <Table head={["Session", "Team", "When", "Location", "Status"]}>
          {items.map((s) => (
            <tr key={s.id}>
              <td>
                <Link href={`/sessions/${s.id}`} className={linkStyle}>
                  {s.title}
                </Link>
              </td>
              <td className="text-slate-600 dark:text-slate-400">{teamName.get(s.teamId) ?? "—"}</td>
              <td className="whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDateTime(s.startsAt)}</td>
              <td className="text-slate-600 dark:text-slate-400">{s.location ?? "—"}</td>
              <td>
                <Badge value={s.status} />
              </td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
        <span>
          {sessions.total} sessions · page {sessions.page} of {pages}
        </span>
        {sessions.page > 1 && <Link href={pageLink(sessions.page - 1)} className="font-medium text-brand-600">← Previous</Link>}
        {sessions.page < pages && <Link href={pageLink(sessions.page + 1)} className="font-medium text-brand-600">Next →</Link>}
      </div>
    </Card>
  );
}

async function Schedule() {
  const me = await getMe();
  const teams = await api<Page<Team>>("/teams?status=active&limit=100");
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Disclosure label="Schedule a session">
        <SessionForm teams={teams.items} />
      </Disclosure>
      <Disclosure label="Schedule a weekly series">
        <RecurringSessionForm teams={teams.items} />
      </Disclosure>
      {me.role === "coach" && <p className="text-xs text-slate-500 xl:col-span-2">Coaches can schedule sessions only for teams they are assigned to.</p>}
    </div>
  );
}

export default function SessionsPage(props: PageProps<"/sessions">) {
  return (
    <Shell>
      <PageHeader title="Training sessions" subtitle="Plan training, then record attendance from each session’s page." />
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <Schedule />
        </Suspense>
        <Suspense fallback={<Skeleton rows={6} />}>
          <SessionList searchParams={props.searchParams as Promise<Search>} />
        </Suspense>
      </div>
    </Shell>
  );
}

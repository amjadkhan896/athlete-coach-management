import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Fields } from "@/components/action-form";
import { Shell } from "@/components/shell";
import { Avatar, Badge, Card, Disclosure, Empty, FilterBar, Input, PageHeader, Select, Skeleton, Table, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, fullName } from "@/lib/format";
import { getMe, isAdmin } from "@/lib/session";
import type { Athlete, Page, Team } from "@/lib/types";
import { createAthlete } from "./actions";

type Search = { q?: string; page?: string; teamId?: string; status?: string };

async function AthleteList({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", page = "1", teamId = "", status = "" } = await searchParams;
  const query = new URLSearchParams({ page, limit: "25" });
  if (q) query.set("search", q);
  if (teamId) query.set("teamId", teamId);
  if (status) query.set("status", status);

  const [result, teams] = await Promise.all([api<Page<Athlete>>(`/athletes?${query}`), api<Page<Team>>("/teams?status=active&limit=100")]);
  const pages = Math.max(1, Math.ceil(result.total / result.limit));
  const pageLink = (p: number) => `/athletes?${new URLSearchParams({ q, teamId, status, page: String(p) })}`;

  return (
    <Card>
      <FilterBar>
        <Input label="Search" name="q" defaultValue={q} placeholder="Name" />
        <Select label="Team" name="teamId" defaultValue={teamId} placeholder="All teams" options={teams.items.map((t) => ({ value: t.id, label: t.name }))} />
        <Select label="Status" name="status" defaultValue={status} placeholder="Any status" options={["active", "inactive", "archived"].map((s) => ({ value: s, label: s }))} />
      </FilterBar>
      {result.items.length === 0 ? (
        <Empty>No athletes match.</Empty>
      ) : (
        <Table head={["Athlete", "Date of birth", "Gender", "Login", "Status"]}>
          {result.items.map((a) => (
            <tr key={a.id}>
              <td>
                <Link href={`/athletes/${a.id}`} className={`flex items-center gap-3 ${linkStyle}`}>
                  <Avatar name={fullName(a)} />
                  {fullName(a)}
                </Link>
              </td>
              <td className="text-slate-600 tabular-nums dark:text-slate-400">{formatDate(a.dateOfBirth)}</td>
              <td className="text-slate-600 capitalize dark:text-slate-400">{a.gender ?? "—"}</td>
              <td className="text-slate-600 dark:text-slate-400">{a.userId ? "Yes" : "—"}</td>
              <td>
                <Badge value={a.status} />
              </td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
        <span>
          {result.total} athletes · page {result.page} of {pages}
        </span>
        {result.page > 1 && <Link href={pageLink(result.page - 1)} className="font-medium text-brand-600">← Previous</Link>}
        {result.page < pages && <Link href={pageLink(result.page + 1)} className="font-medium text-brand-600">Next →</Link>}
      </div>
    </Card>
  );
}

async function AddAthlete() {
  if (!isAdmin(await getMe())) return null;
  return (
    <Disclosure label="Add an athlete">
      <ActionForm action={createAthlete} submitLabel="Add athlete">
        <Fields cols={4}>
          <Input label="First name" name="firstName" required />
          <Input label="Last name" name="lastName" required />
          <Input label="Date of birth" name="dateOfBirth" type="date" required />
          <Select label="Gender" name="gender" placeholder="—" options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
        </Fields>
      </ActionForm>
    </Disclosure>
  );
}

export default function AthletesPage(props: PageProps<"/athletes">) {
  return (
    <Shell>
      <PageHeader title="Athletes" subtitle="Everyone registered with your academy." />
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <AddAthlete />
        </Suspense>
        <Suspense fallback={<Skeleton rows={8} />}>
          <AthleteList searchParams={props.searchParams as Promise<Search>} />
        </Suspense>
      </div>
    </Shell>
  );
}

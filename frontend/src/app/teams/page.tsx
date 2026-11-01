import { UsersRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Fields } from "@/components/action-form";
import { Shell } from "@/components/shell";
import { Badge, Disclosure, Empty, Input, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { getMe, isAdmin } from "@/lib/session";
import type { Page, Team } from "@/lib/types";
import { createTeam } from "./actions";

async function TeamGrid() {
  const teams = await api<Page<Team>>("/teams?limit=100");
  if (teams.items.length === 0) return <Empty>No teams yet.</Empty>;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {teams.items.map((t) => (
        <Link
          key={t.id}
          href={`/teams/${t.id}`}
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
        >
          <div className="flex items-start justify-between">
            <span className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
              <UsersRound className="size-5" />
            </span>
            <Badge value={t.status} />
          </div>
          <h3 className="mt-4 font-semibold group-hover:text-brand-600">{t.name}</h3>
          <p className="mt-1 text-sm text-slate-500 capitalize">
            {t.sport} · {t.ageGroup ?? "All ages"} · {t.season ?? "No season"}
          </p>
        </Link>
      ))}
    </div>
  );
}

async function AddTeam() {
  if (!isAdmin(await getMe())) return null;
  return (
    <Disclosure label="Create a team">
      <ActionForm action={createTeam} submitLabel="Create team">
        <Fields cols={4}>
          <Input label="Name" name="name" required placeholder="U12 Football" />
          <Input label="Sport" name="sport" required placeholder="football" />
          <Input label="Age group" name="ageGroup" placeholder="U12" />
          <Input label="Season" name="season" placeholder="2026/27" />
        </Fields>
      </ActionForm>
    </Disclosure>
  );
}

export default function TeamsPage() {
  return (
    <Shell>
      <PageHeader title="Teams" subtitle="Open a team to manage its roster, coaches and sessions." />
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <AddTeam />
        </Suspense>
        <Suspense fallback={<Skeleton rows={4} />}>
          <TeamGrid />
        </Suspense>
      </div>
    </Shell>
  );
}

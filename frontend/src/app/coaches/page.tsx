import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Fields } from "@/components/action-form";
import { Shell } from "@/components/shell";
import { Avatar, Badge, Card, Disclosure, Empty, FilterBar, Input, PageHeader, Select, Skeleton, Table, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { fullName } from "@/lib/format";
import { getMe, isAdmin } from "@/lib/session";
import type { Coach, Page } from "@/lib/types";
import { createCoach } from "./actions";

type Search = { q?: string; status?: string };

async function CoachList({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", status = "" } = await searchParams;
  const query = new URLSearchParams({ limit: "100" });
  if (q) query.set("search", q);
  if (status) query.set("status", status);
  const coaches = await api<Page<Coach>>(`/coaches?${query}`);
  return (
    <Card>
      <FilterBar>
        <Input label="Search" name="q" defaultValue={q} placeholder="Name" />
        <Select label="Status" name="status" defaultValue={status} placeholder="Any status" options={["active", "inactive"].map((s) => ({ value: s, label: s }))} />
      </FilterBar>
      {coaches.items.length === 0 ? (
        <Empty>No coaches found.</Empty>
      ) : (
        <Table head={["Coach", "Specialization", "Login", "Status"]}>
          {coaches.items.map((c) => (
            <tr key={c.id}>
              <td>
                <Link href={`/coaches/${c.id}`} className={`flex items-center gap-3 ${linkStyle}`}>
                  <Avatar name={fullName(c)} />
                  {fullName(c)}
                </Link>
              </td>
              <td className="text-slate-600 dark:text-slate-400">{c.specialization ?? "—"}</td>
              <td className="text-slate-600 dark:text-slate-400">{c.userId ? "Yes" : "—"}</td>
              <td>
                <Badge value={c.status} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

async function AddCoach() {
  if (!isAdmin(await getMe())) return null;
  return (
    <Disclosure label="Add a coach">
      <ActionForm action={createCoach} submitLabel="Add coach">
        <Fields cols={3}>
          <Input label="First name" name="firstName" required />
          <Input label="Last name" name="lastName" required />
          <Input label="Specialization" name="specialization" placeholder="Football, conditioning…" />
        </Fields>
      </ActionForm>
    </Disclosure>
  );
}

export default function CoachesPage(props: PageProps<"/coaches">) {
  return (
    <Shell>
      <PageHeader title="Coaches" subtitle="Give a coach a login from Users & access so they can record attendance." />
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <AddCoach />
        </Suspense>
        <Suspense fallback={<Skeleton rows={6} />}>
          <CoachList searchParams={props.searchParams as Promise<Search>} />
        </Suspense>
      </div>
    </Shell>
  );
}

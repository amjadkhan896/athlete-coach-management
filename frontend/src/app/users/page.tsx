import { Suspense } from "react";
import { ActionForm, Fields } from "@/components/action-form";
import { Shell } from "@/components/shell";
import { Avatar, Badge, Card, Disclosure, Input, PageHeader, Select, Skeleton, Table } from "@/components/ui";
import { api } from "@/lib/api";
import { fullName } from "@/lib/format";
import { getMe } from "@/lib/session";
import type { Athlete, Coach, Member, Page } from "@/lib/types";
import { createUser, setMembershipActive, updateMembership } from "./actions";

const ROLE_OPTIONS = [
  { value: "academy_admin", label: "Admin" },
  { value: "coach", label: "Coach" },
  { value: "athlete", label: "Athlete" },
];

async function UsersContent() {
  const [me, members, coaches, athletes] = await Promise.all([
    getMe(),
    api<Member[]>("/users"),
    api<Page<Coach>>("/coaches?limit=100"),
    api<Page<Athlete>>("/athletes?status=active&limit=100"),
  ]);
  const unlinked = [
    ...coaches.items.filter((c) => !c.userId).map((c) => ({ value: c.id, label: `Coach · ${fullName(c)}` })),
    ...athletes.items.filter((a) => !a.userId).map((a) => ({ value: a.id, label: `Athlete · ${fullName(a)}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Disclosure label="Create a login">
        <ActionForm action={createUser} submitLabel="Create login">
          <Fields cols={2}>
            <Input label="Full name" name="fullName" required />
            <Input label="Email" name="email" type="email" required />
            <Input label="Temporary password" name="password" type="text" required minLength={8} placeholder="At least 8 characters" />
            <Select label="Role" name="role" required options={ROLE_OPTIONS} defaultValue="coach" />
          </Fields>
          <Select
            label="Link to profile (coaches and athletes)"
            name="profileId"
            placeholder="No profile"
            options={unlinked}
          />
          <p className="text-xs text-slate-500">
            Linking lets a coach record attendance for their teams, or an athlete see their own records. The profile’s type must match the role.
          </p>
        </ActionForm>
      </Disclosure>

      <Card title="People with access" description={`${members.length} accounts`} padded>
        <Table head={["User", "Role", "Profile", "Status", ""]}>
          {members.map((m) => {
            const self = m.userId === me.userId;
            return (
              <tr key={m.userId} className={m.isActive ? "" : "opacity-60"}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={m.fullName} />
                    <div>
                      <p className="font-medium">
                        {m.fullName} {self && <span className="text-xs text-slate-500">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  {self ? (
                    <Badge value={m.role} />
                  ) : (
                    <ActionForm action={updateMembership.bind(null, m.userId)} submitLabel="Change" variant="secondary" inline>
                      <select
                        name="role"
                        defaultValue={m.role}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </ActionForm>
                  )}
                </td>
                <td className="text-xs text-slate-500">{m.coachId ? "Coach profile" : m.athleteId ? "Athlete profile" : "—"}</td>
                <td>
                  <Badge value={m.isActive ? "active" : "inactive"} />
                </td>
                <td className="text-right">
                  {!self &&
                    (m.isActive ? (
                      <ActionForm action={setMembershipActive.bind(null, m.userId, false)} submitLabel="Remove access" variant="danger" inline />
                    ) : (
                      <ActionForm action={setMembershipActive.bind(null, m.userId, true)} submitLabel="Restore" variant="secondary" inline />
                    ))}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Shell>
      <PageHeader title="Users & access" subtitle="Who can sign in to your academy, and what they can do. Removing access takes effect immediately." />
      <Suspense fallback={<Skeleton rows={6} />}>
        <UsersContent />
      </Suspense>
    </Shell>
  );
}

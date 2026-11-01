"use client";

import { useActionState, useState } from "react";
import { Card, Input, Select, Table, buttonBase, buttonStyles } from "@/components/ui";
import { createAcademy, loadAcademies, type PlatformState } from "./actions";

const TIMEZONES = ["Asia/Dubai", "Asia/Riyadh", "Asia/Qatar", "Asia/Kuwait", "Asia/Bahrain", "Asia/Muscat", "UTC"];

/** Operator console. The key is kept only in this page's memory and sent with each request. */
export function PlatformConsole() {
  const [key, setKey] = useState("");
  const [listState, list, listing] = useActionState<PlatformState, FormData>(loadAcademies, {});
  const [createState, create, creating] = useActionState<PlatformState, FormData>(createAcademy, {});
  const academies = createState.academies ?? listState.academies;

  return (
    <div className="flex flex-col gap-6">
      <Card title="Platform key" description="The PLATFORM_ADMIN_KEY configured on the API server">
        <form action={list} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Key" name="key" type="password" required value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          </div>
          <button disabled={listing} className={`${buttonBase} ${buttonStyles.primary}`}>
            {listing ? "Loading…" : "Load academies"}
          </button>
        </form>
        {listState.error && <p className="mt-3 text-sm text-red-600">{listState.error}</p>}
      </Card>

      {academies && (
        <Card title="Academies" description={`${academies.length} on this platform`}>
          <Table head={["Academy", "Slug", "Timezone", "Athletes", "Coaches", "Active users", "Created"]}>
            {academies.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.name}</td>
                <td className="font-mono text-xs text-slate-500">{a.slug}</td>
                <td className="text-slate-600 dark:text-slate-400">{a.timezone}</td>
                <td className="tabular-nums">{a.athletes}</td>
                <td className="tabular-nums">{a.coaches}</td>
                <td className="tabular-nums">{a.users}</td>
                <td className="text-slate-500">{a.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Card title="Onboard a new academy" description="Creates the academy and its first administrator account">
        <form action={create} className="flex flex-col gap-4">
          <input type="hidden" name="key" value={key} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Academy name" name="name" required placeholder="Sharjah Sports Academy" />
            <Input label="Slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="sharjah-sports" />
            <Select label="Timezone" name="timezone" options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Admin name" name="adminName" required />
            <Input label="Admin email" name="adminEmail" type="email" required />
            <Input label="Admin temporary password" name="adminPassword" required minLength={8} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={creating || !key} className={`${buttonBase} ${buttonStyles.primary}`}>
              {creating ? "Creating…" : "Create academy"}
            </button>
            {!key && <span className="text-sm text-slate-500">Enter the platform key above first.</span>}
            {createState.error && <span className="text-sm text-red-600">{createState.error}</span>}
            {createState.ok && <span className="text-sm text-emerald-600">✓ {createState.ok}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}

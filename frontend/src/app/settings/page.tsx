import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { Shell } from "@/components/shell";
import { Badge, Card, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { health } from "@/lib/api";
import { getAcademy, getMe, isAdmin } from "@/lib/session";
import { changePassword, updateAcademy } from "./actions";

const TIMEZONES = ["Asia/Dubai", "Asia/Riyadh", "Asia/Qatar", "Asia/Kuwait", "Asia/Bahrain", "Asia/Muscat", "Europe/London", "UTC"];

async function SettingsContent() {
  const [me, academy, status] = await Promise.all([getMe(), getAcademy(), health()]);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {isAdmin(me) && (
        <Card title="Academy" description="Shown across the app. The timezone decides which day a session falls on.">
          <ActionForm action={updateAcademy} submitLabel="Save academy">
            <Input label="Academy name" name="name" required defaultValue={academy.name} />
            <Select label="Timezone" name="timezone" defaultValue={academy.timezone} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
          </ActionForm>
        </Card>
      )}
      {isAdmin(me) && (
        <Card title="System status" description="Live checks against the API">
          <dl className="grid grid-cols-[10rem_1fr] items-center gap-y-3 text-sm">
            <dt className="text-slate-500">API</dt>
            <dd>
              <Badge value={status.live ? "online" : "offline"} tone={status.live ? "green" : "red"} />
            </dd>
            <dt className="text-slate-500">Database</dt>
            <dd>
              <Badge value={status.ready ? "connected" : "unreachable"} tone={status.ready ? "green" : "red"} />
            </dd>
          </dl>
        </Card>
      )}
      <Card title="Your account" description={me.email}>
        <ActionForm action={changePassword} submitLabel="Change password">
          <Input label="Current password" name="currentPassword" type="password" required autoComplete="current-password" />
          <Input label="New password" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          <Input label="Confirm new password" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
        </ActionForm>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Shell>
      <PageHeader title="Settings" />
      <Suspense fallback={<Skeleton rows={4} />}>
        <SettingsContent />
      </Suspense>
    </Shell>
  );
}

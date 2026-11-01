import { createRecurringSessions, createSession } from "@/app/sessions/actions";
import { today } from "@/lib/format";
import type { Team } from "@/lib/types";
import { ActionForm, Fields } from "./action-form";
import { Input, Select } from "./ui";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TeamField({ teams }: { teams: Team[] }) {
  return teams.length === 1 ? (
    <input type="hidden" name="teamId" value={teams[0].id} />
  ) : (
    <Select label="Team" name="teamId" required placeholder="Choose team" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
  );
}

/** Schedules one session. Times are entered in academy local time. */
export function SessionForm({ teams }: { teams: Team[] }) {
  return (
    <ActionForm action={createSession} submitLabel="Schedule session">
      <Fields cols={teams.length === 1 ? 2 : 3}>
        <TeamField teams={teams} />
        <Input label="Title" name="title" required placeholder="Passing drills" />
        <Input label="Location" name="location" placeholder="Pitch 1" />
      </Fields>
      <Fields cols={3}>
        <Input label="Date" name="date" type="date" required defaultValue={today()} />
        <Input label="Start" name="startTime" type="time" required defaultValue="17:00" />
        <Input label="End" name="endTime" type="time" required defaultValue="18:30" />
      </Fields>
    </ActionForm>
  );
}

/** Schedules a weekly series; all sessions are created or none (if any clashes). */
export function RecurringSessionForm({ teams }: { teams: Team[] }) {
  return (
    <ActionForm action={createRecurringSessions} submitLabel="Create series">
      <Fields cols={teams.length === 1 ? 2 : 3}>
        <TeamField teams={teams} />
        <Input label="Title" name="title" required placeholder="Evening training" />
        <Input label="Location" name="location" placeholder="Pitch 1" />
      </Fields>
      <Fields cols={4}>
        <Input label="From" name="startDate" type="date" required defaultValue={today()} />
        <Input label="Until" name="endDate" type="date" required />
        <Input label="Start" name="startTime" type="time" required defaultValue="17:00" />
        <Input label="End" name="endTime" type="time" required defaultValue="18:30" />
      </Fields>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Repeat on</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => (
            <label
              key={d}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700 dark:border-slate-700 dark:has-checked:bg-brand-950 dark:has-checked:text-brand-200"
            >
              <input type="checkbox" name="weekdays" value={i} className="sr-only" />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
    </ActionForm>
  );
}

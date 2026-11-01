"use server";

import { redirect } from "next/navigation";
import { attempt, field, type ActionState } from "@/lib/actions";
import { send } from "@/lib/api";
import { academyLocalToIso } from "@/lib/format";
import type { AttendanceStatus, TrainingSession } from "@/lib/types";

export async function createSession(_: ActionState, form: FormData): Promise<ActionState> {
  const date = field(form, "date");
  const start = field(form, "startTime");
  const end = field(form, "endTime");
  if (!date || !start || !end) return { error: "Date, start and end time are required" };

  let created: TrainingSession | undefined;
  const result = await attempt(async () => {
    created = await send<TrainingSession>("POST", "/sessions", {
      teamId: field(form, "teamId"),
      title: field(form, "title"),
      startsAt: academyLocalToIso(`${date}T${start}`),
      endsAt: academyLocalToIso(`${date}T${end}`),
      location: field(form, "location"),
      notes: field(form, "notes"),
    });
  }, "Session scheduled", ["/sessions", "/"]);
  if (created) redirect(`/sessions/${created.id}`);
  return result;
}

export async function createRecurringSessions(_: ActionState, form: FormData): Promise<ActionState> {
  const weekdays = form.getAll("weekdays").map(Number);
  const start = field(form, "startTime") ?? "";
  const end = field(form, "endTime") ?? "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const durationMinutes = eh * 60 + em - (sh * 60 + sm);
  if (!weekdays.length) return { error: "Pick at least one weekday" };
  if (!(durationMinutes > 0)) return { error: "End time must be after start time" };

  let count = 0;
  const result = await attempt(async () => {
    const created = await send<TrainingSession[]>("POST", "/sessions/recurring", {
      teamId: field(form, "teamId"),
      title: field(form, "title"),
      startDate: field(form, "startDate"),
      endDate: field(form, "endDate"),
      weekdays,
      startTime: start,
      durationMinutes,
      location: field(form, "location"),
    });
    count = created.length;
  }, "Series created", ["/sessions", "/"]);
  return result.ok ? { ok: `${count} sessions scheduled` } : result;
}

export async function updateSession(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const date = field(form, "date");
  const start = field(form, "startTime");
  const end = field(form, "endTime");
  return attempt(
    () =>
      send("PATCH", `/sessions/${id}`, {
        version: Number(field(form, "version")),
        title: field(form, "title"),
        location: field(form, "location"),
        notes: field(form, "notes"),
        ...(date && start && end
          ? { startsAt: academyLocalToIso(`${date}T${start}`), endsAt: academyLocalToIso(`${date}T${end}`) }
          : {}),
      }),
    "Saved",
    [`/sessions/${id}`, "/sessions"],
  );
}

export async function setSessionStatus(id: string, version: number, status: TrainingSession["status"]): Promise<ActionState> {
  return attempt(() => send("PATCH", `/sessions/${id}`, { version, status }), "Updated", [`/sessions/${id}`, "/sessions", "/"]);
}

export async function saveAttendance(sessionId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const entries: { athleteId: string; status: AttendanceStatus }[] = [];
  for (const [key, value] of form.entries()) {
    if (key.startsWith("status:") && typeof value === "string" && value) {
      entries.push({ athleteId: key.slice("status:".length), status: value as AttendanceStatus });
    }
  }
  if (!entries.length) return { error: "Mark at least one athlete" };
  return attempt(() => send("PUT", `/sessions/${sessionId}/attendance`, { entries }), `Attendance saved for ${entries.length} athletes`, [
    `/sessions/${sessionId}`,
  ]);
}

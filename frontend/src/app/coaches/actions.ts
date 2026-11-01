"use server";

import { redirect } from "next/navigation";
import { attempt, field, type ActionState } from "@/lib/actions";
import { send } from "@/lib/api";
import type { Coach } from "@/lib/types";

const coachFields = (form: FormData) => ({
  firstName: field(form, "firstName"),
  lastName: field(form, "lastName"),
  specialization: field(form, "specialization"),
});

export async function createCoach(_: ActionState, form: FormData): Promise<ActionState> {
  let created: Coach | undefined;
  const result = await attempt(async () => {
    created = await send<Coach>("POST", "/coaches", coachFields(form));
  }, "Coach added", ["/coaches"]);
  if (created) redirect(`/coaches/${created.id}`);
  return result;
}

export async function updateCoach(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  return attempt(
    () => send("PATCH", `/coaches/${id}`, { ...coachFields(form), status: field(form, "status"), version: Number(field(form, "version")) }),
    "Saved",
    [`/coaches/${id}`, "/coaches"],
  );
}

export async function assignCoachToTeam(coachId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const teamId = field(form, "teamId");
  return attempt(
    () => send("POST", `/teams/${teamId}/coaches`, { coachId, role: field(form, "role"), validFrom: field(form, "validFrom") }),
    "Assigned to team",
    [`/coaches/${coachId}`, `/teams/${teamId}`],
  );
}

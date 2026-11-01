"use server";

import { redirect } from "next/navigation";
import { attempt, field, type ActionState } from "@/lib/actions";
import { send } from "@/lib/api";
import type { Athlete } from "@/lib/types";

const athleteFields = (form: FormData) => ({
  firstName: field(form, "firstName"),
  lastName: field(form, "lastName"),
  dateOfBirth: field(form, "dateOfBirth"),
  gender: field(form, "gender"),
  notes: field(form, "notes"),
});

export async function createAthlete(_: ActionState, form: FormData): Promise<ActionState> {
  let created: Athlete | undefined;
  const result = await attempt(async () => {
    created = await send<Athlete>("POST", "/athletes", athleteFields(form));
  }, "Athlete added", ["/athletes"]);
  if (created) redirect(`/athletes/${created.id}`);
  return result;
}

export async function updateAthlete(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  return attempt(
    () =>
      send("PATCH", `/athletes/${id}`, {
        ...athleteFields(form),
        status: field(form, "status"),
        version: Number(field(form, "version")),
      }),
    "Saved",
    [`/athletes/${id}`, "/athletes"],
  );
}

export async function assignToTeam(athleteId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const teamId = field(form, "teamId");
  return attempt(
    () => send("POST", `/teams/${teamId}/athletes`, { athleteId, validFrom: field(form, "validFrom"), reason: field(form, "reason") }),
    "Added to team",
    [`/athletes/${athleteId}`, `/teams/${teamId}`],
  );
}

export async function transferAthlete(athleteId: string, _: ActionState, form: FormData): Promise<ActionState> {
  return attempt(
    () =>
      send("POST", `/athletes/${athleteId}/transfer`, {
        fromTeamId: field(form, "fromTeamId"),
        toTeamId: field(form, "toTeamId"),
        effectiveDate: field(form, "effectiveDate"),
        reason: field(form, "reason"),
      }),
    "Transferred",
    [`/athletes/${athleteId}`, "/teams"],
  );
}

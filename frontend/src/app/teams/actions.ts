"use server";

import { redirect } from "next/navigation";
import { attempt, field, type ActionState } from "@/lib/actions";
import { send } from "@/lib/api";
import type { Team } from "@/lib/types";

const teamFields = (form: FormData) => ({
  name: field(form, "name"),
  sport: field(form, "sport"),
  ageGroup: field(form, "ageGroup"),
  season: field(form, "season"),
});

export async function createTeam(_: ActionState, form: FormData): Promise<ActionState> {
  let created: Team | undefined;
  const result = await attempt(async () => {
    created = await send<Team>("POST", "/teams", teamFields(form));
  }, "Team created", ["/teams"]);
  if (created) redirect(`/teams/${created.id}`);
  return result;
}

export async function updateTeam(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  return attempt(
    () => send("PATCH", `/teams/${id}`, { ...teamFields(form), status: field(form, "status"), version: Number(field(form, "version")) }),
    "Saved",
    [`/teams/${id}`, "/teams"],
  );
}

export async function addAthleteToTeam(teamId: string, _: ActionState, form: FormData): Promise<ActionState> {
  return attempt(
    () => send("POST", `/teams/${teamId}/athletes`, { athleteId: field(form, "athleteId"), validFrom: field(form, "validFrom") }),
    "Athlete added",
    [`/teams/${teamId}`],
  );
}

export async function addCoachToTeam(teamId: string, _: ActionState, form: FormData): Promise<ActionState> {
  return attempt(
    () => send("POST", `/teams/${teamId}/coaches`, { coachId: field(form, "coachId"), role: field(form, "role"), validFrom: field(form, "validFrom") }),
    "Coach assigned",
    [`/teams/${teamId}`],
  );
}

/** Closes an assignment today. History is kept: the row gets an end date, it is never deleted. */
export async function endAthleteAssignment(assignmentId: string, teamId: string): Promise<ActionState> {
  return attempt(() => send("POST", `/athlete-assignments/${assignmentId}/end`, {}), "Removed", [`/teams/${teamId}`]);
}

export async function endCoachAssignment(assignmentId: string, teamId: string): Promise<ActionState> {
  return attempt(() => send("POST", `/coach-assignments/${assignmentId}/end`, {}), "Removed", [`/teams/${teamId}`, "/coaches"]);
}

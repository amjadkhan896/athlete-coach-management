"use server";

import { attempt, field, type ActionState } from "@/lib/actions";
import { send } from "@/lib/api";

export async function createUser(_: ActionState, form: FormData): Promise<ActionState> {
  const role = field(form, "role");
  const profile = field(form, "profileId");
  return attempt(
    () =>
      send("POST", "/users", {
        email: field(form, "email"),
        fullName: field(form, "fullName"),
        password: field(form, "password"),
        role,
        coachId: role === "coach" ? profile : undefined,
        athleteId: role === "athlete" ? profile : undefined,
      }),
    "Login created. Share the email and password with the person.",
    ["/users", "/coaches", "/athletes"],
  );
}

export async function updateMembership(userId: string, _: ActionState, form: FormData): Promise<ActionState> {
  return attempt(() => send("PATCH", `/users/${userId}`, { role: field(form, "role") }), "Role updated", ["/users"]);
}

export async function setMembershipActive(userId: string, isActive: boolean): Promise<ActionState> {
  return attempt(() => send("PATCH", `/users/${userId}`, { isActive }), isActive ? "Access restored" : "Access removed", ["/users"]);
}

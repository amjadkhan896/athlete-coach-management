"use server";

import { attempt, field, type ActionState } from "@/lib/actions";
import { send } from "@/lib/api";

export async function updateAcademy(_: ActionState, form: FormData): Promise<ActionState> {
  return attempt(() => send("PATCH", "/academy", { name: field(form, "name"), timezone: field(form, "timezone") }), "Academy updated", ["/", "/settings"]);
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const next = field(form, "newPassword");
  if (next !== field(form, "confirmPassword")) return { error: "The new passwords don’t match" };
  return attempt(
    () => send("POST", "/auth/change-password", { currentPassword: field(form, "currentPassword"), newPassword: next }),
    "Password changed",
  );
}

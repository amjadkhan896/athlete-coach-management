import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ApiError } from "./api";

export interface ActionState {
  error?: string;
  ok?: string;
}

/** Runs an API mutation for a server action and maps failures to a message for the form. */
export async function attempt(
  work: () => Promise<unknown>,
  success: string,
  paths: string[] = [],
): Promise<ActionState> {
  try {
    await work();
  } catch (error) {
    unstable_rethrow(error); // let redirects (e.g. expired session) through
    if (error instanceof ApiError) {
      if (error.status === 409 && /changed by someone else/i.test(error.message)) {
        return { error: "Someone else saved this record first. Reload the page and try again." };
      }
      return { error: error.message };
    }
    return { error: "Something went wrong. Please try again." };
  }
  for (const path of paths) revalidatePath(path);
  return { ok: success };
}

/** Reads a form field as a trimmed string; empty becomes undefined so it is omitted from JSON. */
export function field(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

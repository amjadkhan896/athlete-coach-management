"use server";

import { ApiError, platform } from "@/lib/api";

export interface AcademySummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  created_at: string;
  athletes: number;
  coaches: number;
  users: number;
}

export interface PlatformState {
  academies?: AcademySummary[];
  error?: string;
  ok?: string;
}

const failure = (error: unknown): PlatformState => ({
  error:
    error instanceof ApiError
      ? error.status === 401
        ? "Wrong platform key."
        : error.status === 404
          ? "Platform endpoints are disabled on this server (PLATFORM_ADMIN_KEY is not set)."
          : error.message
      : "Could not reach the API.",
});

export async function loadAcademies(_: PlatformState, form: FormData): Promise<PlatformState> {
  try {
    return { academies: await platform<AcademySummary[]>(String(form.get("key") ?? "")) };
  } catch (error) {
    return failure(error);
  }
}

export async function createAcademy(state: PlatformState, form: FormData): Promise<PlatformState> {
  const key = String(form.get("key") ?? "");
  const value = (name: string) => String(form.get(name) ?? "").trim() || undefined;
  try {
    const created = await platform<{ name: string; adminEmail: string }>(key, {
      method: "POST",
      body: JSON.stringify({
        name: value("name"),
        slug: value("slug"),
        timezone: value("timezone"),
        adminName: value("adminName"),
        adminEmail: value("adminEmail"),
        adminPassword: value("adminPassword"),
      }),
    });
    return {
      academies: await platform<AcademySummary[]>(key),
      ok: `${created.name} created. ${created.adminEmail} can now sign in.`,
    };
  } catch (error) {
    return { ...failure(error), academies: state.academies };
  }
}

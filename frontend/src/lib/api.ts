import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "acm_session";

const API_URL = process.env.API_URL ?? "http://localhost:5001";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Full error body, for errors that carry data (e.g. the academy choice at login). */
    public readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** Turns NestJS error bodies (string or validation array) into one readable message. */
function messageFrom(body: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(body.message)) return body.message.join(". ");
  return body.message ?? fallback;
}

/**
 * Server-side call to the NestJS API with the caller's token. The token stays
 * in an httpOnly cookie and never reaches browser JavaScript.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, messageFrom(body, response.statusText));
  }
  return response.json() as Promise<T>;
}

/** JSON write helper for server actions. */
export function send<T>(method: "POST" | "PATCH" | "PUT", path: string, body: unknown): Promise<T> {
  return api<T>(path, { method, body: JSON.stringify(body) });
}

export async function login(email: string, password: string, academyId?: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, academyId }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(body, "Sign-in failed"), body);
  }
  return body as { accessToken: string };
}

export interface RegisterInput {
  academyName: string;
  timezone?: string;
  fullName: string;
  email: string;
  password: string;
}

/** Public academy sign-up; returns a session for the new admin. */
export async function register(input: RegisterInput) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, messageFrom(body, "Sign-up failed"), body);
  return body as { accessToken: string };
}

/** Platform operator call, authenticated by the operator's key rather than a user session. */
export async function platform<T>(key: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api/platform/academies`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Platform-Key": key, ...init.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, messageFrom(body, response.statusText), body);
  return body as T;
}

/** API liveness and readiness (database reachable). */
export async function health(): Promise<{ live: boolean; ready: boolean }> {
  const check = (path: string) =>
    fetch(`${API_URL}/health/${path}`, { cache: "no-store" })
      .then((r) => r.ok)
      .catch(() => false);
  const [live, ready] = await Promise.all([check("live"), check("ready")]);
  return { live, ready };
}

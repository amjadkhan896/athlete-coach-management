"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, login, register, SESSION_COOKIE } from "@/lib/api";

export interface LoginState {
  error?: string;
  /** Set when the account belongs to several academies and must pick one. */
  academies?: { id: string; name: string }[];
  email?: string;
}

function setSession(store: Awaited<ReturnType<typeof cookies>>, token: string) {
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

export interface SignupState {
  error?: string;
}

/** Creates a new academy with the caller as admin, then signs them in. */
export async function signupAction(_state: SignupState, formData: FormData): Promise<SignupState> {
  const value = (name: string) => String(formData.get(name) ?? "").trim();
  if (value("password") !== value("confirmPassword")) return { error: "The passwords don’t match." };

  try {
    const { accessToken } = await register({
      academyName: value("academyName"),
      timezone: value("timezone") || undefined,
      fullName: value("fullName"),
      email: value("email"),
      password: value("password"),
    });
    setSession(await cookies(), accessToken);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) return { error: "Too many attempts. Wait a minute and try again." };
      return { error: error.message };
    }
    return { error: "Could not reach the server. Please try again." };
  }
  redirect("/");
}

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const academyId = String(formData.get("academyId") ?? "") || undefined;

  try {
    const { accessToken } = await login(email, password, academyId);
    setSession(await cookies(), accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      return { error: "Too many attempts. Wait a minute and try again." };
    }
    if (error instanceof ApiError && Array.isArray(error.body.academies)) {
      return {
        email,
        academies: (error.body.academies as { id: string; name: string }[]).map(({ id, name }) => ({ id, name })),
        error: "Your account belongs to several academies. Choose one and enter your password again.",
      };
    }
    return { error: "Invalid email or password." };
  }
  redirect("/");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

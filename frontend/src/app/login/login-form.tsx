"use client";

import { useActionState } from "react";
import { Input, Select, buttonBase, buttonStyles } from "@/components/ui";
import { loginAction, type LoginState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input label="Email" name="email" type="email" required autoComplete="username" defaultValue={state.email ?? "admin@falcons.test"} />
      {state.academies && (
        <Select label="Academy" name="academyId" required options={state.academies.map((a) => ({ value: a.id, label: a.name }))} />
      )}
      <Input label="Password" name="password" type="password" required minLength={8} autoComplete="current-password" />
      {state.error && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${state.academies ? "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}
          role="alert"
        >
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${buttonBase} ${buttonStyles.primary} w-full py-2.5`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

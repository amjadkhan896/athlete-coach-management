"use client";

import { useActionState } from "react";
import { Input, Select, buttonBase, buttonStyles } from "@/components/ui";
import { signupAction, type SignupState } from "../actions";

const TIMEZONES = ["Asia/Dubai", "Asia/Riyadh", "Asia/Qatar", "Asia/Kuwait", "Asia/Bahrain", "Asia/Muscat", "Europe/London", "UTC"];

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">Your academy</legend>
        <Input label="Academy name" name="academyName" required minLength={2} placeholder="Dubai Youth Football Academy" />
        <Select label="Timezone" name="timezone" defaultValue="Asia/Dubai" options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="mt-2 mb-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">Administrator account</legend>
        <Input label="Your full name" name="fullName" required autoComplete="name" />
        <Input label="Work email" name="email" type="email" required autoComplete="email" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          <Input label="Confirm password" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
        </div>
      </fieldset>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${buttonBase} ${buttonStyles.primary} w-full py-2.5`}>
        {pending ? "Creating your academy…" : "Create academy"}
      </button>
      <p className="text-xs text-slate-500">You’ll be the academy’s administrator. You can add coaches, athletes and other admins after signing in.</p>
    </form>
  );
}

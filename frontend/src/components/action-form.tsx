"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions";
import { buttonBase, buttonStyles } from "./ui";

/**
 * A form bound to a server action, with pending state and the action's
 * success or error message shown next to the submit button.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  variant = "primary",
  inline = false,
  className = "",
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel: string;
  children?: ReactNode;
  variant?: keyof typeof buttonStyles;
  inline?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const size = inline ? "px-2.5 py-1 text-xs" : "";

  return (
    <form action={formAction} className={`${inline ? "inline-flex items-center gap-2" : "flex flex-col gap-4"} ${className}`}>
      {children}
      <div className={inline ? "contents" : "flex flex-wrap items-center gap-3"}>
        <button type="submit" disabled={pending} className={`${buttonBase} ${buttonStyles[variant]} ${size}`}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.error && (
          <span role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
        {state.ok && !inline && <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ {state.ok}</span>}
      </div>
    </form>
  );
}

/** Groups form fields in a responsive grid. */
export function Fields({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  const grid = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return <div className={`grid grid-cols-1 gap-4 ${grid}`}>{children}</div>;
}

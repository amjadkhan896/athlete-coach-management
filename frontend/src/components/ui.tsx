import Link from "next/link";
import type { ReactNode } from "react";

/* ── Layout ──────────────────────────────────────────── */

export function Card({
  title,
  description,
  action,
  children,
  padded = true,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-sm text-slate-500 hover:text-brand-600">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <span className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-950 dark:text-brand-300">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}

/** Collapsible section, used for secondary forms so pages stay scannable. */
export function Disclosure({ label, children, defaultOpen = false }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-slate-200 dark:border-slate-800">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm font-medium text-brand-700 select-none dark:text-brand-300">
        {label}
        <span className="text-slate-400 transition group-open:rotate-90">›</span>
      </summary>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">{children}</div>
    </details>
  );
}

/* ── Data display ────────────────────────────────────── */

const BADGE_TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300",
  blue: "bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-950 dark:text-brand-300",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300",
  gray: "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
};

const BADGE_VALUE: Record<string, keyof typeof BADGE_TONES> = {
  active: "green",
  present: "green",
  completed: "green",
  scheduled: "blue",
  coach: "blue",
  late: "amber",
  excused: "amber",
  inactive: "gray",
  archived: "gray",
  absent: "red",
  cancelled: "red",
  head: "violet",
  academy_admin: "violet",
  insert: "green",
  update: "blue",
};

const BADGE_LABEL: Record<string, string> = { academy_admin: "Admin", insert: "created", update: "updated" };

export function Badge({ value, tone }: { value: string; tone?: keyof typeof BADGE_TONES }) {
  const style = BADGE_TONES[tone ?? BADGE_VALUE[value] ?? "gray"];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${style}`}>
      {BADGE_LABEL[value] ?? value.replaceAll("_", " ")}
    </span>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/40">
            {head.map((h, i) => (
              <th key={`${h}-${i}`} className="px-5 py-2.5 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 [&_td]:px-5 [&_td]:py-3">{children}</tbody>
      </table>
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
      {initials}
    </span>
  );
}

export const linkStyle = "font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300";

/* ── Buttons & links ─────────────────────────────────── */

export const buttonStyles = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  danger:
    "border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950",
};
export const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

export function ButtonLink({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: keyof typeof buttonStyles }) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonStyles[variant]}`}>
      {children}
    </Link>
  );
}

/* ── Form controls ───────────────────────────────────── */

const control =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
      {children}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };
export function Input({ label, ...props }: InputProps) {
  return (
    <Label text={label}>
      <input {...props} className={control} />
    </Label>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};
export function Select({ label, options, placeholder, ...props }: SelectProps) {
  return (
    <Label text={label}>
      <select {...props} className={control}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Label>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };
export function Textarea({ label, ...props }: TextareaProps) {
  return (
    <Label text={label}>
      <textarea rows={3} {...props} className={control} />
    </Label>
  );
}

/** Inline filter bar for list pages (plain GET form, works without JavaScript). */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <form className="mb-5 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <div>
        <button className={`${buttonBase} ${buttonStyles.secondary} w-full sm:w-auto`}>Apply filters</button>
      </div>
    </form>
  );
}

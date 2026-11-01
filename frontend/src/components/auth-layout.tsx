import { CalendarDays, ClipboardCheck, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

const FEATURES = [
  { icon: UsersRound, text: "Manage teams, coaches and athletes" },
  { icon: CalendarDays, text: "Schedule training and track attendance" },
  { icon: ClipboardCheck, text: "Record and follow athlete performance" },
  { icon: ShieldCheck, text: "Each academy's data stays private" },
];

/** Split layout used by sign-in and sign-up: brand panel left, form right. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-brand-900/40 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <Trophy className="size-5" />
          </span>
          <span className="text-lg font-semibold">AcademyHub</span>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">Run your sports academy from one place.</h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-brand-100">
                <f.icon className="size-5 shrink-0" />
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">Athlete &amp; Coach Management Platform</p>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Trophy className="size-5" />
            </span>
            <span className="text-lg font-semibold">AcademyHub</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 mb-8 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

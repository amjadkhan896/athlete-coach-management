import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Athlete, Coach, Member, Page, Roster, Team, TrainingSession } from "@/lib/types";
import { Card } from "./ui";

/**
 * Setup checklist for academy admins. Each step is derived from real data,
 * and the card disappears once everything is done.
 */
export async function GettingStarted() {
  const [teams, coaches, athletes, sessions, members] = await Promise.all([
    api<Page<Team>>("/teams?limit=10"),
    api<Page<Coach>>("/coaches?limit=1"),
    api<Page<Athlete>>("/athletes?limit=1"),
    api<Page<TrainingSession>>("/sessions?limit=1"),
    api<Member[]>("/users"),
  ]);
  const rosters = await Promise.all(teams.items.map((t) => api<Roster>(`/teams/${t.id}/roster`)));

  const steps = [
    { done: teams.total > 0, label: "Create your first team", hint: "e.g. U12 Football", href: "/teams" },
    { done: coaches.total > 0, label: "Add your coaches", hint: "Their profiles, with specialisation", href: "/coaches" },
    { done: athletes.total > 0, label: "Register athletes", hint: "Name and date of birth", href: "/athletes" },
    {
      done: rosters.some((r) => r.athletes.length > 0) && rosters.some((r) => r.coaches.length > 0),
      label: "Put coaches and athletes on a team",
      hint: "Open a team and use Add athlete / Assign coach",
      href: teams.items[0] ? `/teams/${teams.items[0].id}` : "/teams",
    },
    { done: sessions.total > 0, label: "Schedule training", hint: "One session or a weekly series", href: "/sessions" },
    { done: members.length > 1, label: "Invite your coaches", hint: "Create logins so they can take attendance", href: "/users" },
  ];
  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  return (
    <Card title="Set up your academy" description={`${completed} of ${steps.length} steps done`}>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>
      <ol className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                s.done
                  ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                  : "border-brand-200 hover:border-brand-400 hover:bg-brand-50 dark:border-brand-900 dark:hover:bg-brand-950"
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-brand-400" />
              )}
              <span>
                <span className={`block text-sm font-medium ${s.done ? "text-slate-500 line-through" : ""}`}>
                  {i + 1}. {s.label}
                </span>
                <span className="block text-xs text-slate-500">{s.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

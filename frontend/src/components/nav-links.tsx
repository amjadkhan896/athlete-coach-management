"use client";

import {
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

export const NAV: { href: string; label: string; icon: LucideIcon; roles: Role[]; section?: string }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["academy_admin", "coach", "athlete"] },
  { href: "/athletes", label: "Athletes", icon: Users, roles: ["academy_admin", "coach"], section: "Manage" },
  { href: "/coaches", label: "Coaches", icon: UserCog, roles: ["academy_admin", "coach"] },
  { href: "/teams", label: "Teams", icon: UsersRound, roles: ["academy_admin", "coach"] },
  { href: "/sessions", label: "Training sessions", icon: CalendarDays, roles: ["academy_admin", "coach"], section: "Training" },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck, roles: ["academy_admin", "coach", "athlete"] },
  { href: "/users", label: "Users & access", icon: Shield, roles: ["academy_admin"], section: "Administration" },
  { href: "/audit", label: "Audit log", icon: ScrollText, roles: ["academy_admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["academy_admin", "coach", "athlete"] },
];

/** Sidebar links for the user's role, with the current page highlighted. */
export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.filter((n) => n.roles.includes(role)).map((n) => (
        <div key={n.href}>
          {n.section && (role !== "athlete" || n.section !== "Manage") && (
            <p className="mt-5 mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{n.section}</p>
          )}
          <Link
            href={n.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive(n.href)
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            }`}
          >
            <n.icon className="size-4.5 shrink-0" strokeWidth={1.75} />
            {n.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}

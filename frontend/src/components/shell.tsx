import { LogOut, Menu, Trophy } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import { getAcademy, getMe } from "@/lib/session";
import type { Role } from "@/lib/types";
import { NavLinks } from "./nav-links";
import { Avatar } from "./ui";

const ROLE_LABEL: Record<Role, string> = { academy_admin: "Administrator", coach: "Coach", athlete: "Athlete" };

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <Trophy className="size-4.5" strokeWidth={2} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">AcademyHub</span>
    </Link>
  );
}

async function AcademyName() {
  const academy = await getAcademy();
  return <p className="truncate px-3 text-xs text-slate-500">{academy.name}</p>;
}

async function Navigation() {
  const me = await getMe();
  return <NavLinks role={me.role} />;
}

async function UserCard() {
  const me = await getMe();
  return (
    <div className="flex items-center gap-3 rounded-lg p-2">
      <Avatar name={me.fullName} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{me.fullName}</p>
        <p className="truncate text-xs text-slate-500">{ROLE_LABEL[me.role]}</p>
      </div>
      <form action={logoutAction}>
        <button
          title="Sign out"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

const navFallback = <div className="mx-3 mt-4 h-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />;

function SidebarContent() {
  return (
    <div className="flex h-full flex-col gap-1 px-3 py-5">
      <Brand />
      <Suspense fallback={<div className="h-4" />}>
        <AcademyName />
      </Suspense>
      <div className="mt-4 flex-1 overflow-y-auto">
        <Suspense fallback={navFallback}>
          <Navigation />
        </Suspense>
      </div>
      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <Suspense fallback={null}>
          <UserCard />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Application frame: fixed sidebar on desktop, collapsible menu on mobile.
 * Session-dependent parts stream in behind boundaries so the frame renders instantly.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <SidebarContent />
      </aside>

      <details className="group sticky top-0 z-20 border-b border-slate-200 bg-white lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
          <Brand />
          <Menu className="size-5 text-slate-500" />
        </summary>
        <div className="max-h-[80vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800">
          <SidebarContent />
        </div>
      </details>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

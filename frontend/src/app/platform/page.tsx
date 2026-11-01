import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlatformConsole } from "./platform-console";

export const metadata: Metadata = { title: "Platform" };

/** Console for the platform operator (not an academy user): onboard and list academies. */
export default function PlatformPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Trophy className="size-4.5" />
            </span>
            <span className="font-semibold">AcademyHub</span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Platform operator</span>
          </span>
          <Link href="/login" className="text-sm text-slate-500 hover:text-brand-600">
            Academy sign-in →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Academies</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">Onboard sports academies onto the platform. Each academy’s data is fully separate.</p>
        <PlatformConsole />
      </main>
    </div>
  );
}

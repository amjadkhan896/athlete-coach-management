"use client";

import Link from "next/link";

/** Shown when a page fails to load, e.g. a record from another academy or a missing permission. */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">This page couldn’t be loaded</h1>
      <p className="text-sm text-zinc-500">{error.message || "You may not have access to it, or it no longer exists."}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
          Try again
        </button>
        <Link href="/" className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}

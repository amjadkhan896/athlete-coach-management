import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your academy account.">
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        New academy?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">Demo accounts (password ChangeMe123!)</p>
        <p className="mt-1">admin@falcons.test · coach@falcons.test · athlete@falcons.test</p>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Platform operator?{" "}
        <Link href="/platform" className="font-medium text-brand-600 hover:underline">
          Manage academies
        </Link>
      </p>
    </AuthLayout>
  );
}

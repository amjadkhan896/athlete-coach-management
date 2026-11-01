import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your academy" };

export default function SignupPage() {
  return (
    <AuthLayout title="Create your academy" subtitle="Set up your academy in a minute. No credit card needed.">
      <SignupForm />
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

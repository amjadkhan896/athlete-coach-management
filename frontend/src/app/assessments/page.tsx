import Link from "next/link";
import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { Badge, Card, Empty, FilterBar, Input, PageHeader, Select, Skeleton, Table, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { getMe, isStaff } from "@/lib/session";
import type { Assessment, Page } from "@/lib/types";

type Search = { category?: string; corrected?: string; page?: string };

const metricsText = (m: Record<string, number | string>) =>
  Object.entries(m)
    .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`)
    .join(" · ");

async function AssessmentTable({ searchParams }: { searchParams: Promise<Search> }) {
  const { category = "", corrected = "", page = "1" } = await searchParams;
  const query = new URLSearchParams({ page, limit: "25" });
  if (category) query.set("category", category);
  if (corrected) query.set("includeSuperseded", "true");
  const [me, result] = await Promise.all([getMe(), api<Page<Assessment>>(`/assessments?${query}`)]);
  const staff = isStaff(me);
  const pages = Math.max(1, Math.ceil(result.total / result.limit));
  const pageLink = (p: number) => `/assessments?${new URLSearchParams({ category, corrected, page: String(p) })}`;

  return (
    <Card>
      <FilterBar>
        <Input label="Category" name="category" defaultValue={category} placeholder="technical, fitness…" />
        <Select
          label="Show"
          name="corrected"
          defaultValue={corrected}
          options={[
            { value: "", label: "Current assessments" },
            { value: "1", label: "Include corrected originals" },
          ]}
        />
      </FilterBar>
      {result.items.length === 0 ? (
        <Empty>No assessments found.</Empty>
      ) : (
        <Table head={[...(staff ? ["Athlete"] : []), "Date", "Category", "Score", "Metrics", ""]}>
          {result.items.map((a) => (
            <tr key={a.id}>
              {staff && (
                <td>
                  <Link href={`/athletes/${a.athleteId}`} className={linkStyle}>
                    {a.athleteName ?? "—"}
                  </Link>
                </td>
              )}
              <td className="whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDate(a.assessedOn)}</td>
              <td>
                <Link href={`/assessments/${a.id}`} className={`capitalize ${linkStyle}`}>
                  {a.category}
                </Link>
              </td>
              <td className="font-medium tabular-nums">{a.overallScore ?? "—"}</td>
              <td className="max-w-sm text-xs text-slate-500">{metricsText(a.metrics) || "—"}</td>
              <td>{a.supersedesId && <Badge value="correction" tone="amber" />}</td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
        <span>
          {result.total} assessments · page {result.page} of {pages}
        </span>
        {result.page > 1 && <Link href={pageLink(result.page - 1)} className="font-medium text-brand-600">← Previous</Link>}
        {result.page < pages && <Link href={pageLink(result.page + 1)} className="font-medium text-brand-600">Next →</Link>}
      </div>
    </Card>
  );
}

async function Header() {
  const me = await getMe();
  return (
    <PageHeader
      title={isStaff(me) ? "Assessments" : "My assessments"}
      subtitle={
        isStaff(me)
          ? "To record or correct an assessment, open the athlete’s profile. Corrections never overwrite the original."
          : "Your performance assessments from your coaches."
      }
    />
  );
}

export default function AssessmentsPage(props: PageProps<"/assessments">) {
  return (
    <Shell>
      <Suspense fallback={<div className="mb-6 h-12" />}>
        <Header />
      </Suspense>
      <Suspense fallback={<Skeleton rows={6} />}>
        <AssessmentTable searchParams={props.searchParams as Promise<Search>} />
      </Suspense>
    </Shell>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { AssessmentForm } from "@/components/assessment-form";
import { ChangeHistory } from "@/components/change-history";
import { Shell } from "@/components/shell";
import { Badge, ButtonLink, Card, Disclosure, Empty, PageHeader, Skeleton, Stat, linkStyle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { getMe, isStaff } from "@/lib/session";
import type { Assessment, Athlete, Page, TrainingSession } from "@/lib/types";

async function AssessmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  const assessment = await api<Assessment>(`/assessments/${id}`);
  const staff = isStaff(me);
  const [athlete, all, session, original] = await Promise.all([
    api<Athlete>(`/athletes/${assessment.athleteId}`),
    api<Page<Assessment>>(`/assessments?athleteId=${assessment.athleteId}&includeSuperseded=true&limit=100`),
    staff && assessment.sessionId ? api<TrainingSession>(`/sessions/${assessment.sessionId}`) : Promise.resolve(null),
    assessment.supersedesId ? api<Assessment>(`/assessments/${assessment.supersedesId}`) : Promise.resolve(null),
  ]);
  const correction = all.items.find((a) => a.supersedesId === assessment.id);
  const metrics = Object.entries(assessment.metrics);

  return (
    <>
      <PageHeader
        title={`${assessment.category[0].toUpperCase()}${assessment.category.slice(1)} assessment`}
        back={{ href: "/assessments", label: "Assessments" }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {staff ? (
              <Link href={`/athletes/${athlete.id}`} className={linkStyle}>
                {athlete.firstName} {athlete.lastName}
              </Link>
            ) : (
              `${athlete.firstName} ${athlete.lastName}`
            )}
            · {formatDate(assessment.assessedOn)}
            {assessment.supersedesId && <Badge value="correction" tone="amber" />}
            {correction && <Badge value="corrected" tone="gray" />}
          </span>
        }
      />

      {correction && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          This assessment was corrected.{" "}
          <Link href={`/assessments/${correction.id}`} className="font-medium underline">
            View the correction
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Overall score" value={assessment.overallScore ? `${assessment.overallScore}/10` : "—"} />
            <Stat label="Recorded" value={formatDate(assessment.createdAt.slice(0, 10))} hint={formatDateTime(assessment.createdAt)} />
          </div>
          <Card title="Measurements">
            {metrics.length === 0 ? (
              <Empty>No measurements recorded.</Empty>
            ) : (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {metrics.map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <dt className="text-xs text-slate-500 capitalize">{k.replaceAll("_", " ")}</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
          {assessment.notes && (
            <Card title="Notes">
              <p className="text-sm whitespace-pre-line text-slate-600 dark:text-slate-400">{assessment.notes}</p>
            </Card>
          )}
          {staff && !correction && (
            <Disclosure label="Correct this assessment">
              <AssessmentForm athleteId={athlete.id} previous={assessment} />
            </Disclosure>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Details">
            <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
              <dt className="text-slate-500">Session</dt>
              <dd>
                {session ? (
                  <Link href={`/sessions/${session.id}`} className={linkStyle}>
                    {session.title}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-slate-500">Corrects</dt>
              <dd>
                {original ? (
                  <Link href={`/assessments/${original.id}`} className={linkStyle}>
                    Original from {formatDate(original.assessedOn)}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </dl>
          </Card>
          {staff && <ButtonLink href={`/athletes/${athlete.id}`}>Open athlete profile</ButtonLink>}
          <ChangeHistory entity="performance_assessments" entityId={assessment.id} />
        </div>
      </div>
    </>
  );
}

export default function AssessmentPage(props: PageProps<"/assessments/[id]">) {
  return (
    <Shell>
      <Suspense fallback={<Skeleton rows={6} />}>
        <AssessmentDetail params={props.params} />
      </Suspense>
    </Shell>
  );
}

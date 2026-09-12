/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import { qaDefectCollection } from '@platform/db/collections'
import { and, eq, ilike, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output type  (mirrors DefectRow from defect-tracker.ts)
// ---------------------------------------------------------------------------

export interface AdminDefectRow {
  id: string
  testCaseId: string
  runId: string
  title: string
  description: string
  status: string
  priority: string
  buildFound: string | null
  buildFixed: string | null
  fixNote: string | null
  resolvedAt: Date | null
  retestRunId: string | null
  testerName: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface FetchDefectsProps {
  searchQuery?: string
  statusFilter?: string
  priorityFilter?: string
}

// ---------------------------------------------------------------------------
// fetchDefects
// ---------------------------------------------------------------------------

export const fetchDefects = ({
  searchQuery,
  statusFilter,
  priorityFilter,
}: FetchDefectsProps = {}) => {
  const hasFilter = !!(searchQuery || statusFilter || priorityFilter)

  // ── All defects ───────────────────────────────────────────────────────
  const resultAll = useLiveQuery(
    q =>
      q
        .from({ defect: qaDefectCollection })
        .orderBy(({ defect }) => (defect as any).createdAt, 'desc')
        .select(({ defect }) => ({
          id: defect.id,
          testCaseId: defect.testCaseId,
          runId: defect.runId,
          title: defect.title,
          description: defect.description,
          status: defect.status as string,
          priority: defect.priority as string,
          buildFound: defect.buildFound ?? null,
          buildFixed: defect.buildFixed ?? null,
          fixNote: defect.fixNote ?? null,
          resolvedAt: defect.resolvedAt ?? null,
          retestRunId: defect.retestRunId ?? null,
          testerName: null as null,
          createdAt: (defect as any).createdAt ?? null,
          updatedAt: (defect as any).updatedAt ?? null,
        })),
    [],
  )

  // ── With filters ──────────────────────────────────────────────────────
  const resultFiltered = useLiveQuery(
    q =>
      q
        .from({ defect: qaDefectCollection })
        .where(({ defect }) =>
          and(
            searchQuery
              ? ilike(defect.title, `%${searchQuery}%`)
              : undefined,
            statusFilter
              ? eq(defect.status as any, statusFilter as any)
              : undefined,
            priorityFilter
              ? eq(defect.priority as any, priorityFilter as any)
              : undefined,
          ),
        )
        .orderBy(({ defect }) => (defect as any).createdAt, 'desc')
        .select(({ defect }) => ({
          id: defect.id,
          testCaseId: defect.testCaseId,
          runId: defect.runId,
          title: defect.title,
          description: defect.description,
          status: defect.status as string,
          priority: defect.priority as string,
          buildFound: defect.buildFound ?? null,
          buildFixed: defect.buildFixed ?? null,
          fixNote: defect.fixNote ?? null,
          resolvedAt: defect.resolvedAt ?? null,
          retestRunId: defect.retestRunId ?? null,
          testerName: null as null,
          createdAt: (defect as any).createdAt ?? null,
          updatedAt: (defect as any).updatedAt ?? null,
        })),
    [searchQuery, statusFilter, priorityFilter],
  )

  const raw = hasFilter ? resultFiltered : resultAll

  // ── Post-query: cast Date fields ──────────────────────────────────────
  const data: AdminDefectRow[] = (raw.data ?? []).map(d => {
    const r = d as any
    return {
      id: r.id ?? '',
      testCaseId: r.testCaseId ?? '',
      runId: r.runId ?? '',
      title: r.title ?? '',
      description: r.description ?? '',
      status: r.status ?? '',
      priority: r.priority ?? '',
      buildFound: r.buildFound ?? null,
      buildFixed: r.buildFixed ?? null,
      fixNote: r.fixNote ?? null,
      resolvedAt: r.resolvedAt instanceof Date ? r.resolvedAt : null,
      retestRunId: r.retestRunId ?? null,
      testerName: r.testerName ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt : null,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt : null,
    }
  })

  // Collect distinct statuses for filter dropdown
  const distinctStatuses = [
    ...new Set((resultAll.data ?? []).map(d => (d as any).status as string)),
  ].filter(Boolean).sort()

  return {
    data,
    distinctStatuses,
    isLoading: raw.isLoading,
    total: data.length,
  }
}

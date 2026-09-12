/**
 * /qa/defects — Defect list
 *
 * Local-first via fetchDefects hook (qaDefectCollection).
 * Clicking a row opens the defect detail in an Aside drawer.
 */

import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { Badge } from '@platform/components/ui/badge'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import type { DefectPriority, DefectStatus } from '@/lib/qa/defect-tracker'
import type { AdminDefectRow } from '@/lib/queries/fetch-defects'
import { fetchDefects } from '@/lib/queries/fetch-defects'
import { closeDefectAside, DEFECT_ASIDE_ID, showDefectAside } from './-components/defect-aside'
import { DefectDetailAside } from './-components/defect-detail-aside'

export const Route = createFileRoute('/(private)/(dashboard)/qa/defects/')({
  component: DefectsPage,
})

// ---------------------------------------------------------------------------
// Color maps (unchanged)
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<DefectStatus, string> = {
  OPEN: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  INVESTIGATING: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
  FIXED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  RETEST_REQUIRED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  RETEST_FAILED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  WONT_FIX: 'bg-muted text-muted-foreground border-border',
}

const STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN: 'Open',
  INVESTIGATING: 'Investigating',
  FIXED: 'Fixed',
  RETEST_REQUIRED: 'Retest Required',
  RETEST_FAILED: 'Retest Failed',
  RESOLVED: 'Resolved',
  WONT_FIX: "Won't Fix",
}

const PRIORITY_COLORS: Record<DefectPriority, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-white',
  LOW: 'bg-blue-500 text-white',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DefectsPage() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ── Hook call — local-first ───────────────────────────────────────────
  const { data, isLoading } = fetchDefects({
    ...(search ? { searchQuery: search } : {}),
  })

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminDefectRow>(
        (h: any) =>
          [
            h.display({
              id: 'number',
              maxSize: 40,
              header: 'No.',
              cell: (info: any) => <span className='text-xs font-mono text-muted-foreground/50'>{(info.row.index + 1).toString().padStart(2, '0')}</span>,
            }),

            h.accessor('priority', {
              header: 'Priority',
              maxSize: 90,
              cell: (info: any) => {
                const p = info.getValue() as DefectPriority
                return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[p] ?? ''}`}>{p}</span>
              },
            }),

            h.accessor('testCaseId', {
              header: 'Test',
              maxSize: 120,
              cell: (info: any) => <span className='text-xs font-mono text-muted-foreground'>{info.getValue()}</span>,
            }),

            h.accessor('title', {
              header: 'Title',
              cell: (info: any) => <span className='text-sm font-medium text-foreground'>{info.getValue()}</span>,
            }),

            h.accessor('status', {
              header: 'Status',
              maxSize: 140,
              cell: (info: any) => {
                const s = info.getValue() as DefectStatus
                return (
                  <Badge variant='outline' className={`text-xs ${STATUS_COLORS[s] ?? ''}`}>
                    {STATUS_LABELS[s] ?? s}
                  </Badge>
                )
              },
            }),

            h.accessor('testerName', {
              header: 'Filed by',
              maxSize: 130,
              cell: (info: any) => <span className='text-xs text-muted-foreground'>{info.getValue() ?? '—'}</span>,
            }),

            h.accessor('createdAt', {
              header: 'Date',
              maxSize: 110,
              cell: (info: any) => {
                const v = info.getValue() as Date | null
                return <span className='text-xs text-muted-foreground'>{v ? v.toLocaleDateString() : '—'}</span>
              },
            }),
          ] as ColumnDef<AdminDefectRow, unknown>[],
      ),
    [],
  )

  const handleSelectRow = useCallback((defect: AdminDefectRow) => {
    setSelectedId(defect.id)
    showDefectAside(
      <DefectDetailAside
        defectId={defect.id}
        open
        onClose={() => {
          setSelectedId(null)
          closeDefectAside()
        }}
        onStatusChange={() => {
          /* collection re-syncs automatically */
        }}
      />,
    )
  }, [])

  return (
    <div className='flex h-full overflow-hidden'>
      {/* ── Main content ── */}
      <div className='flex-1 min-w-0 flex flex-col h-full'>
        {/* Page header */}
        <div className='flex items-center justify-between px-4 py-3 border-b shrink-0'>
          <div>
            <h1 className='text-lg font-semibold'>Defects</h1>
            <p className='text-xs text-muted-foreground'>Track and manage QA defects across all test cases.</p>
          </div>
          <span className='text-xs text-muted-foreground'>{isLoading ? 'Loading…' : `${data.length} total`}</span>
        </div>

        {/* Table */}
        <div className='flex-1 min-h-0 p-4 flex flex-col'>
          <TableView<AdminDefectRow>
            data={data}
            isFetching={isLoading}
            columns={columns}
            emptyMessage='No defects found.'
            searchable={{ searchValue: search, onSearchChange: setSearch }}
            selectableRow={{
              onClick: handleSelectRow,
              isSelected: (d: AdminDefectRow) => d.id === selectedId,
            }}
          />
        </div>
      </div>

      {/* ── Aside host ── */}
      <MountManager id={DEFECT_ASIDE_ID} />
    </div>
  )
}

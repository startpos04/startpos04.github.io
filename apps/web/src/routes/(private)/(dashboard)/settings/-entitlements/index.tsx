/**
 * settings/entitlements — Branch-level capability configuration
 *
 * Layout mirrors the admin /config panel:
 *   Category badge header
 *     └── Bordered list of capability rows
 *           Capability header: label + key + branch on/off toggle
 *           Config rows beneath: editable key/value fields (from Configuration table)
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent } from '@platform/components/ui/card'
import { Input } from '@platform/components/ui/input'
import { Progress } from '@platform/components/ui/progress'
import { Skeleton } from '@platform/components/ui/skeleton'
import { Switch } from '@platform/components/ui/switch'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, ChevronRight, Info, Lock, ScanBarcode, TrendingUp, Vault } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { CapabilityConfigRow, EntitlementDetail } from '@/lib/server-fn/fetch-entitlement-details'
import { fetchEntitlementDetails } from '@/lib/server-fn/fetch-entitlement-details'
import { toggleBranchCapability } from '@/lib/server-fn/toggle-branch-capability'
import { updateCapabilityConfig } from '@/lib/server-fn/update-capability-config'
import { updateHardwareCapabilityConfig } from '@/lib/server-fn/update-hardware-capability-config'

// @ts-expect-error - Route type generation issue
export const Route = createFileRoute('/(private)/(dashboard)/settings/-entitlements')({
  component: EntitlementsPage,
})

// ---------------------------------------------------------------------------
// Category colour map
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  SALES: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  INVENTORY: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  PROCUREMENT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  FINANCE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  OPERATIONS: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400',
  CRM: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
  COMPLIANCE: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400',
  MULTI_BRANCH: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400',
  REPORTING: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400',
  PLATFORM: 'bg-muted text-muted-foreground',
}

const CATEGORY_LABELS: Record<string, string> = {
  SALES: 'Sales',
  INVENTORY: 'Inventory',
  PROCUREMENT: 'Procurement',
  FINANCE: 'Finance',
  OPERATIONS: 'Operations',
  CRM: 'Customers',
  COMPLIANCE: 'Compliance',
  MULTI_BRANCH: 'Multi-branch',
  REPORTING: 'Reports',
  PLATFORM: 'Platform',
}

// ---------------------------------------------------------------------------
// Hardware config key → icon map
// ---------------------------------------------------------------------------

const HARDWARE_ICONS: Record<string, React.ReactNode> = {
  barcode_scanner_enabled: <ScanBarcode className='h-3.5 w-3.5 text-muted-foreground shrink-0' />,
  cash_drawer_enabled: <Vault className='h-3.5 w-3.5 text-muted-foreground shrink-0' />,
}

// ---------------------------------------------------------------------------
// Config field row — inline editable
// Hardware configs (isHardwareConfig = true) call updateHardwareCapabilityConfig.
// Standard configs call updateCapabilityConfig (Configuration table).
// ---------------------------------------------------------------------------

interface ConfigFieldRowProps {
  cfg: CapabilityConfigRow
  /** capabilityId is needed for hardware configs so we know which capability owns them */
  capabilityId: string
  onSaved: () => void
}

function ConfigFieldRow({ cfg, capabilityId, onSaved }: ConfigFieldRowProps) {
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const current = draft !== undefined ? draft : cfg.value
  const isDirty = draft !== undefined && draft !== cfg.value

  const save = async (value: string) => {
    setSaving(true)
    try {
      let result: { success: boolean; message?: string }

      if (cfg.isHardwareConfig) {
        // Hardware config → writes to capability_configurations table
        result = await updateHardwareCapabilityConfig({
          data: {
            capabilityId,
            key: cfg.key,
            value,
            dataType: cfg.dataType as 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON',
            scope: 'BRANCH',
          },
        })
      } else {
        // Standard config → writes to configurations table
        result = await updateCapabilityConfig({
          data: { key: cfg.key, value, scope: cfg.scope as 'BRANCH' | 'BUSINESS' },
        })
      }

      if (result.success) {
        setDraft(undefined)
        toast.success(`${cfg.label} updated`)
        onSaved()
      } else {
        toast.error(result.message ?? 'Failed to save')
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const isHardware = cfg.isHardwareConfig === true

  return (
    <div
      className={`flex items-start gap-3 px-4 py-2.5 transition-colors border-t ${
        isHardware ? 'bg-blue-50/40 dark:bg-blue-950/10 hover:bg-blue-50/70 dark:hover:bg-blue-950/20' : 'bg-muted/20 hover:bg-muted/30'
      }`}
    >
      {/* Indent indicator */}
      <div className='flex items-center shrink-0 mt-1 pl-3'>
        {isHardware && HARDWARE_ICONS[cfg.key] ? HARDWARE_ICONS[cfg.key] : <ChevronRight className='h-3 w-3 text-muted-foreground/40' />}
      </div>

      {/* Label + description + badges */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <p className='text-xs font-medium leading-none'>{cfg.label}</p>
          <code className='text-[9px] font-mono text-muted-foreground'>{cfg.key}</code>
          {isHardware && (
            <Badge variant='outline' className='text-[9px] py-0 h-4 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800'>
              hardware
            </Badge>
          )}
          <Badge variant='outline' className='text-[9px] font-mono py-0 h-4'>
            {cfg.dataType}
          </Badge>
          {cfg.isOverridden ? (
            <Badge variant='outline' className='text-[9px] py-0 h-4 text-primary border-primary/30'>
              custom
            </Badge>
          ) : (
            <Badge variant='outline' className='text-[9px] py-0 h-4 text-muted-foreground'>
              default
            </Badge>
          )}
        </div>
        {cfg.description && <p className='text-[10px] text-muted-foreground mt-0.5'>{cfg.description}</p>}
      </div>

      {/* Editable value */}
      <div className='flex items-center gap-1.5 shrink-0'>
        {cfg.dataType === 'BOOLEAN' ? (
          <Switch size='sm' checked={current === 'true'} onCheckedChange={v => save(v ? 'true' : 'false')} disabled={saving} aria-label={cfg.label} />
        ) : (
          <>
            <Input
              value={current}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') save(current)
              }}
              className={`h-7 w-36 text-xs font-mono ${isDirty ? 'border-primary ring-1 ring-primary/30' : ''}`}
              disabled={saving}
              placeholder={cfg.defaultValue}
            />
            {isDirty && (
              <>
                <Button size='sm' className='h-7 text-xs px-2.5' disabled={saving} onClick={() => save(current)}>
                  {saving ? '…' : 'Save'}
                </Button>
                <Button size='sm' variant='ghost' className='h-7 w-7 p-0' onClick={() => setDraft(undefined)}>
                  ✕
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Capability row — header + config fields
// ---------------------------------------------------------------------------

interface CapabilityRowProps {
  capability: EntitlementDetail
  onToggle: (key: string, enabled: boolean) => void
  toggling: boolean
  onConfigSaved: () => void
}

function CapabilityRow({ capability, onToggle, toggling, onConfigSaved }: CapabilityRowProps) {
  const usagePct =
    capability.usageLimit !== null && capability.currentUsage !== null ? Math.min((capability.currentUsage / capability.usageLimit) * 100, 100) : null

  return (
    <div>
      {/* Capability header */}
      <div className='flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/20 transition-colors'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <p className='text-sm font-medium'>{capability.featureLabel}</p>
            <code className='text-[10px] font-mono text-muted-foreground'>{capability.capabilityKey}</code>
            {capability.isOperational && (
              <Badge variant='outline' className='text-[9px] py-0 h-4 text-orange-600 border-orange-200'>
                operational
              </Badge>
            )}
            {capability.hasOverride && (
              <Badge variant='outline' className='text-[9px] py-0 h-4 text-blue-600 border-blue-200'>
                override
              </Badge>
            )}
          </div>

          {capability.featureDescription && <p className='text-xs text-muted-foreground mt-0.5 line-clamp-1'>{capability.featureDescription}</p>}

          {/* Cross-reference: compliance-related capabilities link to the Compliance tab */}
          {(capability.capabilityKey === 'COMPLETE_CHECKOUT' || capability.capabilityKey === 'PRINT_RECEIPT') && (
            <p className='text-[10px] text-muted-foreground mt-1'>
              Tax and receipt settings are managed in the{' '}
              <a href='/settings?tab=Compliance' className='text-primary underline-offset-2 hover:underline'>
                Compliance tab
              </a>
              .
            </p>
          )}

          {capability.usageLimit !== null && usagePct !== null && (
            <div className='flex items-center gap-2 mt-1.5'>
              <Progress value={usagePct} className='h-1 flex-1 max-w-32' />
              <span className='text-[10px] tabular-nums text-muted-foreground'>
                {capability.currentUsage ?? 0} / {capability.usageLimit.toLocaleString()}
              </span>
              {usagePct >= 90 && <AlertCircle className='h-3 w-3 text-amber-500' />}
            </div>
          )}
        </div>

        {capability.isBranchLevel ? (
          <div className='flex flex-col items-center gap-0.5 shrink-0'>
            <span className='text-[9px] text-muted-foreground'>{capability.isEnabledAtBranch ? 'Enabled' : 'Disabled'}</span>
            <Switch
              size='sm'
              checked={capability.isEnabledAtBranch}
              disabled={toggling}
              onCheckedChange={enabled => onToggle(capability.capabilityKey, enabled)}
              aria-label={`Toggle ${capability.featureLabel}`}
            />
          </div>
        ) : (
          <Badge variant='outline' className='text-[9px] py-0 h-5 text-muted-foreground shrink-0'>
            Business-wide
          </Badge>
        )}
      </div>

      {/* Config rows */}
      {capability.configs.map(cfg => (
        <ConfigFieldRow key={cfg.key} cfg={cfg} capabilityId={capability.capabilityKey} onSaved={onConfigSaved} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function EntitlementsPage() {
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['entitlement-details'],
    queryFn: () => fetchEntitlementDetails(),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => toggleBranchCapability({ data: { capabilityKey: key as never, enabled } }),
    onSuccess: (result, vars) => {
      if (result.success) {
        qc.invalidateQueries({ queryKey: ['entitlement-details'] })
        toast.success(vars.enabled ? 'Capability enabled' : 'Capability disabled')
      } else {
        toast.error(result.message ?? 'Failed to update')
      }
    },
    onError: () => toast.error('Failed to update capability'),
  })

  const handleConfigSaved = () => {
    qc.invalidateQueries({ queryKey: ['entitlement-details'] })
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-4 px-4 py-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-14 w-full' />
        {[0, 1, 2].map(i => (
          <div key={i} className='space-y-1.5'>
            <Skeleton className='h-5 w-24' />
            <Skeleton className='h-20 w-full' />
          </div>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className='flex items-center justify-center h-full p-6'>
        <Card>
          <CardContent className='pt-6'>
            <p className='text-muted-foreground'>Failed to load capability information</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { planName, status, billingModel, includedTxPerMonth, txUsedThisPeriod } = data

  return (
    <div className='w-full bg-background flex flex-col gap-4 px-4 pb-8'>
      {/* Page header */}
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Capabilities</h1>
        <p className='text-sm text-muted-foreground mt-1'>Enable or disable features for this branch and edit their configuration.</p>
      </div>

      {/* Subscription info bar */}
      <div className='flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card text-xs'>
        <div className='flex items-center gap-1.5'>
          <span className='font-medium text-muted-foreground'>Plan:</span>
          <Badge variant='default' className='text-xs'>
            {planName ?? 'No Plan'}
          </Badge>
        </div>
        <div className='h-3 w-px bg-border' />
        <div className='flex items-center gap-1.5'>
          <span className='font-medium text-muted-foreground'>Status:</span>
          <Badge variant={status === 'ACTIVE' || status === 'TRIAL' ? 'default' : 'destructive'} className='text-xs'>
            {status}
          </Badge>
        </div>
        <div className='h-3 w-px bg-border' />
        <div className='flex items-center gap-1.5'>
          <span className='font-medium text-muted-foreground'>Billing:</span>
          <Badge variant='outline' className='text-xs'>
            {billingModel}
          </Badge>
        </div>

        {includedTxPerMonth !== null && includedTxPerMonth !== -1 && (
          <>
            <div className='h-3 w-px bg-border' />
            <div className='flex items-center gap-2 flex-1 min-w-44'>
              <TrendingUp className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
              <span className='font-medium text-muted-foreground'>Transactions:</span>
              <Progress value={(txUsedThisPeriod / includedTxPerMonth) * 100} className='h-1.5 flex-1' />
              <span className='tabular-nums whitespace-nowrap'>
                {txUsedThisPeriod.toLocaleString()} / {includedTxPerMonth.toLocaleString()}
              </span>
            </div>
          </>
        )}
        {includedTxPerMonth === -1 && (
          <>
            <div className='h-3 w-px bg-border' />
            <div className='flex items-center gap-1.5 text-muted-foreground'>
              <Info className='h-3.5 w-3.5' />
              <span>Unlimited transactions</span>
            </div>
          </>
        )}

        <Button variant='outline' size='sm' asChild className='ml-auto h-7 text-xs'>
          <a href='/business/subscription'>View Plans</a>
        </Button>
      </div>

      {/* Category groups */}
      {data.categoryGroups.length === 0 && <p className='text-sm text-muted-foreground text-center py-12'>No capabilities found.</p>}

      {data.categoryGroups.map(group => (
        <div key={group.category}>
          <div className='flex items-center gap-2 mb-2'>
            <Badge variant='outline' className={`text-xs ${CATEGORY_COLORS[group.category] ?? 'bg-muted text-muted-foreground'}`}>
              {CATEGORY_LABELS[group.category] ?? group.category}
            </Badge>
            <span className='text-xs text-muted-foreground'>
              {group.entitlements.length} {group.entitlements.length === 1 ? 'capability' : 'capabilities'}
            </span>
          </div>

          <div className='rounded-lg border overflow-hidden divide-y'>
            {group.entitlements.map(capability => (
              <CapabilityRow
                key={capability.capabilityKey}
                capability={capability}
                onToggle={(key, enabled) => toggleMutation.mutate({ key, enabled })}
                toggling={toggleMutation.isPending}
                onConfigSaved={handleConfigSaved}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Footer — upgrade nudge */}
      <div className='rounded-lg border bg-card p-3 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='rounded-full bg-primary/10 p-1.5 shrink-0'>
            <Lock className='h-4 w-4 text-primary' />
          </div>
          <div>
            <p className='text-xs font-medium'>Need more features or higher limits?</p>
            <p className='text-xs text-muted-foreground'>Upgrade your plan to unlock additional capabilities.</p>
          </div>
        </div>
        <Button variant='outline' size='sm' asChild className='shrink-0'>
          <a href='/business/billing'>View Plans</a>
        </Button>
      </div>
    </div>
  )
}

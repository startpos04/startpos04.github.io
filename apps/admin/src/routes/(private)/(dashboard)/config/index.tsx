/**
 * /config — Feature Flags & System Config
 *
 * Two-tab page:
 *   Features    — toggle isOperational / isSelectableByCustomer per feature
 *   System Config — edit platform-wide ConfigurationDefinition defaults
 */

import Tab from '@platform/components/custom/tab'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Input } from '@platform/components/ui/input'
import { Switch } from '@platform/components/ui/switch'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { createFileRoute } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import type { ConfigDefRow, FeatureRow } from '@/lib/server-fn/platform-config'
import { listConfigDefinitions, listFeatures, updateConfigDefault, updateFeature } from '@/lib/server-fn/platform-config'

export const Route = createFileRoute('/(private)/(dashboard)/config/' as never)({
  component: ConfigPage,
})

// ---------------------------------------------------------------------------
// Category badge colours
// ---------------------------------------------------------------------------
const CATEGORY_COLORS: Record<string, string> = {
  TAX: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  LOCALE: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  OPERATIONAL: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  BILLING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  ADDON_PRICING: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
  COMPOSABLE_PRICING: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400',
  GUIDANCE: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400',
}

const PRICING_CAT_COLORS: Record<string, string> = {
  CORE: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400',
  OPERATIONAL: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  MANAGEMENT: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  INTEGRATION: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  ADVANCED: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
}

// ---------------------------------------------------------------------------
// Features tab
// ---------------------------------------------------------------------------

function FeaturesTab() {
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    listFeatures()
      .then(f => setFeatures(f as FeatureRow[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const filtered = features.filter(
      f => !search.trim() || f.key.toLowerCase().includes(search.toLowerCase()) || f.label.toLowerCase().includes(search.toLowerCase()),
    )
    const map = new Map<string, FeatureRow[]>()
    for (const f of filtered) {
      const cat = f.pricingCategory ?? 'UNCATEGORIZED'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(f)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [features, search])

  const toggle = async (feature: FeatureRow, field: 'isOperational' | 'isSelectableByCustomer') => {
    const newVal = !feature[field]
    setSaving(feature.id + field)
    try {
      await updateFeature({ data: { id: feature.id, [field]: newVal } })
      setFeatures(prev => prev.map(f => (f.id === feature.id ? { ...f, [field]: newVal } : f)))
      toast.success(`"${feature.label}" ${field === 'isOperational' ? 'operational' : 'selectable'} → ${newVal ? 'ON' : 'OFF'}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-16 gap-3 text-muted-foreground px-4'>
        <div className='size-4 border-2 border-primary border-t-transparent rounded-full animate-spin' />
        Loading features…
      </div>
    )
  }

  return (
    <div className='space-y-4 px-4'>
      {/* Search */}
      <div className='relative max-w-sm'>
        <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
        <Input placeholder='Search features…' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9 text-sm' />
      </div>

      {/* Legend */}
      <div className='flex items-center gap-4 text-xs text-muted-foreground'>
        <span className='flex items-center gap-1.5'>
          <span className='inline-block w-7 h-4 rounded bg-muted' /> Operational — blocks POS when subscription lapses
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='inline-block w-7 h-4 rounded bg-muted' /> Selectable — shown in composable pricing calculator
        </span>
      </div>

      {grouped.length === 0 && <p className='text-sm text-muted-foreground text-center py-12'>No features found.</p>}

      {grouped.map(([category, items]) => (
        <div key={category}>
          <div className='flex items-center gap-2 mb-2'>
            <Badge variant='outline' className={`text-xs ${PRICING_CAT_COLORS[category] ?? 'bg-muted text-muted-foreground'}`}>
              {category}
            </Badge>
            <span className='text-xs text-muted-foreground'>{items.length} features</span>
          </div>
          <div className='rounded-lg border overflow-hidden divide-y'>
            {items.map(f => (
              <div key={f.id} className='flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/30 transition-colors'>
                {/* Feature info */}
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium'>{f.label}</p>
                  <p className='text-xs font-mono text-muted-foreground'>{f.key}</p>
                  {f.description && <p className='text-xs text-muted-foreground mt-0.5 truncate'>{f.description}</p>}
                </div>

                {/* Operational toggle */}
                <div className='flex flex-col items-center gap-0.5 shrink-0'>
                  <span className='text-[10px] text-muted-foreground'>Operational</span>
                  <Switch checked={f.isOperational} disabled={saving === f.id + 'isOperational'} onCheckedChange={() => toggle(f, 'isOperational')} />
                </div>

                {/* Selectable toggle */}
                <div className='flex flex-col items-center gap-0.5 shrink-0'>
                  <span className='text-[10px] text-muted-foreground'>Selectable</span>
                  <Switch
                    checked={f.isSelectableByCustomer}
                    disabled={saving === f.id + 'isSelectableByCustomer'}
                    onCheckedChange={() => toggle(f, 'isSelectableByCustomer')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// System Config tab
// ---------------------------------------------------------------------------

function SystemConfigTab() {
  const [defs, setDefs] = useState<ConfigDefRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    listConfigDefinitions()
      .then(d => setDefs(d as ConfigDefRow[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const filtered = defs.filter(
      d => !search.trim() || d.key.toLowerCase().includes(search.toLowerCase()) || d.label.toLowerCase().includes(search.toLowerCase()),
    )
    const map = new Map<string, ConfigDefRow[]>()
    for (const d of filtered) {
      const cat = d.category
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(d)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [defs, search])

  const getEditValue = (def: ConfigDefRow) => (editing[def.key] !== undefined ? editing[def.key] : def.defaultValue)

  const handleSave = async (def: ConfigDefRow) => {
    const newVal = editing[def.key]
    if (newVal === undefined || newVal === def.defaultValue) {
      setEditing(prev => {
        const n = { ...prev }
        delete n[def.key]
        return n
      })
      return
    }
    setSaving(def.key)
    try {
      await updateConfigDefault({ data: { key: def.key, defaultValue: newVal } })
      setDefs(prev => prev.map(d => (d.key === def.key ? { ...d, defaultValue: newVal } : d)))
      setEditing(prev => {
        const n = { ...prev }
        delete n[def.key]
        return n
      })
      toast.success(def.label + ' updated.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-16 gap-3 text-muted-foreground px-4'>
        <div className='size-4 border-2 border-primary border-t-transparent rounded-full animate-spin' />
        Loading config…
      </div>
    )
  }

  return (
    <div className='space-y-4 px-4'>
      {/* Search */}
      <div className='relative max-w-sm'>
        <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
        <Input placeholder='Search config keys…' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9 text-sm' />
      </div>

      {grouped.length === 0 && <p className='text-sm text-muted-foreground text-center py-12'>No config definitions found.</p>}

      {grouped.map(([category, items]) => (
        <div key={category}>
          <div className='flex items-center gap-2 mb-2'>
            <Badge variant='outline' className={`text-xs ${CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground'}`}>
              {category}
            </Badge>
            <span className='text-xs text-muted-foreground'>{items.length} keys</span>
          </div>

          <div className='rounded-lg border overflow-hidden divide-y'>
            {items.map(def => {
              const val = getEditValue(def)
              const isDirty = editing[def.key] !== undefined && editing[def.key] !== def.defaultValue

              return (
                <div key={def.key} className='flex items-start gap-4 px-4 py-3 bg-card hover:bg-muted/30 transition-colors'>
                  {/* Key info */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <p className='text-sm font-medium'>{def.label}</p>
                      <Badge variant='outline' className='text-[10px] font-mono py-0 h-4'>
                        {def.dataType}
                      </Badge>
                      {def.required && (
                        <Badge variant='outline' className='text-[10px] py-0 h-4 text-red-600 border-red-200'>
                          required
                        </Badge>
                      )}
                    </div>
                    <p className='text-xs font-mono text-muted-foreground'>{def.key}</p>
                    {def.description && <p className='text-xs text-muted-foreground mt-0.5 line-clamp-2'>{def.description}</p>}
                  </div>

                  {/* Editable default value */}
                  <div className='flex items-center gap-2 shrink-0'>
                    <Input
                      value={val}
                      onChange={e => setEditing(prev => ({ ...prev, [def.key]: e.target.value }))}
                      className={`h-8 w-40 text-xs font-mono ${isDirty ? 'border-primary ring-1 ring-primary/30' : ''}`}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSave(def)
                      }}
                    />
                    {isDirty && (
                      <>
                        <Button size='sm' className='h-8 text-xs px-3' disabled={saving === def.key} onClick={() => handleSave(def)}>
                          {saving === def.key ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='h-8 text-xs px-2'
                          onClick={() =>
                            setEditing(prev => {
                              const n = { ...prev }
                              delete n[def.key]
                              return n
                            })
                          }
                        >
                          ✕
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export default function ConfigPage() {
  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_CONFIG}>
      <div className='w-full h-screen bg-background overflow-hidden min-h-0 flex-1'>
        <div className='h-full flex flex-col overflow-hidden bg-background/50 space-y-2'>
          {/* Header */}
          <div className='px-4'>
            <h1 className='text-3xl font-bold tracking-tight text-foreground'>Platform Config</h1>
            <p className='text-muted-foreground text-sm mt-1'>Manage feature flags and platform-wide configuration defaults.</p>
          </div>

          {/* Tabs */}
          <div className='flex-1 min-h-0 overflow-y-auto'>
            <Tab
              defaultValue='Features'
              tabs={[
                { label: 'Features', Component: FeaturesTab },
                { label: 'System Config', Component: SystemConfigTab },
              ]}
              tabClass='px-4'
            />
          </div>
        </div>
      </div>
    </RequireAdminPermission>
  )
}

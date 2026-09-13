import { MoneyInput } from '@platform/components/custom/form/money-input'
import { SelectInput } from '@platform/components/custom/form/select-input'
import { TextInput } from '@platform/components/custom/form/text-input'
import { AlertPrompt } from '@platform/components/custom/prompt/alert-prompt'
import { LoadingPrompt } from '@platform/components/custom/prompt/loading-prompt'
import { Button } from '@platform/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@platform/components/ui/collapsible'
import { Dialog, DialogContent } from '@platform/components/ui/dialog'
import { useAppForm } from '@platform/hooks/form'
import MountManager from '@platform/lib/mount-manager'
import { cn } from '@platform/lib/utils'
import { useStore } from '@tanstack/react-form'
import { Banknote, ChevronDown, CreditCard, Plus, Trash2, UserCheck, Vault, X } from 'lucide-react'
import { PaymentMethod } from 'prisma/generated/prisma/enums'
import { useEffect, useState } from 'react'
import z from 'zod'
import { getBluetoothPrinter } from '@/lib/bluetooth-printer'
import { PriceEngine } from '@/lib/conversion/price-engine'

export const PAYMENT_PLATFORMS = {
  CASH: { id: 'cash', name: 'Cash', type: PaymentMethod.CASH },
  GCASH: { id: 'gcash', name: 'GCash', type: PaymentMethod.E_WALLET },
  MAYA: { id: 'maya', name: 'Maya', type: PaymentMethod.E_WALLET },
  BDO: { id: 'bdo_card', name: 'BDO Credit/Debit', type: PaymentMethod.CARD },
} as const

export type PaymentPlatformId = (typeof PAYMENT_PLATFORMS)[keyof typeof PAYMENT_PLATFORMS]['id']

const paymentLineSchema = z
  .object({
    id: z.string(),
    method: z.enum(PaymentMethod),
    platform: z.string(),
    tendered: z.number().min(0, 'Tendered must be positive'),
    referenceNo: z.string().optional(),
    discount: z.number().optional(),
    scPwdDiscount: z.number().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.platform !== 'cash' && (!val.referenceNo || val.referenceNo.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Reference number is required', path: ['referenceNo'] })
    }
  })

export type PaymentLine = z.infer<typeof paymentLineSchema>

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  total: number
  onConfirm: (payments: PaymentLine[], compliance: { scPwdName?: string; scPwdIdNumber?: number; scPwdDiscount?: number }) => void
  onSave: () => void
  disabled?: boolean
  /**
   * When true the system requires a Bluetooth cash drawer to be connected
   * before checkout can complete.
   * Set this from the branch's cash_drawer_enabled capability config.
   */
  cashDrawerRequired?: boolean
  /**
   * Whether the PRINT_RECEIPT capability is granted for this session.
   * The cash drawer status indicator is hidden when receipt printing is disabled
   * because the Bluetooth printer is only relevant when printing is active.
   */
  canPrintReceipt?: boolean
}

const BILL_DENOMINATIONS = [20, 50, 100, 200, 500, 1000]
const COIN_DENOMINATIONS = [1, 5, 10, 20]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'bdo_card', label: '💳 BDO Card' },
  { value: 'gcash', label: '📱 GCash' },
  { value: 'maya', label: '💳 Maya' },
]

// ---------------------------------------------------------------------------
// HardwareCashDrawerStatus — reactive status pill for cash drawer connection.
// Polls every second so it reacts when the cashier connects mid-session.
// ---------------------------------------------------------------------------

function HardwareCashDrawerStatus() {
  const [connected, setConnected] = useState(() => getBluetoothPrinter().isConnected())

  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(getBluetoothPrinter().isConnected())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium',
        connected
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
      )}
    >
      <Vault className='w-3.5 h-3.5 shrink-0' />
      <span>{connected ? 'Cash drawer connected' : 'Cash drawer required — connect Bluetooth printer'}</span>
    </div>
  )
}

export function PaymentDialog({ open, onClose, total, onConfirm, cashDrawerRequired = false, canPrintReceipt = true }: PaymentDialogProps) {
  // Pure UI state — not form data
  const [scPwdOpen, setScPwdOpen] = useState(false)
  const [activeRowIndex, setActiveRowIndex] = useState(0)

  // ---------------------------------------------------------------------------
  // Hardware guard — cash drawer only.
  // Barcode scanner (HID keyboard-emulation) has no connection state to check,
  // so enabling it never blocks checkout — it simply activates the scan feature.
  // ---------------------------------------------------------------------------
  const checkHardware = (): boolean => {
    if (cashDrawerRequired) {
      const printer = getBluetoothPrinter()
      if (!printer.isConnected()) {
        MountManager.show(AlertPrompt, {
          title: 'Cash Drawer Not Connected',
          description: (
            <div className='space-y-2'>
              <p>Cash drawer is required for checkout at this branch, but no Bluetooth printer is connected.</p>
              <p>Please connect your Bluetooth printer/cash drawer first, then try again.</p>
            </div>
          ),
          btnText: 'OK',
        })
        return false
      }
    }

    return true
  }

  const form = useAppForm({
    defaultValues: {
      payments: [{ id: '1', method: PaymentMethod.CASH, platform: 'cash', tendered: 0, referenceNo: '' }] as PaymentLine[],
      // SC/PWD fields live in the form store so they reset with form.reset()
      scPwdName: '',
      scPwdId: '',
      scPwdDiscount: 0, // stored in cents
    },
    validators: {
      onChange: ({ value }) => {
        const scPwdDiscountCents = value.scPwdDiscount ?? 0
        const effectiveTotal = Math.max(total - scPwdDiscountCents, 0)
        const totalPaid = value.payments.reduce((s, p) => s + p.tendered, 0)
        if (totalPaid < effectiveTotal) return 'Total payment must cover the bill amount'
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      // Hardware enforcement — checked before any transaction is created
      if (!checkHardware()) return

      const scPwdDiscountCents = value.scPwdDiscount ?? 0

      const modalId = await MountManager.show(LoadingPrompt, {
        icon: <Banknote className='h-10! w-10! text-emerald-500 animate-pulse' />,
        title: 'Processing Payment',
        description: 'Recording the transaction. Please wait...',
      })

      await onConfirm(value.payments, {
        ...(scPwdOpen && value.scPwdName.trim() ? { scPwdName: value.scPwdName.trim() } : {}),
        ...(scPwdOpen && value.scPwdId.trim() ? { scPwdIdNumber: Number(value.scPwdId.trim()) } : {}),
        ...(scPwdOpen && scPwdDiscountCents > 0 ? { scPwdDiscount: scPwdDiscountCents } : {}),
      })

      MountManager.close(modalId)
      onClose()
      form.reset()
    },
  })

  // Read payment array for imperative handlers (addToActive, clearActive, setExact)
  // form.Subscribe drives the JSX; useStore is only for these handler closures
  const paymentsState = useStore(form.store, s => s.values.payments)

  const clampedActiveIndex = Math.min(activeRowIndex, Math.max(0, paymentsState.length - 1))

  const addToActive = (cents: number) => {
    const updated = paymentsState.map((p, i) => (i === clampedActiveIndex ? { ...p, tendered: p.tendered + cents } : p))
    form.setFieldValue('payments', updated)
    form.validate('change')
  }

  const clearActive = () => {
    const updated = paymentsState.map((p, i) => (i === clampedActiveIndex ? { ...p, tendered: 0 } : p))
    form.setFieldValue('payments', updated)
    form.validate('change')
  }

  const setExact = (effectiveTotal: number) => {
    const others = paymentsState.filter((_, i) => i !== clampedActiveIndex).reduce((s, p) => s + p.tendered, 0)
    const needed = Math.max(effectiveTotal - others, 0)
    const updated = paymentsState.map((p, i) => (i === clampedActiveIndex ? { ...p, tendered: needed } : p))
    form.setFieldValue('payments', updated)
    form.validate('change')
  }

  const handleClose = () => {
    onClose()
    setScPwdOpen(false)
    setActiveRowIndex(0)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className='p-0 bg-background overflow-hidden rounded-2xl border border-border/60 shadow-2xl
                   w-full max-w-[95vw] sm:max-w-4xl
                   max-h-[95dvh] sm:max-h-[92vh]
                   flex flex-col sm:flex-row [&>button]:hidden gap-0'
        onEscapeKeyDown={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
      >
        {/* ── LEFT COL — payment inputs + denominations ────────────── */}
        <div className='flex-1 flex flex-col overflow-hidden min-h-0 border-b sm:border-b-0 sm:border-r border-border/60'>
          <div className='flex items-center justify-between px-5 pt-4 pb-3 shrink-0'>
            <form.Subscribe selector={s => s.values.payments}>
              {payments => (
                <span className='text-xs font-bold text-muted-foreground uppercase tracking-widest'>
                  {payments.length > 1 ? `Paying — Row ${clampedActiveIndex + 1} active` : 'How are they paying?'}
                </span>
              )}
            </form.Subscribe>
            <form.Subscribe selector={s => s.values.payments}>
              {payments => (
                <button
                  type='button'
                  onClick={() => {
                    const remainingDue = Math.max(total - (form.getFieldValue('scPwdDiscount') ?? 0) - payments.reduce((s, p) => s + p.tendered, 0), 0)
                    form.pushFieldValue('payments', {
                      id: crypto.randomUUID(),
                      method: PaymentMethod.CARD,
                      platform: 'bdo_card',
                      tendered: remainingDue,
                      referenceNo: '',
                    })
                    setActiveRowIndex(payments.length)
                  }}
                  className='flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors'
                >
                  <Plus className='w-3.5 h-3.5' />
                  Split
                </button>
              )}
            </form.Subscribe>
          </div>

          <div className='flex-1 overflow-y-auto px-5 pb-5 space-y-4 min-h-0'>
            {/* Payment rows */}
            <form.Field name='payments' mode='array'>
              {field => (
                <div className='space-y-2'>
                  {field.state.value.map((payment, index) => (
                    <div
                      key={payment.id}
                      className={cn(
                        'rounded-xl border overflow-hidden transition-colors',
                        index === clampedActiveIndex ? 'border-primary/50 bg-primary/3' : 'border-border/60 bg-muted/20',
                      )}
                    >
                      <div className='flex items-stretch'>
                        {/* Method selector — using project's SelectInput component */}
                        <div className='border-r border-border/60 min-w-36 self-stretch flex items-center [&_.field]:m-0 [&_.field]:w-full [&_button]:h-full [&_button]:min-h-14 [&_button]:rounded-none [&_button]:border-0 [&_button]:shadow-none [&_button]:bg-transparent [&_button]:hover:bg-muted/30 [&_button]:px-3 [&_button]:font-semibold [&_button]:text-sm [&_button]:justify-start'>
                          <SelectInput
                            options={PAYMENT_METHOD_OPTIONS}
                            field={
                              {
                                name: `payments[${index}].platform`,
                                state: {
                                  value: payment.platform,
                                  meta: { errors: [], isTouched: false, isValidating: false, touchedErrors: [], errorMap: {} },
                                },
                                handleChange: (val: string) => {
                                  const target = Object.values(PAYMENT_PLATFORMS).find(p => p.id === val)
                                  if (target) {
                                    const updated = paymentsState.map((p, i) =>
                                      i === index ? { ...p, platform: val, method: target.type, referenceNo: '' } : p,
                                    )
                                    form.setFieldValue('payments', updated)
                                    setTimeout(() => form.validate('change'), 0)
                                  }
                                  setActiveRowIndex(index)
                                },
                                handleBlur: () => {},
                              } as never
                            }
                          />
                        </div>

                        {/* Amount — TextInput with field shim, Field/Label chrome stripped via child selectors */}
                        <div
                          className={cn(
                            'flex-1 relative [&_.field]:contents [&_label]:hidden [&_p]:hidden',
                            index === clampedActiveIndex ? '[&_input]:text-primary' : '',
                          )}
                          onClick={() => setActiveRowIndex(index)}
                          onFocus={() => setActiveRowIndex(index)}
                        >
                          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground select-none pointer-events-none z-10'>
                            ₱
                          </span>
                          <TextInput
                            label=''
                            type='number'
                            placeholder='0.00'
                            className='h-14 pl-7 pr-3 text-lg font-bold border-0 bg-transparent rounded-none focus-visible:ring-0 shadow-none'
                            field={
                              {
                                name: `payments[${index}].tendered`,
                                state: {
                                  value: payment.tendered / 100 || '',
                                  meta: { errors: [], isTouched: false, isValidating: false, touchedErrors: [], errorMap: {} },
                                },
                                handleChange: (val: string | number) => {
                                  const cents = Math.round(Number(val) * 100)
                                  const updated = paymentsState.map((p, i) => (i === index ? { ...p, tendered: Number.isNaN(cents) ? 0 : cents } : p))
                                  form.setFieldValue('payments', updated)
                                  form.validate('change')
                                },
                                handleBlur: () => {},
                              } as never
                            }
                          />
                        </div>

                        {/* Remove row */}
                        {field.state.value.length > 1 && (
                          <button
                            type='button'
                            onClick={() => {
                              field.removeValue(index)
                              setActiveRowIndex(i => Math.min(i, field.state.value.length - 2))
                              setTimeout(() => form.validate('change'), 0)
                            }}
                            className='w-10 flex items-center justify-center border-l border-border/60 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        )}
                      </div>

                      {/* Reference number for digital payments */}
                      {payment.platform !== 'cash' &&
                        (() => {
                          const refError = !payment.referenceNo || payment.referenceNo.trim().length === 0
                          return (
                            <div className='border-t border-border/60 relative [&_.field]:contents [&_label]:hidden'>
                              <CreditCard
                                className={cn(
                                  'absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 z-10 pointer-events-none',
                                  refError ? 'text-destructive' : 'text-muted-foreground',
                                )}
                              />
                              <TextInput
                                label=''
                                placeholder='Approval / reference no.'
                                className={cn(
                                  'h-9 pl-9 pr-3 text-xs border-0 bg-transparent rounded-none focus-visible:ring-0 shadow-none',
                                  refError ? 'text-destructive placeholder:text-destructive/50' : 'text-muted-foreground',
                                )}
                                onFocus={() => setActiveRowIndex(index)}
                                field={
                                  {
                                    name: `payments[${index}].referenceNo`,
                                    state: {
                                      value: payment.referenceNo ?? '',
                                      meta: {
                                        errors: refError ? [{ message: 'Reference number is required' }] : [],
                                        isTouched: payment.referenceNo !== undefined,
                                        isValidating: false,
                                        touchedErrors: [],
                                        errorMap: {},
                                      },
                                    },
                                    handleChange: (val: string) => {
                                      const updated = paymentsState.map((p, i) => (i === index ? { ...p, referenceNo: val } : p))
                                      form.setFieldValue('payments', updated)
                                      form.validate('change')
                                    },
                                    handleBlur: () => {},
                                  } as never
                                }
                              />
                            </div>
                          )
                        })()}
                    </div>
                  ))}
                </div>
              )}
            </form.Field>

            {/* Exact + Clear — Subscribe so they react to payment changes */}
            <form.Subscribe selector={s => ({ payments: s.values.payments, scPwdDiscount: s.values.scPwdDiscount })}>
              {({ payments, scPwdDiscount }) => {
                const effectiveTotal = Math.max(total - (scPwdDiscount ?? 0), 0)
                const others = payments.filter((_, i) => i !== clampedActiveIndex).reduce((s, p) => s + p.tendered, 0)
                const exactNeeded = Math.max(effectiveTotal - others, 0)
                const isExactSelected = payments[clampedActiveIndex]?.tendered === exactNeeded

                return (
                  <div className='flex gap-1.5'>
                    <button
                      type='button'
                      onClick={() => setExact(effectiveTotal)}
                      className={cn(
                        'flex-1 h-11 rounded-xl text-sm font-bold border transition-colors',
                        isExactSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border/60 text-foreground hover:border-primary/50 hover:bg-primary/5',
                      )}
                    >
                      Exact
                    </button>
                    <button
                      type='button'
                      onClick={clearActive}
                      className='h-11 px-4 rounded-xl text-sm font-bold border border-border/60 bg-background text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors'
                    >
                      Clear
                    </button>
                  </div>
                )
              }}
            </form.Subscribe>

            {/* Bills */}
            <div>
              <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'>Bills</p>
              <div className='grid grid-cols-3 gap-1.5'>
                {BILL_DENOMINATIONS.map(bill => (
                  <button
                    key={`bill-${bill}`}
                    type='button'
                    onClick={() => addToActive(bill * 100)}
                    className='h-11 rounded-xl text-sm font-bold border border-border/60 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all'
                  >
                    ₱{bill}
                  </button>
                ))}
              </div>
            </div>

            {/* Coins */}
            <div>
              <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'>Coins</p>
              <div className='grid grid-cols-4 gap-1.5'>
                {COIN_DENOMINATIONS.map(coin => (
                  <button
                    key={`coin-${coin}`}
                    type='button'
                    onClick={() => addToActive(coin * 100)}
                    className='h-11 rounded-xl text-sm font-bold border border-border/60 bg-muted/40 text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all'
                  >
                    ₱{coin}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COL — summary + SC/PWD + confirm ───────────────── */}
        <div className='sm:w-80 shrink-0 flex flex-col overflow-hidden min-h-0 bg-muted/30'>
          <div className='flex items-center justify-end px-4 pt-4 pb-2 shrink-0'>
            <button
              type='button'
              onClick={handleClose}
              className='w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto px-4 pb-4 space-y-3 min-h-0'>
            {/* Summary — Subscribe keeps this reactive to every payment change */}
            <form.Subscribe selector={s => ({ payments: s.values.payments, scPwdDiscount: s.values.scPwdDiscount })}>
              {({ payments, scPwdDiscount }) => {
                const scPwdDiscountCents = scPwdDiscount ?? 0
                const effectiveTotal = Math.max(total - scPwdDiscountCents, 0)
                const totalPaidCombined = payments.reduce((s, p) => s + p.tendered, 0)
                const remainingDue = effectiveTotal - totalPaidCombined
                const isOverpaid = remainingDue < 0
                const change = isOverpaid ? Math.abs(remainingDue) : 0
                const stillOwed = isOverpaid ? 0 : remainingDue

                return (
                  <>
                    {/* Total + Received */}
                    <div className='rounded-xl bg-muted/40 border border-border/50 px-4 py-3 space-y-3'>
                      <div>
                        <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5'>Total</p>
                        <p className='text-2xl font-black font-mono tabular-nums text-foreground leading-none break-all'>
                          {PriceEngine.format(scPwdOpen && scPwdDiscountCents > 0 ? effectiveTotal : total)}
                        </p>
                        {scPwdOpen && scPwdDiscountCents > 0 && (
                          <p className='text-xs font-medium text-yellow-600 dark:text-yellow-400 mt-0.5'>
                            − {PriceEngine.format(scPwdDiscountCents)} Senior/PWD
                          </p>
                        )}
                      </div>
                      <div>
                        <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5'>Received</p>
                        <p
                          key={totalPaidCombined}
                          className='text-xl font-black font-mono tabular-nums text-foreground leading-none break-all animate-scale-bump'
                        >
                          {PriceEngine.format(totalPaidCombined)}
                        </p>
                      </div>
                    </div>

                    {/* Change / Still Owed */}
                    <div
                      className={cn(
                        'rounded-xl border px-4 py-4',
                        stillOwed > 0
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : totalPaidCombined > 0
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-muted/20 border-border/40',
                      )}
                    >
                      <p
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-widest mb-1',
                          stillOwed > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : totalPaidCombined > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground',
                        )}
                      >
                        {stillOwed > 0 ? 'Still Owed' : 'Change'}
                      </p>
                      <p
                        key={stillOwed > 0 ? stillOwed : change}
                        className={cn(
                          'text-4xl font-black font-mono tabular-nums leading-none tracking-tight break-all animate-scale-bump',
                          stillOwed > 0
                            ? 'text-amber-500 dark:text-amber-400'
                            : totalPaidCombined > 0
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-muted-foreground/30',
                        )}
                      >
                        {PriceEngine.format(stillOwed > 0 ? stillOwed : change)}
                      </p>
                      <p
                        className={cn(
                          'text-[11px] font-medium mt-1.5',
                          stillOwed > 0
                            ? 'text-amber-600/70 dark:text-amber-400/70'
                            : totalPaidCombined > 0
                              ? 'text-emerald-600/70 dark:text-emerald-400/70'
                              : 'text-muted-foreground/50',
                        )}
                      >
                        {stillOwed > 0 ? 'Collect more' : totalPaidCombined > 0 ? 'Give back' : 'Waiting...'}
                      </p>
                    </div>
                  </>
                )
              }}
            </form.Subscribe>

            {/* Senior / PWD Discount */}
            <Collapsible open={scPwdOpen} onOpenChange={setScPwdOpen}>
              <form.Subscribe selector={s => s.values.scPwdDiscount}>
                {scPwdDiscount => (
                  <CollapsibleTrigger asChild>
                    <button
                      type='button'
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        scPwdOpen
                          ? 'border-yellow-500/40 bg-yellow-500/8 text-yellow-600 dark:text-yellow-400'
                          : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border',
                      )}
                    >
                      <span className='flex items-center gap-2'>
                        <UserCheck className='w-3.5 h-3.5' />
                        Senior / PWD
                        {scPwdOpen && scPwdDiscount > 0 && <span className='text-xs font-semibold'>— {PriceEngine.format(scPwdDiscount)} off</span>}
                      </span>
                      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200 text-muted-foreground', scPwdOpen && 'rotate-180')} />
                    </button>
                  </CollapsibleTrigger>
                )}
              </form.Subscribe>

              <CollapsibleContent className='pt-2 animate-in slide-in-from-top-1 duration-150'>
                <div className='rounded-xl border border-border/60 bg-muted/10 divide-y divide-border/40'>
                  <p className='px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider'>
                    20% off + VAT exempt — record customer's ID
                  </p>
                  <div className='p-3 space-y-2'>
                    <form.AppField name='scPwdName'>
                      {field => <TextInput field={field} label='Customer Name' placeholder='Juan dela Cruz' className='h-8 rounded-lg text-xs' />}
                    </form.AppField>

                    <form.AppField name='scPwdId'>
                      {field => <TextInput field={field} label='ID Number' placeholder='e.g. 1234567890' className='h-8 rounded-lg text-xs' />}
                    </form.AppField>

                    <form.AppField name='scPwdDiscount'>
                      {field => (
                        <form.Subscribe selector={s => s.values.scPwdDiscount}>
                          {() => (
                            <MoneyInput
                              field={field}
                              label={
                                <span className='flex items-center justify-between w-full'>
                                  <span>Discount Amount</span>
                                  <span className='text-[10px] font-normal text-muted-foreground'>{PriceEngine.format(Math.round(total * 0.2))} suggested</span>
                                </span>
                              }
                              placeholder='0.00'
                              className='h-8 rounded-lg text-xs font-mono'
                            />
                          )}
                        </form.Subscribe>
                      )}
                    </form.AppField>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Hardware status indicators — shown only when cash drawer is required AND receipt printing is enabled */}
          {cashDrawerRequired && canPrintReceipt && (
            <div className='px-4 pb-2 shrink-0'>
              <HardwareCashDrawerStatus />
            </div>
          )}

          {/* Complete Sale — Subscribe reads canSubmit from form state */}
          <div className='p-4 border-t border-border/50 shrink-0'>
            <form.Subscribe selector={s => [s.canSubmit, s.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  disabled={!canSubmit || isSubmitting}
                  onClick={() => form.handleSubmit()}
                  className={cn(
                    'w-full h-12 rounded-2xl font-black text-sm tracking-wide transition-all active:scale-[0.98]',
                    canSubmit ? 'shadow-md shadow-primary/20' : 'opacity-40 cursor-not-allowed',
                  )}
                  variant={canSubmit ? 'default' : 'secondary'}
                >
                  Complete Sale
                </Button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

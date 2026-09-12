/**
 * /qa/tests/:testId — Test detail page
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Separator } from '@platform/components/ui/separator'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckCircle2Icon, ChevronRightIcon, PlayIcon } from 'lucide-react'
import { FEATURE_LABELS, RISK_COLORS } from '@/lib/qa/constants'
import { ALL_TEST_CASES } from '../../../../../../../qa-definitions'

export const Route = createFileRoute('/(private)/(dashboard)/qa/tests/$testId/')({
  component: TestDetailPage,
})

export default function TestDetailPage() {
  const { testId } = Route.useParams()
  const tc = ALL_TEST_CASES.find(t => t.id === testId)

  if (!tc) {
    return (
      <div className='p-6 max-w-2xl mx-auto'>
        <p className='text-sm text-destructive'>Test case "{testId}" not found.</p>
        <Link to='/qa' className='text-sm text-primary hover:underline mt-2 block'>
          ← Back to test list
        </Link>
      </div>
    )
  }

  const riskColors = RISK_COLORS[tc.risk] ?? RISK_COLORS['LOW']!

  return (
    <div className='h-full overflow-y-auto p-6 max-w-2xl mx-auto space-y-6'>
      {/* Header */}
      <div>
        <div className='flex items-center gap-2 mb-2'>
          <span className='text-xs font-mono text-muted-foreground'>{tc.id}</span>
          <Badge variant='outline' className={`${riskColors.bg} ${riskColors.text} ${riskColors.border}`}>
            {tc.risk}
          </Badge>
        </div>
        <h1 className='text-xl font-bold'>{tc.title}</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          {FEATURE_LABELS[tc.feature] ?? tc.feature} · {tc.workflow}
        </p>
      </div>

      {/* Expected outcomes */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>What this test verifies</CardTitle>
        </CardHeader>
        <CardContent className='space-y-1.5'>
          {tc.expected.map(e => (
            <div key={e} className='flex items-start gap-2 text-sm text-muted-foreground'>
              <CheckCircle2Icon className='size-3.5 text-green-500 mt-0.5 shrink-0' />
              {e}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Steps preview */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>{tc.steps.length} steps</CardTitle>
        </CardHeader>
        <CardContent className='space-y-1.5'>
          {tc.steps.map((s, i) => (
            <div key={s.openUrl} className='flex gap-2.5 text-sm text-muted-foreground'>
              <span className='font-mono text-xs w-5 shrink-0 mt-0.5 text-muted-foreground/60'>{i + 1}.</span>
              <span>{s.instruction}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <Button asChild>
        <Link to='/qa/tests/$testId/run' params={{ testId: tc.id }}>
          <PlayIcon className='size-4 mr-2' />
          Start Test
          <ChevronRightIcon className='size-4 ml-2' />
        </Link>
      </Button>
    </div>
  )
}

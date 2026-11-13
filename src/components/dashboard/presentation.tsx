import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function PageHeading({ icon: Icon, title, description, actions }: {
  icon: LucideIcon; title: string; description: string; actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><Icon className="size-7" /></span>
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight lg:text-[30px]">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <Card className="dashboard-stat">
      <CardHeader>
        <span className="row-span-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true"><Icon className="size-6" /></span>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-[28px] leading-none font-bold tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

export function SectionHeading({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <CardHeader className="dashboard-section-heading">
      <span className="row-span-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true"><Icon className="size-[22px]" /></span>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
      <Inbox className="mb-1 size-7 text-primary/60" aria-hidden="true" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

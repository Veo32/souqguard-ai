'use client'

import { useI18n } from '@/contexts/language-context'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, ShieldAlert, XCircle, type LucideIcon } from 'lucide-react'

export type ProductStatus = 'PENDING' | 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED'
export type FlagStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'

const STATUS_STYLES: Record<string, { className: string; icon: LucideIcon }> = {
  PENDING: {
    className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30',
    icon: Clock,
  },
  APPROVED: {
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  },
  NEEDS_REVIEW: {
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: ShieldAlert,
  },
  REJECTED: {
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    icon: XCircle,
  },
  OPEN: {
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    icon: ShieldAlert,
  },
  RESOLVED: {
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  },
  DISMISSED: {
    className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30',
    icon: XCircle,
  },
}

/**
 * Badge for product moderation status (PENDING / APPROVED / NEEDS_REVIEW /
 * REJECTED) and flag status (OPEN / RESOLVED / DISMISSED). Labels resolve via
 * i18n: status.* for product states, flagStatus.* for flag states.
 */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useI18n()
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING
  const Icon = style.icon
  const isFlagStatus = status === 'OPEN' || status === 'RESOLVED' || status === 'DISMISSED'
  const label = isFlagStatus ? t(`flagStatus.${status}`) : t(`status.${status}`)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        style.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

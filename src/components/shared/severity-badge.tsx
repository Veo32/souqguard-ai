'use client'

import { useI18n } from '@/contexts/language-context'
import { cn } from '@/lib/utils'
import {
  AlertOctagon,
  AlertTriangle,
  CircleAlert,
  Info,
  type LucideIcon,
} from 'lucide-react'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

const SEVERITY_STYLES: Record<Severity, { className: string; icon: LucideIcon }> = {
  CRITICAL: {
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    icon: AlertOctagon,
  },
  HIGH: {
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    icon: AlertTriangle,
  },
  MEDIUM: {
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: CircleAlert,
  },
  LOW: {
    className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    icon: Info,
  },
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const { t } = useI18n()
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.LOW
  const Icon = style.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        style.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(`severity.${severity}`)}
    </span>
  )
}

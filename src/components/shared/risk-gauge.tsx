'use client'

import { useI18n } from '@/contexts/language-context'
import { cn } from '@/lib/utils'

function riskColor(score: number): string {
  if (score >= 75) return '#F43F5E' // rose
  if (score >= 50) return '#FB923C' // orange
  if (score >= 25) return '#F59E0B' // amber
  return '#10B981' // emerald
}

/**
 * Circular risk gauge (0–100). `size` controls the SVG diameter.
 */
export function RiskGauge({
  score,
  size = 56,
  label,
  className,
}: {
  score: number
  size?: number
  label?: string
  className?: string
}) {
  const { t } = useI18n()
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const stroke = Math.max(4, Math.round(size * 0.09))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  const color = riskColor(clamped)

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="img"
      aria-label={`${t('dashboard.riskScore')}: ${clamped}/100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold leading-none tabular-nums"
          style={{ color, fontSize: Math.max(12, Math.round(size * 0.28)) }}
        >
          {clamped}
        </span>
        {label ? (
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
        ) : null}
      </div>
    </div>
  )
}

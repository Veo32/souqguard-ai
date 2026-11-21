'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animated number that counts up from 0 to `value` on mount (and animates
 * smoothly when the value changes). Supports decimals via `decimals`.
 */
export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  suffix = '',
  prefix = '',
  className,
}: {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      if (from === to) {
        setDisplay(to)
        fromRef.current = to
        return
      }
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}

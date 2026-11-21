'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Product artwork served by /api/image/[id], with a shimmer skeleton while
 * loading and a graceful fallback if the request fails.
 */
export function ProductImage({
  productId,
  alt,
  className,
  rounded = 'rounded-xl',
}: {
  productId: string
  alt: string
  className?: string
  rounded?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className={cn('relative overflow-hidden bg-muted/30', rounded, className)}>
      {!loaded && !failed ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/60 to-muted/20" />
      ) : null}
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          <span className="text-xs text-muted-foreground">?</span>
        </div>
      ) : (
        <img
          src={`/api/image/${productId}`}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  )
}

import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Resolve the SQLite file URL for the current runtime.
 *
 * - Non-file URLs are passed through untouched.
 * - Relative `file:` paths are resolved from the project root (process.cwd())
 *   so behavior is identical in dev, standalone builds, and serverless.
 * - On Vercel serverless the filesystem is read-only except /tmp, so the
 *   bundled database file is copied to /tmp once per instance and used from
 *   there (writes — compliance scans, flag actions — stay functional).
 */
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? 'file:./db/custom.db'
  if (!url.startsWith('file:')) return url

  let filePath = url.slice('file:'.length)
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath)
  }

  if (process.env.VERCEL) {
    const tmpPath = '/tmp/souqguard.db'
    if (tmpPath !== filePath) {
      try {
        if (!fs.existsSync(tmpPath)) {
          fs.copyFileSync(filePath, tmpPath)
        }
        return 'file:' + tmpPath
      } catch {
        // Copy failed (e.g. source not bundled) — fall back to the original path.
      }
    }
  }

  return 'file:' + filePath
}

export const db =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: resolveDatabaseUrl() })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

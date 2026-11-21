# SouqGuard AI — حارس السوق

**Multimodal AI copilot for e-commerce trust:** search marketplace listings by image or text, and enforce marketplace policies automatically. Fully bilingual — English & Arabic (RTL).

**مساعد ذكي متعدد الوسائط لثقة المتاجر الإلكترونية:** ابحث في إعلانات المتجر بالصورة أو النص، وطبّق سياسات المتجر تلقائياً. ثنائي اللغة بالكامل — الإنجليزية والعربية (مع دعم الاتجاه من اليمين لليسار).

---

## 🚀 Deploy to Vercel | النشر على Vercel

### Option A — Drag & Drop (fastest) | الخيار أ — السحب والإفلات (الأسرع)

1. Go to [vercel.com/new](https://vercel.com/new) and log in.
   انتقل إلى [vercel.com/new](https://vercel.com/new) وسجّل الدخول.
2. Drag & drop the project **folder** (or push this repo to GitHub and import it).
   اسحب **مجلد** المشروع وأفلته في الصفحة (أارفع المشروع إلى GitHub واستورده).
3. Vercel auto-detects **Next.js** — keep the defaults and click **Deploy**.
   سيتعرّف Vercel تلقائياً على **Next.js** — اترك الإعدادات الافتراضية واضغط **Deploy**.

> **No environment variables required.** The app ships with a bundled SQLite
> database (`db/custom.db`, pre-seeded with 30 bilingual listings + 9 policy
> rules) and automatically adapts to the serverless filesystem.
>
> **لا حاجة لأي متغيرات بيئة.** يأتي التطبيق مع قاعدة بيانات SQLite مدمجة
> (`db/custom.db`) مهيّأة مسبقاً بـ 30 إعلاناً ثنائي اللغة و9 قواعد سياسات،
> ويتكيّف تلقائياً مع نظام ملفات البيئة السحابية.

### Option B — Vercel CLI | الخيار ب — واجهة الأوامر

```bash
npm i -g vercel
cd souqguard-ai
vercel          # first deploy (accept defaults)
vercel --prod   # production deploy
```

### Optional environment variable | متغير بيئة اختياري

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite file URL. Leave unset for the bundled demo database. |

---

## 📝 Serverless note | ملاحظة عن البيئة السحابية

On Vercel's serverless platform the filesystem is read-only except `/tmp`.
The app copies the bundled database to `/tmp` per instance automatically —
**all features work** (search, compliance scan, resolve/dismiss flags). Data
resets to the seeded state when an instance is recycled. For permanent writes,
swap the Prisma datasource to Turso, Neon, or Vercel Postgres (`prisma/schema.prisma`).

نظام ملفات المنصة السحابية للقراءة فقط باستثناء `/tmp`. ينسخ التطبيق قاعدة
البيانات المدمجة إلى `/tmp` تلقائياً لكل نسخة — **جميع الميزات تعمل**
(البحث، فحص الامتثال، معالجة الإشارات). تُعاد البيانات لحالتها المهيّأة عند
إعادة تدوير النسخة. للكتابة الدائمة، بدّل مصدر بيانات Prisma إلى Turso أو
Neon أو Vercel Postgres.

---

## 💻 Local development | التشغيل المحلي

```bash
npm install        # or: bun install / pnpm install
npm run dev        # http://localhost:3000
```

Re-seed the database (requires [Bun](https://bun.sh)):

```bash
bun scripts/seed.ts
```

---

## 🧱 Tech stack | التقنيات

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 4** + **shadcn/ui** (44px touch targets, dark/light themes)
- **Prisma 6** + SQLite — 30 bilingual products, 9 policy rules, compliance flags
- **Custom compliance engine** — restricted items, image–text mismatch (color
  distance), category mismatch, price anomaly, image quality, safety disclosures
- **Custom multimodal search** — 64-d palette-embedding visual search (cosine
  similarity) + weighted bilingual text search (EN/AR)
- **i18n** — 191 keys × 2 languages, full RTL mirroring, `dir`/`lang` switching

## 🔌 API | واجهات البرمجة

| Route | Description |
|---|---|
| `GET /api/stats` | Dashboard KPIs, risk & category stats, recent flags |
| `GET /api/products` `?category=&status=&sort=` | Catalog with filters |
| `GET /api/products/[id]` | Product detail + flags |
| `POST /api/search` | `{mode:"VISUAL", embedding}` \| `{mode:"TEXT", text}` → 12 hits |
| `POST /api/compliance/scan` | `{}` full catalog \| `{productId}` single |
| `GET /api/compliance/flags` `?status=&severity=` | Flag review queue |
| `POST /api/compliance/flags/[id]` | `{action:"RESOLVE"\|"DISMISS"}` |
| `GET /api/policies` | 9 policy rules (EN/AR) |
| `GET /api/image/[id]` | Deterministic SVG artwork per product |

All routes validate input with **zod**, return JSON errors (400/404), and are
`force-dynamic`. Verified by a 56-check automated battery: lint 0/0, `tsc` clean,
i18n 191/191 EN=AR, canonical demo state (30 products · 14 open flags · 3
critical · 12 flagged listings).

---

© 2026 SouqGuard AI — demo built for the Multimodal GenAI CV case study.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment variables

Set these server-side (Vercel project settings, or `.env.local` for dev):

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon **pooled** (`-pooler`) connection string. |
| `PLANTNET_API_KEY` | optional | Enables photo **identification** (Pl@ntNet). Unset → the identify entry point is hidden. |
| `STORAGE_*` | optional | Enables **photo avatars** (see below). Unset → plants use emoji avatars only. |

### Photo avatars (object storage)

Avatar photos are stored in any S3-compatible bucket — the app talks plain S3,
so the provider is just configuration (Supabase Storage today; AWS S3 /
Cloudflare R2 / MinIO later by changing these vars, no code change). With any of
them unset the feature disables itself and plants fall back to emoji.

| Variable | Example |
| --- | --- |
| `STORAGE_ENDPOINT` | `https://<ref>.storage.supabase.co/storage/v1/s3` |
| `STORAGE_REGION` | `eu-central-1` |
| `STORAGE_BUCKET` | `plant-avatars` |
| `STORAGE_ACCESS_KEY_ID` | S3 access key id |
| `STORAGE_SECRET_ACCESS_KEY` | S3 secret access key |

The public URL objects are served from is **derived** from the endpoint and
bucket — no separate var to keep in sync. For Supabase the `/s3` endpoint is
rewritten to `/object/public/<bucket>`; other S3 providers use the standard
path-style `<endpoint>/<bucket>` (a provider that serves public objects from a
different host — e.g. Cloudflare R2's `r2.dev` — would need a small tweak to
`publicUrl` in `src/lib/storage.ts`).

Supabase setup: create a **public** bucket (e.g. `plant-avatars`), then generate
S3 access keys under *Project settings → Storage → S3 access keys*. Object keys
are random and household-agnostic, so a leaked photo URL can't be walked back to
a household token — the public bucket mirrors the app's "secret link = access"
model.

### Database migrations

The avatar feature adds an `avatar_image_key` column. Apply pending migrations
after pulling and before deploying:

```bash
pnpm db:migrate
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

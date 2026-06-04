# n8n New-Booking Automation

Goal: when a booking is created, fire a secure backend webhook to n8n. Expose secure internal endpoints n8n can call to match providers, create invitations, log alerts, and log automation runs. Add an Admin Dashboard section for booking alerts. Nothing in the existing booking, auth, roles, provider, customer, admin, or UI flows is removed or rewritten.

## 1. Secrets (request via add_secret)
- `N8N_NEW_BOOKING_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `INTERNAL_API_SECRET`

Booking still succeeds even if these are missing — the webhook step is best-effort and logged to `automation_logs`.

## 2. Database (single migration, additive only)

New tables:

- `provider_invitations`
  - `id`, `booking_id`, `provider_id`, `status` (sent|viewed|interested|declined|assigned|expired), `notification_status`, `sent_at`, `viewed_at`, `responded_at`, `created_at`
  - RLS: admin/CS full; provider can read own rows.
- `admin_alerts`
  - `id`, `alert_type`, `booking_id`, `severity`, `title`, `message`, `status` (open|resolved), `created_at`, `resolved_at`
  - RLS: admin/CS full.
- `automation_logs`
  - `id`, `booking_id`, `event_type`, `target`, `status`, `request_payload jsonb`, `response_payload jsonb`, `error_message text`, `created_at`
  - RLS: admin full.

Add columns to `bookings` (nullable, defaults safe):
- `automation_status text default 'pending'` (pending|sent|failed|skipped)
- `automation_last_attempt_at timestamptz`

All new public tables get the required `GRANT` block (authenticated + service_role; no anon).

## 3. Edge functions

All deployed with `verify_jwt = false`; internal endpoints validate `Authorization: Bearer INTERNAL_API_SECRET` in code.

- `notify-n8n-booking` (called by DB trigger via `pg_net`, or by `create-guest-booking` as fallback)
  - Loads booking + customer + service.
  - POSTs the spec payload to `N8N_NEW_BOOKING_WEBHOOK_URL` with header `X-MFN-Webhook-Secret`.
  - Writes one row to `automation_logs`; sets `bookings.automation_status`.
- `internal-providers-match` — `POST /providers-match-for-booking`
  - Returns approved, non-suspended providers whose `role_type` matches service category and whose city/radius covers the booking, with the required projection.
- `internal-provider-invitations-bulk` — `POST /provider-invitations-bulk-create`
  - Bulk-inserts `provider_invitations` rows.
- `internal-admin-alerts` — `POST /admin-alerts` (insert) used by n8n for the "new booking" admin alert.
- `internal-automation-logs` — `POST /automation-logs` so n8n can append log entries.
- `automation-retry` — admin-only, re-invokes `notify-n8n-booking` for one booking.

The five `internal-*` functions share a tiny auth helper that checks the bearer token.

## 4. Wiring booking creation to n8n

`supabase/functions/create-guest-booking/index.ts` — after the existing outbox/notification inserts, fire-and-forget invoke `notify-n8n-booking` with the new booking id. No behavior change if the call fails; current outbox + admin notification logic stays intact.

For bookings created by other paths (CS, admin), add an `AFTER INSERT` trigger on `bookings` that calls the same function via `pg_net` — only if `N8N_NEW_BOOKING_WEBHOOK_URL` secret resolution succeeds at runtime. Safe no-op otherwise.

## 5. Admin Dashboard — new "Alerts" tab

Add `src/components/admin/BookingAlertsTab.tsx` and a new `TabsTrigger` in `AdminDashboard.tsx`. Existing tabs untouched. The tab lists rows from `admin_alerts` joined with `bookings`, showing booking number, service name, customer name, city/area, matched-provider count (from `provider_invitations`), notification status, and a link to the existing booking details drawer. Includes a "Retry automation" button that calls `automation-retry` when `automation_status='failed'`.

## 6. Security

- Webhook + internal secrets are server-side only (edge function env). Never imported into `src/`.
- Provider-facing payloads from `internal-providers-match` exclude customer name, phone, full address, and exact coordinates — providers receive only booking number, service name, city/area, case description, and dashboard link (the match endpoint returns provider contact info to n8n, not customer info).
- All new public tables have explicit GRANTs + RLS.

## 7. Out of scope (explicitly preserved)
No changes to: auth, roles, RLS on existing tables, services tab, providers tab, customer booking UI, provider dashboard, finance, suspensions, sync, existing edge functions other than appending the fire-and-forget invoke in `create-guest-booking`.

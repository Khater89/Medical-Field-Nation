
## Goal
Replace the current phone-only OTP marketplace auth with a full account-creation flow:
- **Signup**: phone → OTP verify → name + username + password
- **Login**: phone + password
- Password rules: ≥6 chars, ≥1 uppercase, ≥1 number, ≥1 symbol

Applies wherever marketplace auth gate appears (marketplace, order tracking, self-booking). New chats after signup are automatically tied to the account (existing behavior — no linking of legacy guest chats).

## Database (migration)
1. Add `profiles.username TEXT UNIQUE` (case-insensitive via unique index on `lower(username)`), nullable for legacy rows.
2. Add helper RPC `username_available(_u text) → boolean` (SECURITY DEFINER) for pre-check.

## Edge functions
- **send-phone-otp** (unchanged): send OTP to phone.
- **verify-phone-otp** — refactored into two modes:
  - `mode: "verify_only"` → validates OTP, returns `ok:true` + short-lived `verification_token` (signed HMAC of phone+timestamp, valid 10 min). Does NOT create account.
  - `mode: "signup"` → requires `verification_token`, `full_name`, `username`, `password`. Validates password rules server-side, checks username uniqueness, creates auth user with `email = <username>@mfn.local` + password, creates profile, marks OTP consumed, returns session tokens.
- **New `phone-password-login`** function: takes `phone` + `password`, looks up profile by phone → resolves email → `signInWithPassword` via anon client → returns session.

## Frontend
Rewrite `src/pages/marketplace/MarketplacePhoneAuth.tsx` with tabs:
- **Sign in tab**: phone + password → call `phone-password-login`.
- **Sign up tab** (3 steps): phone → OTP → profile form (name, username with live availability check, password with visible strength rules).
- Client-side zod validation for password: `/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/`.
- Username: 3–20 chars, `[a-zA-Z0-9_]`.

No changes to chat storage — `marketplace_chats` already keys on `customer_user_id`, so once signed in every new chat is tied to the account.

## Out of scope (per user answer)
- Migrating old guest chats to newly created accounts.

## Files touched
- `supabase/functions/verify-phone-otp/index.ts` (refactor)
- `supabase/functions/phone-password-login/index.ts` (new)
- `src/pages/marketplace/MarketplacePhoneAuth.tsx` (rewrite UI)
- 1 migration: username column + RPC.

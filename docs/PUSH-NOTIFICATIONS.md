# Push Notifications — Setup

Mobile push mirrors `app_notifications` to FCM (Firebase project `mundus-79ce7`).

## Already in repo

- `android/app/google-services.json` (gitignored)
- `ios/App/App/GoogleService-Info.plist`
- Edge function: `supabase/functions/send-push`
- Client: `src/lib/pushNotifications.ts`

## Required Supabase secrets

```bash
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
supabase secrets set PUSH_WEBHOOK_SECRET='your-random-secret'
```

Generate the service account JSON in Firebase → Project Settings → Service Accounts.

## Dispatch options (pick one)

### Option A — Database Webhook (recommended)

Supabase Dashboard → Database → Webhooks → Create:

- Table: `app_notifications`
- Events: `INSERT`
- URL: `https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/send-push`
- HTTP Headers: `x-push-secret: <same as PUSH_WEBHOOK_SECRET>`

### Option B — pg_net trigger (included in migration)

After setting the same secret on the database:

```sql
ALTER DATABASE postgres SET app.push_webhook_secret = 'your-random-secret';
```

## Deploy

```bash
npm install
npm run build:mobile
supabase db push
supabase functions deploy send-push
```

## iOS notes

- Push capability must stay enabled in Xcode (entitlements: `App/App.entitlements`)
- Test on a **physical device** (simulator does not receive remote push)
- For TestFlight/App Store, change `aps-environment` to `production` in entitlements

## Android notes

- Requires `POST_NOTIFICATIONS` permission (Android 13+) — user grants on first launch
- Notification channel: `mundus_default` (created by FCM payload)

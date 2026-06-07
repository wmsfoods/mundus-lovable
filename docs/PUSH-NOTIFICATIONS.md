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

# iOS (Capacitor stores APNs device tokens — send via Apple directly)
supabase secrets set APNS_KEY_ID='XXXXXXXXXX'
supabase secrets set APNS_TEAM_ID='XXXXXXXXXX'
supabase secrets set APNS_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----'
# optional:
supabase secrets set APNS_BUNDLE_ID='com.mundustrade.app'
supabase secrets set APNS_ENVIRONMENT='production'  # or sandbox for some Xcode debug builds
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

- Push capability: `App/App.entitlements` (`aps-environment`)
- Test on a **physical device** (simulator does not receive remote push)
- **TestFlight / App Store:** `aps-environment` must be `production` (already set in repo)

See [TESTFLIGHT-PUSH-IOS.md](./TESTFLIGHT-PUSH-IOS.md) for full pre-TestFlight checklist and debugging.

## Android notes

- Requires `POST_NOTIFICATIONS` permission (Android 13+) — user grants on first launch
- Notification channel: `mundus_default` (created by FCM payload)

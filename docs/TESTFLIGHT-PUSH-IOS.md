# Checklist pré-TestFlight — Push iOS

## Status no repo (verificado)

| Item | Status |
|------|--------|
| `aps-environment` = `production` | OK — [`App.entitlements`](../ios/App/App/App.entitlements) |
| `UIBackgroundModes` → `remote-notification` | OK — [`Info.plist`](../ios/App/App/Info.plist) |
| `GoogleService-Info.plist` bundle `com.mundustrade.app` | OK |
| `PRODUCT_BUNDLE_IDENTIFIER` no Xcode | OK — `com.mundustrade.app` |
| Plugin `@capacitor/push-notifications` | OK |
| Registro de token no login | OK — `src/lib/pushNotifications.ts` |

## Manual no Xcode (antes do Archive)

1. Abrir `ios/App/MundusTrade.xcodeproj`
2. Target **App** → **Signing & Capabilities**
3. Confirmar:
   - **Push Notifications** habilitado
   - **Background Modes** → **Remote notifications** marcado  
   (Se não aparecer, clique **+ Capability** e adicione — o plist/entitlements no repo já estão preparados.)

## Firebase (obrigatório)

Firebase Console → projeto **mundus-79ce7** → Project Settings → **Cloud Messaging** → **Apple app configuration**:

- Upload da **APNs Authentication Key** (.p8) da Apple Developer Account
- Team ID + Key ID corretos
- Bundle ID: `com.mundustrade.app`

Sem APNs key no Firebase, `send-push` pode retornar sucesso mas o device **nunca recebe**.

## Supabase (obrigatório)

- Secrets: `FCM_SERVICE_ACCOUNT_JSON`, `PUSH_WEBHOOK_SECRET`
- Webhook ou `app.push_webhook_secret` em `app_notifications` INSERT → `send-push`

## Permissão do usuário

Na primeira vez após login no TestFlight:

1. Prompt iOS: *"Mundus would like to send notifications"*
2. User precisa **Allow**
3. Token gravado em `device_push_tokens`

Se negou: Settings → Mundus → Notifications → reativar.

## Fluxo esperado

```
User abre app → login → registerPushNotifications()
  → prompt iOS → aceita
  → FCM token → device_push_tokens (platform = ios)

Evento de negócio → INSERT app_notifications
  → webhook/pg_net → send-push
  → FCM → APNs production → banner no device
```

## Debug se não chegar

### 1. Token registrado?

```sql
SELECT * FROM device_push_tokens WHERE user_id = '<seu-user-id>';
```

Deve ter 1+ linha após login com permissão aceita.

### 2. Logs `send-push`

Supabase → Edge Functions → `send-push` → Logs

| Resposta | Significado |
|----------|-------------|
| `delivered: 1` | FCM aceitou — problema provavelmente APNs/device |
| `skipped: true, reason: 'no_tokens'` | Registro não rolou (permissão negada ou app não nativo) |
| `skipped: true, reason: 'preferences'` | User desligou push nas preferências |
| `skipped: true, reason: 'fcm_not_configured'` | Secret `FCM_SERVICE_ACCOUNT_JSON` faltando |
| Erro `InvalidApnsCredential` / `UNREGISTERED` | APNs key errada no Firebase ou token stale |

### 3. Dev vs production

- **Xcode run (debug)** local: Apple pode usar sandbox; entitlements `production` + TestFlight usam APNs prod.
- **TestFlight / App Store:** sempre APNs **production** — entitlements já configurado.

### 4. Archive

```bash
npm run build:mobile
npx cap open ios
```

Product → Archive → Distribute → TestFlight.

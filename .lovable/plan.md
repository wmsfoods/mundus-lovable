## Mudança

Atualizar `ios/App/App/App.entitlements`:

- `aps-environment` → de `development` para `production`

Isso é necessário pra TestFlight e App Store (ambos usam APNs production). Builds via Xcode em device de desenvolvimento continuam funcionando — APNs production aceita tokens de dev builds desde que o provisioning profile esteja certo.

## Fora do escopo (você faz manualmente)

1. **APNs Key no Firebase**: Firebase Console → Cloud Messaging → Apple app config → upload do `.p8` (APNs Authentication Key) + Team ID + Key ID. Sem isso o FCM não consegue enviar pro APNs.
2. **Xcode Capabilities**: Confirmar Push Notifications + Background Modes → Remote notifications ativados no target.
3. **Bundle ID match**: `com.mundustrade.app` (Firebase plist) = bundle id do Xcode = App ID com push habilitado no Apple Developer.
4. **Pós-edit**: `git pull` + `npx cap sync ios` antes do archive.

## PWA + Favicon Implementation for iOS

### Overview
Configure the Mundus Trade app as an installable PWA on iPhone with the Mundus favicon and iOS home screen support, without breaking the Lovable preview experience.

### Changes

1. **Assets**
   - Reuse existing `public/favicon.png` (already Mundus branded).
   - Copy `src/assets/mundus-logo.png` → `public/pwa-192x192.png` and `public/pwa-512x512.png` for manifest icons.
   - Copy `src/assets/mundus-monogram.png` → `public/apple-touch-icon.png` for iOS.

2. **Manifest** (`public/manifest.json`)
   - Name: "Mundus Trade"
   - Short name: "Mundus"
   - Display: standalone
   - Theme: #0F172A (dark navy, matching app shell)
   - Background: #0F172A
   - Icons: 192×192 and 512×512 pointing to copied assets.

3. **Index.html meta tags**
   - `apple-mobile-web-app-capable`: yes
   - `apple-mobile-web-app-status-bar-style`: black-translucent
   - `apple-mobile-web-app-title`: Mundus Trade
   - `apple-touch-icon` pointing to `/apple-touch-icon.png`
   - `theme-color` matching manifest.

4. **Vite config** (`vite.config.ts`)
   - Add `vite-plugin-pwa` with:
     - `registerType: "autoUpdate"`
     - `devOptions.enabled: false` (never in preview)
     - `workbox.navigateFallbackDenylist: [/^\/~oauth/]`
     - `workbox.runtimeCaching` with NetworkFirst for HTML navigations.
   - Manifest is read from `public/manifest.json`.

5. **Service worker registration guard** (`src/main.tsx`)
   - Before any React mount, detect iframe or Lovable preview host (`*.lovableproject.com`, `id-preview--*.lovable.app`).
   - If detected, unregister any existing SW and skip registration.
   - Otherwise, register normally via vite-plugin-pwa.

6. **Build verification**
   - Ensure `bun run build` succeeds with the new plugin.

### Technical details
- `vite-plugin-pwa` was just installed. It will auto-generate the service worker at build time.
- No service worker will run inside the Lovable editor preview, preventing stale-cache issues.
- The published/production build will get full PWA capabilities (standalone mode, offline shell, install prompt on iOS Safari → Share → Add to Home Screen).

### Risks & mitigations
| Risk | Mitigation |
|------|------------|
| SW caches stale content in preview | `devOptions.enabled: false` + host guard unregisters any stray SWs |
| OAuth redirect cached | `navigateFallbackDenylist` excludes `/~oauth` |
| iOS splash screen missing | Handled by `apple-mobile-web-app-capable` + status-bar style |

# Social Publisher — Standalone Fork Status

Branch: `safe-publish-v0`

## Goal

Keep the open-source platform adapters from MultiPost-Extension while removing runtime dependency on the MultiPost SaaS product.

## Current architecture

```
Chrome extension action
  -> local options workspace
     -> Dynamic / Video / Article editors
     -> per-platform publish mode
        -> fill-only (default)
        -> auto-publish (opt-in where supported)
     -> internal publish popup
     -> normal browser tabs on official creator pages
     -> platform-specific injected adapters
```

## Safety defaults

- Every newly selected platform defaults to `fill`.
- Xiaohongshu / Rednote is forced to `fill` and cannot be switched to auto-submit.
- Legacy `multipost.app` trusted-domain entries are removed at extension startup.
- Legacy SaaS `apiKey` and `extensionClientId` values are removed at extension startup.
- The legacy SaaS extension-link page is disabled.

## SaaS detachment completed

- Extension icon click no longer opens `multipost.app`.
- Options page no longer redirects to `multipost.app/dashboard/publish`.
- Install flow opens the local extension workspace.
- Background SaaS heartbeat/ping is no longer started.
- Account refresh no longer reports to the SaaS backend.
- Upstream Dashboard / Web Publish / About links are removed from the active local UI.

## Still inherited from upstream

- Platform DOM adapters.
- Account-detection helpers.
- Content scraper.
- Internal message names that still use the historical `MULTIPOST_` prefix.
- Some dormant source files and localization keys retained for compatibility and future upstream merges.
- Apache-2.0 license and upstream attribution.

## Next engineering passes

1. Replace inherited icon assets with Social Publisher branding.
2. Add local drafts/history.
3. Add recruitment/content-generation business layer.
4. Add publish receipts and per-platform result logging.
5. Audit each platform adapter before allowing auto-submit.
6. Keep Xiaohongshu fill-only unless the safety policy changes explicitly.

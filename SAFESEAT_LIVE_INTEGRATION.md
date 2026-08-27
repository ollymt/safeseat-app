# SafeSeat Live App Integration

## Main Hub API

- Wi-Fi SSID: `SafeSeat`
- Hub base URL: `http://192.168.4.1`
- Primary app endpoint: `GET /api/v1/status`
- Fallback reachability endpoint: `GET /health`
- Evaluator monitor: `http://192.168.4.1/uat`

The mobile app does not rerun SafeSeat ML/fusion. Main Hub Fusion is authoritative. WATCH remains a non-alert MONITORING state; it is never converted into a participant WARNING.

## Added integration layers

- `src/services/safeseat-hardware.ts` — defensive local HTTP client and payload validation
- `src/hooks/use-safeseat-hardware.ts` — one process-wide sequential polling loop
- `src/services/safeseat-session-store.ts` — local-first active UAT session cache
- `src/hooks/use-safeseat-session.ts` — session subscription hook
- `src/services/safeseat-trip-sync.ts` — best-effort cloud state/Twilio request mirror
- `src/services/safeseat-module-status.ts` — user-facing module health summaries
- `src/types/safeseat-hardware.ts` and `src/types/safeseat-session.ts`
- `plugins/with-safeseat-local-network.js` — Android cleartext/local-network native config

## Pre-build verification

```powershell
git diff --check
npm install
npx expo-doctor
npx tsc --noEmit
npm run lint
```

For the first hardware test, also open this from the physical phone browser while joined to
SafeSeat Wi-Fi:

`http://192.168.4.1/health`

Then verify the participant Home screen changes from Monitoring Unavailable/Initializing to
Monitoring Active without exposing raw telemetry.

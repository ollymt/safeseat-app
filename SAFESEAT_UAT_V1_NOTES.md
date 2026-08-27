# SafeSeat UAT V1 — Live Single-Prototype App

This branch is the UAT/defense integration for one complete movable SafeSeat prototype.
The Main Hub remains authoritative for monitoring and emergency decisions; the app is the
participant-facing presentation/session layer.

## One physical prototype, five logical positions

Before the first Lock Deployment of a session, choose where the physical SafeSeat apron and
camera are installed:

1. Driver
2. Front Passenger
3. Rear Left
4. Rear Center
5. Rear Right

Only the selected logical position receives the live Main Hub Fusion state. Other assigned
seats display **NOT MONITORED**. After the first Lock Deployment, the prototype position is
fixed until **End Session** so software cannot disagree with the physical installation.

## Session semantics

- **Lock Deployment** — starts or resumes monitoring.
- **Unlock Deployment** — pauses monitoring and allows occupant reassignment; it does not end
  or archive the session and does not allow prototype relocation.
- **End Session** — ends the session, clears the local active session, removes temporary Guest
  assignments, and permits prototype relocation.

The active UAT session is cached locally with AsyncStorage so assignment/lock state remains
usable even while the phone is connected to the SafeSeat local-only access point. Firestore is
best-effort mirroring/history, not the live monitoring source.

## Guest / Temporary Occupant

The assignment sheet always offers **Guest / Temporary Occupant**. Guest mode does not create
a permanent profile. Guest identity is excluded from archived trip assignments. This also
allows UAT assignment to continue when cloud profile lookup is temporarily unavailable.

## Participant vs evaluator interfaces

The participant app shows:

- monitoring Active / Initializing / Unavailable;
- the one active prototype position;
- MONITORING while Main Hub Fusion is in WATCH/warm-up, then SAFE / WARNING / EMERGENCY for that monitored seat;
- NOT MONITORED for other assigned logical seats;
- emergency UI;
- System Self-Diagnostic module readiness.

The participant app does **not** display raw HR, RR, temperature, pressure, MPU values, model
scores, or camera confidence.

`WATCH` is intentionally **not** converted into WARNING. It is shown as **MONITORING** so normal warm-up/conservative Fusion behavior cannot create a false participant warning.

The evaluator uses the Main Hub browser monitor separately:

`http://192.168.4.1/uat`

Raw evaluator recordings remain local to the evaluator device unless deliberately exported.

## Local API reliability contract

Normal participant polling uses `GET /api/v1/status` first. `GET /health` is only a fallback.
The app uses one shared polling loop even if Home and Diagnostics are both mounted.

The networking layer:

- waits for each poll to complete before scheduling the next one;
- prevents overlapping requests;
- uses a finite request timeout;
- cache-busts local API requests;
- validates/parses JSON before accepting it;
- catches `Failed to fetch`, `Network request failed`, timeout, HTTP, and malformed-payload
  failures inside the hardware service;
- retains last-known-good telemetry only for diagnostics/history but never presents stale data
  as a live SAFE state;
- automatically resumes when the Main Hub becomes reachable again.

A temporary Wi-Fi/API problem therefore becomes **Monitoring Unavailable** rather than an
uncaught fetch exception.

## Android UAT / defense

Android is delivered as a standalone EAS preview APK. The local-network config plugin enables
HTTP access to the Main Hub at `192.168.4.1` in the generated Android native project.

Recommended build:

```powershell
npx expo-doctor
eas build --platform android --profile preview --clear-cache
```

After installation, Metro/Expo Go are not required for Android monitoring.

## iPhone UAT / defense without a paid Apple Developer membership

The UAT branch intentionally removes the unused `react-native-picker` and
`react-native-image-colors` native dependencies so the project stays compatible with Expo Go
as far as application dependencies are concerned.

The dependable physical-iPhone UAT path is Expo Go + Metro on a Windows laptop. The laptop and
iPhone join the same SafeSeat Wi-Fi and communicate wirelessly; no Mac or USB tether is needed.
The laptop can remain out of sight during the dashboard/vehicle demonstration.

Before UAT/defense, install/re-sign the SDK-compatible Expo Go on the iPhone while Internet is
available. During the local-only SafeSeat demo, start Metro from the project on Windows and
open the project on the iPhone. Test this exact workflow before formal UAT.

Project-specific native config plugins do not modify the Expo Go binary, so iPhone local-HTTP
connectivity must be proven on the real device rather than assumed from the Android APK.

## Driver-only automated SMS escalation

The included Firebase Function scaffold is eligible only when:

- the physical prototype is mapped to Seat 1 / Driver;
- Main Hub Fusion is `EMERGENCY`;
- Main Hub sets `alert_requested=true`; and
- the user's Emergency Escalation setting and primary emergency contact permit sending.

Passenger/rear-seat emergencies never create automatic external SMS requests. The driver is
first responder for passenger alerts. Twilio credentials remain in Firebase Functions secrets,
never in the mobile app.

Do not deploy/configure Twilio until the local app↔Main Hub UAT flow is stable.

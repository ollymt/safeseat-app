# SafeSeat Driver-Only Twilio SMS Backend

This Firebase Cloud Function sends an automated SMS only when:

1. Main Hub Fusion reaches `EMERGENCY` for Seat 1 / Driver;
2. Main Hub reports `alert_requested=true`;
3. the app queues `users/{uid}/alertRequests/{alertId}`;
4. `settings/preferences.emergencyEscalation` is not disabled; and
5. a primary emergency contact exists.

Passenger seats never create automatic SMS escalation jobs.

## Required Twilio secrets

From the project root, after installing Firebase CLI and initializing/using the `safeseat-app` Firebase project:

```powershell
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_FROM_NUMBER
```

The primary emergency contact phone must use E.164 format, e.g. `+639XXXXXXXXX`.

Install backend dependencies and deploy:

```powershell
cd functions
npm install
cd ..
firebase deploy --only functions:sendDriverEmergencySms
```

The Twilio credentials are never stored in the React Native app or committed to Git.

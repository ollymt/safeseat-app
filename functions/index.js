const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = defineSecret("TWILIO_FROM_NUMBER");

/**
 * Driver-only SafeSeat automated SMS escalation.
 *
 * The mobile app creates a pending alert request only after Main Hub Fusion
 * enters EMERGENCY for Seat 1 and Fusion sets alert_requested=true.
 * Passenger seats are rejected here even if a malformed client write occurs.
 */
exports.sendDriverEmergencySms = onDocumentCreated(
  {
    document: "users/{uid}/alertRequests/{alertId}",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const request = snapshot.data() || {};
    const uid = event.params.uid;
    const requestRef = snapshot.ref;

    if (
      request.kind !== "driver_confirmed_emergency" ||
      Number(request.seatNo) !== 1 ||
      request.source !== "safeseat_main_hub" ||
      request.status !== "pending"
    ) {
      await requestRef.set(
        {
          status: "rejected",
          failureReason: "Request did not satisfy driver-only SafeSeat escalation rules.",
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const preferencesRef = admin
      .firestore()
      .doc(`users/${uid}/settings/preferences`);
    const preferencesSnap = await preferencesRef.get();
    const escalationEnabled =
      !preferencesSnap.exists ||
      preferencesSnap.data()?.emergencyEscalation !== false;

    if (!escalationEnabled) {
      await requestRef.set(
        {
          status: "skipped",
          failureReason: "Driver automated SMS escalation is disabled in user settings.",
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const contactsSnap = await admin
      .firestore()
      .collection(`users/${uid}/emergencyContacts`)
      .get();

    if (contactsSnap.empty) {
      await requestRef.set(
        {
          status: "failed",
          failureReason: "No emergency contact is configured for automated SMS.",
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const sortedContacts = contactsSnap.docs
      .map((doc) => ({ doc, data: doc.data() || {} }))
      .sort((a, b) => {
        const ah = Number(a.data.hierarchy || 999);
        const bh = Number(b.data.hierarchy || 999);
        return ah - bh;
      });

    const contactDoc = sortedContacts[0].doc;
    const contact = sortedContacts[0].data;
    const rawPhone = String(contact.phone || "").replace(/[\s()-]/g, "");
    const to = rawPhone.startsWith("09") && rawPhone.length === 11
      ? `+63${rawPhone.slice(1)}`
      : rawPhone.startsWith("63")
        ? `+${rawPhone}`
        : rawPhone;

    if (!to.startsWith("+") || to.length < 8) {
      await requestRef.set(
        {
          status: "failed",
          failureReason: "Primary emergency contact phone number is not valid for SMS delivery.",
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    try {
      const client = twilio(
        TWILIO_ACCOUNT_SID.value(),
        TWILIO_AUTH_TOKEN.value(),
      );

      const occurredAt = request.occurredAt || "the current monitoring session";
      const message = await client.messages.create({
        from: TWILIO_FROM_NUMBER.value(),
        to,
        body:
          `SafeSeat automated alert: a confirmed DRIVER emergency was detected (${occurredAt}). ` +
          "Please check on or contact the driver immediately. SafeSeat is a research safety-monitoring system and does not provide a medical diagnosis.",
      });

      await requestRef.set(
        {
          status: "sent",
          provider: "twilio",
          providerMessageSid: message.sid,
          recipientContactId: contactDoc.id,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Twilio SMS send failed", error);
      await requestRef.set(
        {
          status: "failed",
          failureReason:
            error instanceof Error ? error.message : "Twilio SMS send failed.",
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      throw error;
    }
  },
);

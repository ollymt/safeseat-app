import { arrayUnion, doc, writeBatch } from "firebase/firestore";

import { db } from "@/firebase";
import type { SafeSeatHardwareStatus } from "@/types/safeseat-hardware";

export type PersistedSeatState = "safe" | "warning" | "emergency";

type SyncHardwareTransitionArgs = {
  uid: string;
  seatNo: number;
  previousSeatState?: string;
  seatState: PersistedSeatState;
  telemetry: SafeSeatHardwareStatus;
};

/**
 * Mirrors only safety state / module availability into Firestore.
 *
 * Raw physiological/pressure/motion values remain local to the Main Hub and
 * the evaluator-only UAT monitor. Firestore is not the live source of truth.
 *
 * When Main Hub Fusion confirms a DRIVER emergency and explicitly requests an
 * alert, an alert-request document is queued for the secured Twilio backend.
 * Passenger seats never create automatic SMS requests.
 */
export async function syncHardwareTransitionToActiveTrip({
  uid,
  seatNo,
  previousSeatState,
  seatState,
  telemetry,
}: SyncHardwareTransitionArgs) {
  const tripDocRef = doc(db, "users", uid, "activeTrip", "current");
  const enteredEmergency =
    seatState === "emergency" && previousSeatState !== "emergency";
  const shouldQueueDriverSms =
    seatNo === 1 && enteredEmergency && telemetry.system.alert_requested;
  const occurredAt = new Date().toISOString();

  const batch = writeBatch(db);

  batch.set(
    tripDocRef,
    {
      seatStatuses: {
        [String(seatNo)]: seatState,
      },
      hardware: {
        seatNo,
        source: "main_hub_local_api",
        appReceivedAt: occurredAt,
        hubUptimeMs: telemetry.uptime_ms,
        schemaVersion: telemetry.schema_version,
        fusionState: telemetry.system.fusion_state,
        fusionValid: telemetry.system.fusion_valid,
        fusionConfidence: telemetry.system.confidence,
        occupancy: telemetry.system.occupancy,
        emergencyActive: telemetry.system.emergency_active,
        cameraVerificationRequested:
          telemetry.system.camera_verification_requested,
        alertRequested: telemetry.system.alert_requested,
        modules: {
          c1001: {
            connected: telemetry.sensors.c1001.connected,
            stale: telemetry.sensors.c1001.stale,
            trustedVitals: telemetry.sensors.c1001.trusted_vitals,
          },
          mlx90614: {
            connected: telemetry.sensors.mlx90614.connected,
            valid: telemetry.sensors.mlx90614.valid,
          },
          fsr: {
            connected: telemetry.sensors.fsr.connected,
            calibrated: telemetry.sensors.fsr.calibrated,
            occupied: telemetry.sensors.fsr.occupied,
          },
          mpu6050: {
            connected: telemetry.sensors.mpu6050.connected,
            valid: telemetry.sensors.mpu6050.valid,
          },
          camera: {
            connected: telemetry.camera.connected,
            ready: telemetry.camera.camera_ready,
            busy: telemetry.camera.busy,
            resultValid: telemetry.camera.result_valid,
          },
        },
      },
      ...(enteredEmergency
        ? {
            emergencyEvents: arrayUnion({
              seatNo,
              occurredAt,
              source: "SafeSeat Main Hub",
            }),
          }
        : {}),
    },
    { merge: true },
  );

  if (shouldQueueDriverSms) {
    // Hub timestamp is monotonic for this boot and the write is only generated
    // on an actual transition into EMERGENCY, giving us a deterministic ID and
    // preventing the 1 Hz polling loop from producing duplicate SMS jobs.
    const alertId = `driver-${telemetry.timestamp_ms}`;
    const alertRef = doc(db, "users", uid, "alertRequests", alertId);

    batch.set(alertRef, {
      kind: "driver_confirmed_emergency",
      seatNo: 1,
      monitoredSeatNo: seatNo,
      prototypeMode: "single_seat_uat",
      source: "safeseat_main_hub",
      status: "pending",
      occurredAt,
      fusionState: telemetry.system.fusion_state,
      fusionConfidence: telemetry.system.confidence,
      cameraVerificationRequested:
        telemetry.system.camera_verification_requested,
      createdByApp: true,
    });
  }

  await batch.commit();
}

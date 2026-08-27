import { useSafeSeatHardware } from "@/hooks/use-safeseat-hardware";
import { useSafeSeatSession } from "@/hooks/use-safeseat-session";
import { updateSafeSeatSession } from "@/services/safeseat-session-store";
import { syncHardwareTransitionToActiveTrip } from "@/services/safeseat-trip-sync";
import { useEffect } from "react";

import { auth } from "@/firebase";

/**
 * Invisible tab-level monitor.
 *
 * It keeps the one shared Main Hub polling loop alive for the duration of a
 * locked deployment even if the participant switches away from Home. Main Hub
 * Fusion is copied into local session state; Firestore is best-effort only.
 */
export default function SafeSeatLiveMonitor() {
  const { ready, session } = useSafeSeatSession();
  const monitoredSeatAssigned = Boolean(session.assignments[session.monitoredSeatNo]);
  const hardware = useSafeSeatHardware({
    enabled: ready && session.isLockedIn && monitoredSeatAssigned,
  });

  useEffect(() => {
    if (!hardware.isOnline || !hardware.telemetry || !hardware.fusionSeatState) {
      return;
    }

    const seatNo = session.monitoredSeatNo;
    const nextState = hardware.fusionSeatState;
    const previousState = session.seatStatuses[seatNo];

    if (previousState === nextState) return;

    const occurredAt = new Date().toISOString();
    updateSafeSeatSession((current) => ({
      ...current,
      seatStatuses: {
        ...current.seatStatuses,
        [seatNo]: nextState,
      },
      emergencyEvents:
        nextState === "emergency" && previousState !== "emergency"
          ? [
              ...current.emergencyEvents,
              { seatNo, occurredAt, source: "SafeSeat Main Hub" },
            ]
          : current.emergencyEvents,
    }));

    const currentUser = auth.currentUser;
    if (currentUser) {
      void syncHardwareTransitionToActiveTrip({
        uid: currentUser.uid,
        seatNo,
        previousSeatState: previousState,
        seatState: nextState,
        telemetry: hardware.telemetry,
      }).catch((error) => {
        console.warn("SafeSeat cloud transition mirror deferred:", error);
      });
    }
  }, [
    hardware.fusionSeatState,
    hardware.isOnline,
    hardware.telemetry,
    session.monitoredSeatNo,
    session.seatStatuses,
  ]);

  return null;
}

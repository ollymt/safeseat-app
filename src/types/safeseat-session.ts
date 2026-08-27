export type SafeSeatSeatNo = 1 | 2 | 3 | 4 | 5;
export type SafeSeatPersistedSeatState = "safe" | "warning" | "emergency";

export type SafeSeatAssignment = {
  id: string;
  name: string;
  photoURL?: string | null;
  icon?: string | null;
  isAccountOwner?: boolean;
  isGuest?: boolean;
  sessionOnly?: boolean;
};

export type SafeSeatEmergencyEvent = {
  seatNo: SafeSeatSeatNo;
  occurredAt: string;
  source?: string;
};

export type SafeSeatActiveSession = {
  monitoredSeatNo: SafeSeatSeatNo;
  assignments: Record<number, SafeSeatAssignment>;
  isLockedIn: boolean;
  lockedInAt: string | null;
  seatStatuses: Record<number, SafeSeatPersistedSeatState>;
  emergencyEvents: SafeSeatEmergencyEvent[];
};

export const SAFESEAT_SEATS: Array<{
  seatNo: SafeSeatSeatNo;
  seatCode: string;
  label: string;
}> = [
  { seatNo: 1, seatCode: "driver", label: "Driver" },
  { seatNo: 2, seatCode: "passenger", label: "Front Passenger" },
  { seatNo: 3, seatCode: "l backseat", label: "Rear Left" },
  { seatNo: 4, seatCode: "c backseat", label: "Rear Center" },
  { seatNo: 5, seatCode: "r backseat", label: "Rear Right" },
];

export const DEFAULT_MONITORED_SEAT_NO: SafeSeatSeatNo = 1;

export function createEmptySafeSeatSession(): SafeSeatActiveSession {
  return {
    monitoredSeatNo: DEFAULT_MONITORED_SEAT_NO,
    assignments: {},
    isLockedIn: false,
    lockedInAt: null,
    seatStatuses: {},
    emergencyEvents: [],
  };
}

export function normalizeSafeSeatSeatNo(value: unknown): SafeSeatSeatNo {
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 5
    ? (parsed as SafeSeatSeatNo)
    : DEFAULT_MONITORED_SEAT_NO;
}

export function getSafeSeatLabel(seatNo: number): string {
  return SAFESEAT_SEATS.find((seat) => seat.seatNo === seatNo)?.label ?? `Seat ${seatNo}`;
}

export function createGuestAssignment(seatNo: SafeSeatSeatNo): SafeSeatAssignment {
  return {
    id: `guest-${seatNo}-${Date.now()}`,
    name: "Guest Occupant",
    photoURL: null,
    icon: null,
    isAccountOwner: false,
    isGuest: true,
    sessionOnly: true,
  };
}

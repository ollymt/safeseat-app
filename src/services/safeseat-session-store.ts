import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createEmptySafeSeatSession,
  normalizeSafeSeatSeatNo,
  type SafeSeatActiveSession,
} from "@/types/safeseat-session";

const ACTIVE_SESSION_KEY = "safeseat_active_session_v1";

export type SafeSeatSessionSnapshot = {
  ready: boolean;
  session: SafeSeatActiveSession;
};

const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let snapshot: SafeSeatSessionSnapshot = {
  ready: false,
  session: createEmptySafeSeatSession(),
};

function normalizeSession(value: unknown): SafeSeatActiveSession {
  if (!value || typeof value !== "object") return createEmptySafeSeatSession();
  const raw = value as Partial<SafeSeatActiveSession>;

  return {
    monitoredSeatNo: normalizeSafeSeatSeatNo(raw.monitoredSeatNo),
    assignments: raw.assignments && typeof raw.assignments === "object" ? raw.assignments : {},
    isLockedIn: Boolean(raw.isLockedIn),
    lockedInAt: typeof raw.lockedInAt === "string" ? raw.lockedInAt : null,
    seatStatuses:
      raw.seatStatuses && typeof raw.seatStatuses === "object" ? raw.seatStatuses : {},
    emergencyEvents: Array.isArray(raw.emergencyEvents) ? raw.emergencyEvents : [],
  };
}

function emit(next: SafeSeatSessionSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

async function persist(session: SafeSeatActiveSession) {
  try {
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("SafeSeat session cache could not be saved:", error);
  }
}

export async function ensureSafeSeatSessionLoaded() {
  if (snapshot.ready) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      const session = raw ? normalizeSession(JSON.parse(raw)) : createEmptySafeSeatSession();
      emit({ ready: true, session });
    } catch (error) {
      console.warn("SafeSeat session cache could not be read; starting clean:", error);
      emit({ ready: true, session: createEmptySafeSeatSession() });
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function subscribeSafeSeatSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSafeSeatSessionSnapshot() {
  return snapshot;
}

export function updateSafeSeatSession(
  updater:
    | Partial<SafeSeatActiveSession>
    | ((current: SafeSeatActiveSession) => SafeSeatActiveSession),
) {
  const current = snapshot.session;
  const next =
    typeof updater === "function"
      ? updater(current)
      : { ...current, ...updater };

  emit({ ready: true, session: next });
  void persist(next);
  return next;
}

export async function clearSafeSeatSession() {
  const next = createEmptySafeSeatSession();
  emit({ ready: true, session: next });
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (error) {
    console.warn("SafeSeat session cache could not be cleared:", error);
  }
}

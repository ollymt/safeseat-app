import { useEffect, useSyncExternalStore } from "react";

import {
  fusionStateToSeatState,
  probeSafeSeatHub,
} from "@/services/safeseat-hardware";
import type {
  SafeSeatHardwareConnectionState,
  SafeSeatHardwareStatus,
  SafeSeatHubHealth,
} from "@/types/safeseat-hardware";

type UseSafeSeatHardwareOptions = {
  enabled?: boolean;
};

type HardwareSnapshot = {
  telemetry: SafeSeatHardwareStatus | null;
  health: SafeSeatHubHealth | null;
  connectionState: SafeSeatHardwareConnectionState;
  lastContactAt: number | null;
  lastTelemetryAt: number | null;
  lastAttemptAt: number | null;
  errorMessage: string | null;
};

const POLL_DELAY_MS = 1250;
const STALE_AFTER_MS = 7000;

const listeners = new Set<() => void>();
let consumerCount = 0;
let generation = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let pollPromise: Promise<void> | null = null;

let snapshot: HardwareSnapshot = {
  telemetry: null,
  health: null,
  connectionState: "idle",
  lastContactAt: null,
  lastTelemetryAt: null,
  lastAttemptAt: null,
  errorMessage: null,
};

function emit(next: Partial<HardwareSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

async function pollOnce(): Promise<void> {
  if (pollPromise) return pollPromise;

  emit({ lastAttemptAt: Date.now() });

  pollPromise = (async () => {
    try {
      const result = await probeSafeSeatHub();
      const receivedAt = Date.now();

      if (result.telemetry) {
        emit({
          telemetry: result.telemetry,
          health: result.health,
          connectionState: "online",
          lastContactAt: receivedAt,
          lastTelemetryAt: receivedAt,
          errorMessage: null,
        });
      } else {
        // Keep the last known-good telemetry for diagnostics/history, but mark
        // the live connection degraded so UI never presents it as current.
        emit({
          health: result.health,
          connectionState: "degraded",
          lastContactAt: receivedAt,
          errorMessage: result.degradedReason,
        });
      }
    } catch (error) {
      emit({
        connectionState: "offline",
        errorMessage:
          error instanceof Error
            ? error.message
            : "SafeSeat Main Hub unavailable. Keep this phone on the SafeSeat Wi-Fi.",
      });
    } finally {
      pollPromise = null;
    }
  })();

  return pollPromise;
}

function scheduleLoop(loopGeneration: number) {
  if (consumerCount <= 0 || loopGeneration !== generation) return;

  timer = setTimeout(async () => {
    await pollOnce();
    scheduleLoop(loopGeneration);
  }, POLL_DELAY_MS);
}

function startPolling() {
  consumerCount += 1;

  if (consumerCount !== 1) {
    return () => stopPolling();
  }

  generation += 1;
  const loopGeneration = generation;
  emit({ connectionState: "connecting", errorMessage: null });

  void pollOnce().finally(() => scheduleLoop(loopGeneration));
  return () => stopPolling();
}

function stopPolling() {
  consumerCount = Math.max(0, consumerCount - 1);
  if (consumerCount > 0) return;

  generation += 1;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  emit({ connectionState: "idle" });
}

export async function refreshSafeSeatHardware() {
  await pollOnce();
}

export function useSafeSeatHardware({ enabled = true }: UseSafeSeatHardwareOptions = {}) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!enabled) return;
    return startPolling();
  }, [enabled]);

  const now = Date.now();
  const isReachable =
    enabled &&
    (state.connectionState === "online" || state.connectionState === "degraded") &&
    state.lastContactAt !== null &&
    now - state.lastContactAt <= STALE_AFTER_MS;

  const isOnline =
    isReachable &&
    state.connectionState === "online" &&
    state.lastTelemetryAt !== null &&
    now - state.lastTelemetryAt <= STALE_AFTER_MS;

  // Never map stale last-known-good telemetry into a live seat state.
  const fusionSeatState = isOnline && state.telemetry
    ? fusionStateToSeatState(state.telemetry.system.fusion_state)
    : null;

  return {
    ...state,
    isReachable,
    isOnline,
    fusionSeatState,
    refresh: refreshSafeSeatHardware,
  };
}

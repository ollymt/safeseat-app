import type {
  SafeSeatFusionState,
  SafeSeatHardwareStatus,
  SafeSeatHubHealth,
} from "@/types/safeseat-hardware";

const configuredHubUrl = process.env.EXPO_PUBLIC_SAFESEAT_HUB_URL?.trim();

export const SAFESEAT_HUB_BASE_URL = (
  configuredHubUrl || "http://192.168.4.1"
).replace(/\/+$/, "");

export const SAFESEAT_HEALTH_URL = `${SAFESEAT_HUB_BASE_URL}/health`;
export const SAFESEAT_STATUS_URL = `${SAFESEAT_HUB_BASE_URL}/api/v1/status`;

const DEFAULT_TIMEOUT_MS = 4500;
const HEALTH_FALLBACK_TIMEOUT_MS = 2200;
const SHARED_PROBE_WINDOW_MS = 350;

export type SafeSeatHardwareErrorCode =
  | "timeout"
  | "network"
  | "http"
  | "invalid_payload"
  | "telemetry_not_ready";

export class SafeSeatHardwareError extends Error {
  readonly code: SafeSeatHardwareErrorCode;

  constructor(code: SafeSeatHardwareErrorCode, message: string) {
    super(message);
    this.name = "SafeSeatHardwareError";
    this.code = code;
  }
}

function isHealthPayload(value: unknown): value is SafeSeatHubHealth {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<SafeSeatHubHealth>;
  return payload.ok === true && typeof payload.telemetry_ready === "boolean";
}

function isFusionState(value: unknown): value is SafeSeatFusionState {
  return (
    value === "SAFE" ||
    value === "WATCH" ||
    value === "WARNING" ||
    value === "EMERGENCY"
  );
}

function isStatusPayload(value: unknown): value is SafeSeatHardwareStatus {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<SafeSeatHardwareStatus>;
  return (
    payload.telemetry_ready === true &&
    typeof payload.schema_version === "string" &&
    typeof payload.uptime_ms === "number" &&
    Boolean(payload.system) &&
    payload.system?.fusion_authoritative === true &&
    isFusionState(payload.system?.fusion_state) &&
    Boolean(payload.sensors) &&
    Boolean(payload.camera)
  );
}

function normalizeNetworkError(error: unknown): SafeSeatHardwareError {
  if (error instanceof SafeSeatHardwareError) return error;

  if (error instanceof Error && error.name === "AbortError") {
    return new SafeSeatHardwareError(
      "timeout",
      "The SafeSeat Main Hub did not answer in time.",
    );
  }

  const nativeMessage = error instanceof Error ? error.message : String(error ?? "");
  const genericNetworkFailure =
    !nativeMessage ||
    nativeMessage === "Network request failed" ||
    nativeMessage === "Failed to fetch" ||
    nativeMessage.includes("Network request failed") ||
    nativeMessage.includes("Failed to fetch");

  return new SafeSeatHardwareError(
    "network",
    genericNetworkFailure
      ? "Unable to reach the SafeSeat Main Hub. Keep this phone connected to the SafeSeat Wi-Fi and confirm http://192.168.4.1/health opens in the phone browser."
      : nativeMessage,
  );
}

async function requestJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const separator = url.includes("?") ? "&" : "?";
  const cacheBustedUrl = `${url}${separator}_=${Date.now()}`;

  try {
    const response = await fetch(cacheBustedUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new SafeSeatHardwareError(
        "http",
        `Main Hub returned HTTP ${response.status}.`,
      );
    }

    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch {
      throw new SafeSeatHardwareError(
        "invalid_payload",
        `Main Hub responded, but the payload was not valid JSON (${body.length} bytes).`,
      );
    }
  } catch (error) {
    throw normalizeNetworkError(error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSafeSeatHubHealth(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SafeSeatHubHealth> {
  const payload = await requestJson(SAFESEAT_HEALTH_URL, timeoutMs);
  if (!isHealthPayload(payload)) {
    throw new SafeSeatHardwareError(
      "invalid_payload",
      "Main Hub /health responded, but the payload was not recognized.",
    );
  }
  return payload;
}

export async function fetchSafeSeatHardwareStatus(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SafeSeatHardwareStatus> {
  const payload = await requestJson(SAFESEAT_STATUS_URL, timeoutMs);

  if (
    payload &&
    typeof payload === "object" &&
    (payload as { telemetry_ready?: boolean }).telemetry_ready === false
  ) {
    throw new SafeSeatHardwareError(
      "telemetry_not_ready",
      "Main Hub is reachable, but telemetry is still initializing.",
    );
  }

  if (!isStatusPayload(payload)) {
    throw new SafeSeatHardwareError(
      "invalid_payload",
      "Main Hub status responded, but the telemetry payload was not recognized.",
    );
  }

  return payload;
}

export type SafeSeatHubProbe = {
  health: SafeSeatHubHealth | null;
  telemetry: SafeSeatHardwareStatus | null;
  degradedReason: string | null;
};

function healthFromTelemetry(telemetry: SafeSeatHardwareStatus): SafeSeatHubHealth {
  return {
    ok: true,
    service: telemetry.device || "SafeSeat Main Hub",
    api_version: telemetry.schema_version,
    uptime_ms: telemetry.uptime_ms,
    telemetry_ready: true,
    read_only: true,
  };
}

async function performSafeSeatHubProbe(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SafeSeatHubProbe> {
  // Normal operation deliberately uses ONE request: /api/v1/status.
  // /health is only a fallback so the ESP32 is not double-polled every cycle.
  try {
    const telemetry = await fetchSafeSeatHardwareStatus(timeoutMs);
    return {
      health: healthFromTelemetry(telemetry),
      telemetry,
      degradedReason: null,
    };
  } catch (statusError) {
    const statusMessage =
      statusError instanceof Error
        ? statusError.message
        : "Live telemetry could not be read.";

    try {
      const health = await fetchSafeSeatHubHealth(
        Math.min(timeoutMs, HEALTH_FALLBACK_TIMEOUT_MS),
      );
      return {
        health,
        telemetry: null,
        degradedReason:
          statusError instanceof SafeSeatHardwareError &&
          statusError.code === "telemetry_not_ready"
            ? "Hub reachable; telemetry is still initializing."
            : `Hub reachable; live telemetry is temporarily unavailable. ${statusMessage}`,
      };
    } catch (healthError) {
      const healthMessage =
        healthError instanceof Error
          ? healthError.message
          : "Main Hub health check failed.";

      throw new SafeSeatHardwareError(
        "network",
        `SafeSeat Main Hub is unavailable. ${statusMessage} ${healthMessage}`,
      );
    }
  }
}

let sharedProbePromise: Promise<SafeSeatHubProbe> | null = null;
let lastSharedProbe: { at: number; result: SafeSeatHubProbe } | null = null;

export async function probeSafeSeatHub(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SafeSeatHubProbe> {
  const now = Date.now();

  if (
    lastSharedProbe &&
    now - lastSharedProbe.at <= SHARED_PROBE_WINDOW_MS
  ) {
    return lastSharedProbe.result;
  }

  if (sharedProbePromise) return sharedProbePromise;

  sharedProbePromise = performSafeSeatHubProbe(timeoutMs)
    .then((result) => {
      lastSharedProbe = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      sharedProbePromise = null;
    });

  return sharedProbePromise;
}

export function fusionStateToSeatState(
  fusionState: SafeSeatFusionState,
): "safe" | "warning" | "emergency" | null {
  switch (fusionState) {
    case "EMERGENCY":
      return "emergency";
    case "WARNING":
      return "warning";
    case "SAFE":
      return "safe";
    case "WATCH":
    default:
      // WATCH is a conservative fusion/initialization state, not a participant
      // warning. Keep it distinct so the UI never turns ordinary warm-up into
      // a false WARNING.
      return null;
  }
}

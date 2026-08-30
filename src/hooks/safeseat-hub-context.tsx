import {
  fetchSafeSeatStatus,
  fusionStateToSeatState,
  getSafeSeatHubUrl,
  SafeSeatHubConnectionState,
  SafeSeatStatusPayload,
} from "@/services/safeseat-hub";
import {
  AppState,
  AppStateStatus,
} from "react-native";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SafeSeatHubContextValue = {
  hubUrl: string;
  connectionState: SafeSeatHubConnectionState;
  connected: boolean;
  telemetryReady: boolean;
  status: SafeSeatStatusPayload | null;
  seatState: "safe" | "warning" | "emergency" | "unknown";
  lastUpdatedAt: number | null;
  lastError: string | null;
  refresh: () => Promise<SafeSeatStatusPayload | null>;
};

const SafeSeatHubContext = createContext<SafeSeatHubContextValue | undefined>(undefined);

const CONNECTED_POLL_MS = 1000;
const DISCONNECTED_POLL_MS = 3000;

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "Main Hub request timed out";
    return error.message;
  }
  return "Main Hub unavailable";
}

export function SafeSeatHubProvider({ children }: { children: ReactNode }) {
  const hubUrl = useMemo(() => getSafeSeatHubUrl(), []);
  const [connectionState, setConnectionState] = useState<SafeSeatHubConnectionState>("idle");
  const [status, setStatus] = useState<SafeSeatStatusPayload | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const mountedRef = useRef(true);
  const activeRequestRef = useRef<Promise<SafeSeatStatusPayload | null> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback((): Promise<SafeSeatStatusPayload | null> => {
    if (activeRequestRef.current) return activeRequestRef.current;

    const request = (async () => {
      setConnectionState((current) => (current === "idle" ? "connecting" : current));

      try {
        const payload = await fetchSafeSeatStatus(hubUrl);
        if (!mountedRef.current) return payload;

        setStatus(payload);
        setLastUpdatedAt(Date.now());
        setLastError(null);
        setConnectionState("connected");
        return payload;
      } catch (error) {
        if (!mountedRef.current) return null;

        // A missing SafeSeat AP is an expected state while the phone is on a
        // normal Wi-Fi network. Keep this controlled and user-facing instead of
        // emitting repeated red-screen/Metro fetch errors.
        setConnectionState("unavailable");
        setLastError(getErrorText(error));
        return null;
      }
    })();

    activeRequestRef.current = request;
    void request.finally(() => {
      if (activeRequestRef.current === request) activeRequestRef.current = null;
    });
    return request;
  }, [hubUrl]);

  useEffect(() => {
    mountedRef.current = true;

    const clearTimer = () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const scheduleNext = (delay: number) => {
      clearTimer();
      pollTimerRef.current = setTimeout(async () => {
        if (appStateRef.current !== "active") {
          scheduleNext(DISCONNECTED_POLL_MS);
          return;
        }

        const result = await refresh();
        scheduleNext(result ? CONNECTED_POLL_MS : DISCONNECTED_POLL_MS);
      }, delay);
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active") {
        void refresh();
        scheduleNext(CONNECTED_POLL_MS);
      } else {
        clearTimer();
      }
    });

    void refresh().then((result) => {
      scheduleNext(result ? CONNECTED_POLL_MS : DISCONNECTED_POLL_MS);
    });

    return () => {
      mountedRef.current = false;
      clearTimer();
      subscription.remove();
    };
  }, [refresh]);

  const value = useMemo<SafeSeatHubContextValue>(() => {
    const connected = connectionState === "connected";
    return {
      hubUrl,
      connectionState,
      connected,
      telemetryReady: Boolean(connected && status?.telemetry_ready),
      status,
      seatState: connected ? fusionStateToSeatState(status) : "unknown",
      lastUpdatedAt,
      lastError,
      refresh,
    };
  }, [connectionState, hubUrl, lastError, lastUpdatedAt, refresh, status]);

  return <SafeSeatHubContext.Provider value={value}>{children}</SafeSeatHubContext.Provider>;
}

export function useSafeSeatHub(): SafeSeatHubContextValue {
  const context = useContext(SafeSeatHubContext);
  if (!context) {
    throw new Error("useSafeSeatHub must be used within SafeSeatHubProvider");
  }
  return context;
}

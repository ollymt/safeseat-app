import { useEffect, useSyncExternalStore } from "react";

import {
  ensureSafeSeatSessionLoaded,
  getSafeSeatSessionSnapshot,
  subscribeSafeSeatSession,
} from "@/services/safeseat-session-store";

export function useSafeSeatSession() {
  const snapshot = useSyncExternalStore(
    subscribeSafeSeatSession,
    getSafeSeatSessionSnapshot,
    getSafeSeatSessionSnapshot,
  );

  useEffect(() => {
    void ensureSafeSeatSessionLoaded();
  }, []);

  return snapshot;
}

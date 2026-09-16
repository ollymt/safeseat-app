import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const IS_LOCKED_IN_KEY = "isLockedIn";
const GUIDE_KEY_PREFIX = "safeseat_driver_guide_completed";

export type DriverGuideStepId =
  | "welcome"
  | "dashboard"
  | "seats"
  | "consent"
  | "sensor"
  | "start"
  | "alerts";

export type DriverGuideStep = {
  id: DriverGuideStepId;
  eyebrow: string;
  title: string;
  body: string;
};

export const DRIVER_GUIDE_STEPS: DriverGuideStep[] = [
  {
    id: "welcome",
    eyebrow: "WELCOME TO SAFESEAT",
    title: "A quick guide before your first trip",
    body: "This guide demonstrates the full trip flow. It never changes your real seat assignments, consent, connection, or monitoring session.",
  },
  {
    id: "dashboard",
    eyebrow: "1 OF 6 · HOME",
    title: "See the whole cabin at a glance",
    body: "Home keeps all five seats visible. During monitoring, each assigned seat shows its own live SafeSeat status.",
  },
  {
    id: "seats",
    eyebrow: "2 OF 6 · SEATS",
    title: "Assign who is sitting where",
    body: "On Seats, choose a seat on the car and select the person sitting there.",
  },
  {
    id: "consent",
    eyebrow: "3 OF 6 · CONSENT",
    title: "Confirm consent for passengers",
    body: "Passenger seats require consent before monitoring. The logged-in account owner in the Driver seat is ready automatically.",
  },
  {
    id: "sensor",
    eyebrow: "4 OF 6 · CONNECTION",
    title: "Check that SafeSeat is ready",
    body: "The monitored seat should show a live SafeSeat connection before you begin. If it is offline, monitoring will not start.",
  },
  {
    id: "start",
    eyebrow: "5 OF 6 · START",
    title: "Start monitoring when ready",
    body: "When the monitored seat is assigned, consented, and connected, Start Monitoring becomes available on Seats.",
  },
  {
    id: "alerts",
    eyebrow: "6 OF 6 · STATUS",
    title: "Read the seat status first",
    body: "Safe means no unusual signs detected. Warning means check the passenger. Emergency means immediate attention may be needed. Analyzing means SafeSeat is still checking.",
  },
];

type DriverGuideContextValue = {
  active: boolean;
  stepIndex: number;
  step: DriverGuideStep | null;
  isStep: (id: DriverGuideStepId) => boolean;
  startGuide: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipGuide: () => Promise<void>;
  finishGuide: () => Promise<void>;
};

const DriverGuideContext = createContext<DriverGuideContextValue | null>(null);

export function DriverGuideProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      if (!user) {
        setStepIndex(-1);
        setInitialCheckDone(false);
      }
    });
  }, []);

  const completionKey = useMemo(
    () => (uid ? `${GUIDE_KEY_PREFIX}:${uid}` : null),
    [uid],
  );

  useEffect(() => {
    if (!uid || !completionKey || initialCheckDone) return;

    let cancelled = false;
    void (async () => {
      try {
        const [completed, locked] = await Promise.all([
          AsyncStorage.getItem(completionKey),
          AsyncStorage.getItem(IS_LOCKED_IN_KEY),
        ]);
        if (cancelled) return;
        setInitialCheckDone(true);
        const monitoringActive = locked ? JSON.parse(locked) === true : false;
        if (completed !== "true" && !monitoringActive) {
          setStepIndex(0);
        }
      } catch (error) {
        console.error("Failed to load SafeSeat guide state:", error);
        if (!cancelled) setInitialCheckDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completionKey, initialCheckDone, uid]);

  const active = stepIndex >= 0 && stepIndex < DRIVER_GUIDE_STEPS.length;
  const step = active ? DRIVER_GUIDE_STEPS[stepIndex] : null;

  const markComplete = useCallback(async () => {
    try {
      if (completionKey) {
        await AsyncStorage.setItem(completionKey, "true");
      }
    } catch (error) {
      console.error("Failed to save SafeSeat guide state:", error);
    } finally {
      setStepIndex(-1);
    }
  }, [completionKey]);

  // Replay is deliberately state-independent: it opens the modal on the current
  // screen and never navigates or mutates real trip data.
  const startGuide = useCallback(() => {
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((current) => {
      if (current < 0) return 0;
      return Math.min(current + 1, DRIVER_GUIDE_STEPS.length - 1);
    });
  }, []);

  const previousStep = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const skipGuide = useCallback(async () => {
    await markComplete();
  }, [markComplete]);

  const finishGuide = useCallback(async () => {
    await markComplete();
  }, [markComplete]);

  const value = useMemo<DriverGuideContextValue>(() => ({
    active,
    stepIndex,
    step,
    isStep: (id) => step?.id === id,
    startGuide,
    nextStep,
    previousStep,
    skipGuide,
    finishGuide,
  }), [active, finishGuide, nextStep, previousStep, skipGuide, startGuide, step, stepIndex]);

  return <DriverGuideContext.Provider value={value}>{children}</DriverGuideContext.Provider>;
}

export function useDriverGuide() {
  const value = useContext(DriverGuideContext);
  if (!value) throw new Error("useDriverGuide must be used inside DriverGuideProvider");
  return value;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

export type UserPreferences = {
  // Kept for backward compatibility with the existing app. In the UI this is
  // presented as status sharing, not as blanket medical consent.
  consent: boolean;
  behavioralMonitoring: boolean;
  physiologicalMonitoring: boolean;
  eventCameraVerification: boolean;
  gpsSharing: boolean;
  emergencyEscalation: boolean;
  escalationWindowSeconds: 20 | 25 | 30;
  useMetric: boolean;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  consent: true,
  behavioralMonitoring: true,
  physiologicalMonitoring: true,
  eventCameraVerification: true,
  gpsSharing: true,
  emergencyEscalation: true,
  escalationWindowSeconds: 25,
  useMetric: true,
};

type UserPreferencesContextType = {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  loading: boolean;
  consent: boolean;
  setConsent: (value: boolean) => Promise<void>;
  behavioralMonitoring: boolean;
  setBehavioralMonitoring: (value: boolean) => Promise<void>;
  physiologicalMonitoring: boolean;
  setPhysiologicalMonitoring: (value: boolean) => Promise<void>;
  eventCameraVerification: boolean;
  setEventCameraVerification: (value: boolean) => Promise<void>;
  gpsSharing: boolean;
  setGpsSharing: (value: boolean) => Promise<void>;
  emergencyEscalation: boolean;
  setEmergencyEscalation: (value: boolean) => Promise<void>;
  escalationWindowSeconds: 20 | 25 | 30;
  setEscalationWindowSeconds: (value: 20 | 25 | 30) => Promise<void>;
  useMetric: boolean;
  setUseMetric: (value: boolean) => Promise<void>;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);
const STORAGE_KEY = "userPreferences";

function normalizePreferences(value: Partial<UserPreferences>): UserPreferences {
  const requestedWindow = Number(value.escalationWindowSeconds);
  const escalationWindowSeconds: 20 | 25 | 30 =
    requestedWindow === 20 || requestedWindow === 30 ? requestedWindow : 25;

  return {
    ...DEFAULT_PREFERENCES,
    ...value,
    escalationWindowSeconds,
  };
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached !== null) {
        setPreferences(normalizePreferences(JSON.parse(cached)));
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        const prefsRef = doc(db, "users", currentUser.uid, "settings", "preferences");
        const prefsSnap = await getDoc(prefsRef);

        if (prefsSnap.exists()) {
          const remoteValue = normalizePreferences(prefsSnap.data() as Partial<UserPreferences>);
          setPreferences(remoteValue);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remoteValue));
        }
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const merged = normalizePreferences({ ...preferences, ...updates });

    setPreferences(merged);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const prefsRef = doc(db, "users", currentUser.uid, "settings", "preferences");
        await setDoc(prefsRef, updates, { merge: true });
      } catch (error) {
        // Local controls remain usable when Firestore is temporarily offline.
        console.warn("Preference saved locally but could not sync to Firestore:", error);
      }
    }
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        loading,
        consent: preferences.consent,
        setConsent: (value) => updatePreferences({ consent: value }),
        behavioralMonitoring: preferences.behavioralMonitoring,
        setBehavioralMonitoring: (value) => updatePreferences({ behavioralMonitoring: value }),
        physiologicalMonitoring: preferences.physiologicalMonitoring,
        setPhysiologicalMonitoring: (value) => updatePreferences({ physiologicalMonitoring: value }),
        eventCameraVerification: preferences.eventCameraVerification,
        setEventCameraVerification: (value) => updatePreferences({ eventCameraVerification: value }),
        gpsSharing: preferences.gpsSharing,
        setGpsSharing: (value) => updatePreferences({ gpsSharing: value }),
        emergencyEscalation: preferences.emergencyEscalation,
        setEmergencyEscalation: (value) => updatePreferences({ emergencyEscalation: value }),
        escalationWindowSeconds: preferences.escalationWindowSeconds,
        setEscalationWindowSeconds: (value) => updatePreferences({ escalationWindowSeconds: value }),
        useMetric: preferences.useMetric,
        setUseMetric: (value) => updatePreferences({ useMetric: value }),
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error("useUserPreferences must be used within a UserPreferencesProvider");
  }
  return context;
}

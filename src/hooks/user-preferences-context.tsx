import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

type UserPreferences = {
  consent: boolean;
  emergencyEscalation: boolean;
  useMetric: boolean;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  consent: true,
  emergencyEscalation: true,
  useMetric: true,
};

type UserPreferencesContextType = {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  loading: boolean;
  consent: boolean;
  setConsent: (value: boolean) => Promise<void>;
  emergencyEscalation: boolean;
  setEmergencyEscalation: (value: boolean) => Promise<void>;
  useMetric: boolean;
  setUseMetric: (value: boolean) => Promise<void>;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);
const STORAGE_KEY = "userPreferences";

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
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(cached) });
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        const prefsRef = doc(db, "users", currentUser.uid, "settings", "preferences");
        const prefsSnap = await getDoc(prefsRef);

        if (prefsSnap.exists()) {
          const remoteValue = {
            ...DEFAULT_PREFERENCES,
            ...prefsSnap.data(),
          } as UserPreferences;
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
    const merged = { ...preferences, ...updates };

    setPreferences(merged);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const prefsRef = doc(db, "users", currentUser.uid, "settings", "preferences");
        await setDoc(prefsRef, updates, { merge: true });
      } catch (error) {
        // Keep the local preference usable while offline; Firestore can sync
        // again the next time this preference is changed with connectivity.
        console.warn("Preference saved locally but could not sync to Firestore:", error);
      }
    }
  };

  const setConsent = (value: boolean) => updatePreferences({ consent: value });
  const setEmergencyEscalation = (value: boolean) =>
    updatePreferences({ emergencyEscalation: value });
  const setUseMetric = (value: boolean) => updatePreferences({ useMetric: value });

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        loading,
        consent: preferences.consent,
        setConsent,
        emergencyEscalation: preferences.emergencyEscalation,
        setEmergencyEscalation,
        useMetric: preferences.useMetric,
        setUseMetric,
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

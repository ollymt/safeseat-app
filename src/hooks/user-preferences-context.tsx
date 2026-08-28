// context/UserPreferencesContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// 👇 Add any new settings fields here — this is your single source of truth
// for what "preferences" contains.
type UserPreferences = {
    consent: boolean;
    emergencyEscalation: boolean;
};

// Sensible fallback values if nothing has been saved yet
const DEFAULT_PREFERENCES: UserPreferences = {
    consent: true,
    emergencyEscalation: true,
};

type UserPreferencesContextType = {
    preferences: UserPreferences;
    // Update one or more fields at a time, e.g. updatePreferences({ consent: false })
    updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
    loading: boolean;

    // 👇 Flat convenience accessors, so components can just use
    // `consent` / `setConsent(...)` directly instead of going through
    // `preferences.consent` / `updatePreferences({ consent: ... })`.
    // These are just thin wrappers around the same underlying state —
    // there's only one source of truth (`preferences`), so consent and
    // preferences.consent are always in sync.
    consent: boolean;
    setConsent: (value: boolean) => Promise<void>;
    emergencyEscalation: boolean;
    setEmergencyEscalation: (value: boolean) => Promise<void>;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = "userPreferences";

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            // 1. Load instantly from the device (fast, works offline)
            const cached = await AsyncStorage.getItem(STORAGE_KEY);
            if (cached !== null) {
                setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(cached) });
            }

            // 2. Then quietly check Firestore in case it changed elsewhere
            //    (e.g. the user changed it on another device)
            const currentUser = auth.currentUser;
            if (currentUser) {
                const prefsRef = doc(db, "users", currentUser.uid, "settings", "preferences");
                const prefsSnap = await getDoc(prefsRef);

                if (prefsSnap.exists()) {
                    const remoteValue = { ...DEFAULT_PREFERENCES, ...prefsSnap.data() } as UserPreferences;
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
        // Merge the changed fields into the existing preferences object,
        // so calling updatePreferences({ consent: false }) doesn't wipe out
        // emergencyEscalation, etc.
        const merged = { ...preferences, ...updates };

        // Update everywhere: memory, device storage, and Firestore
        setPreferences(merged);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

        const currentUser = auth.currentUser;
        if (currentUser) {
            const prefsRef = doc(db, "users", currentUser.uid, "settings", "preferences");
            await setDoc(prefsRef, updates, { merge: true });
        }
    };

    // Flat convenience wrappers — just call updatePreferences under the hood
    const setConsent = (value: boolean) => updatePreferences({ consent: value });
    const setEmergencyEscalation = (value: boolean) => updatePreferences({ emergencyEscalation: value });

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
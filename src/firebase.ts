import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence,
  // @ts-expect-error - getReactNativePersistence exists in the RN bundle but isn't typed in the Firebase web SDK definitions
  getReactNativePersistence 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 1. Safe instance initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// 2. Safe, crash-resistant Auth instance generation 
const getClientAuth = () => {
  // Check if an Auth instance already exists to prevent duplication crashes
  const existingAuth = getApps().length > 0 ? getAuth(app) : null;
  if (existingAuth) return existingAuth;

  if (Platform.OS === "web") {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
};

export const auth = getClientAuth();
export const db = getFirestore(app);
export default app;
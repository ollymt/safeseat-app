import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function setStorageItem(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

export async function deleteStorageItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Failed to delete from localStorage:", e);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

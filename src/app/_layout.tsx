import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
export { ErrorBoundary } from "expo-router";

import { View } from "react-native";

import {
	Inter_400Regular,
	Inter_400Regular_Italic,
	Inter_500Medium,
	Inter_600SemiBold,
	Inter_700Bold,
	Inter_900Black,
	useFonts,
} from "@expo-google-fonts/inter";

import * as SplashScreen from "expo-splash-screen";
import { db } from "../firebase";

// Keep the splash screen visible while fonts and auth initialize
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [loaded, error] = useFonts({
		"Heading-Font": Inter_600SemiBold,
		"Logo-Font": Inter_900Black,
		"Body-Regular": Inter_400Regular,
		"Body-Regular-Italic": Inter_400Regular_Italic,
		"Body-Bold": Inter_700Bold,
		"Body-Medium": Inter_500Medium,
		"Condensed-Regular": Inter_400Regular,
		"Condensed-Regular-Italic": Inter_400Regular_Italic
	});

	const router = useRouter();
	const segments = useSegments();

	const [authLoading, setAuthLoading] = useState(true);
	const [hasSession, setHasSession] = useState(false);

	// Test Firebase connection on mount
	useEffect(() => {
		console.log("Firebase connected:", db.app.name);
	}, []);

	// 1. Check local secure storage on boot to see if user has an active session flag
	useEffect(() => {
		async function checkAuthSession() {
			try {
				const sessionFlag = await SecureStore.getItemAsync("is_logged_in");
				setHasSession(sessionFlag === "true");
			} catch (e) {
				console.error("Failed to read auth token from local device:", e);
				setHasSession(false);
			} finally {
				setAuthLoading(false);
			}
		}
		checkAuthSession();
	}, [segments]); // Check session status when navigation routes shift

	// 2. Control when the native splash screen hides safely
	useEffect(() => {
		if (loaded && !authLoading) {
			SplashScreen.hideAsync();
		}
	}, [loaded, authLoading]);

	// 3. Complete Navigation Authentication Guard Logic
	useEffect(() => {
		// Wait until both fonts are ready and auth state has been parsed from SecureStore
		if (!loaded || authLoading) return;

		const inAuthGroup = segments[0] === "(auth)";

		if (!hasSession && !inAuthGroup) {
			// User is NOT logged in and trying to go to tabs -> send them to the login flow
			router.replace("/(auth)/splash");
		} else if (hasSession && inAuthGroup) {
			// User IS logged in but accidentally went back to splash/login -> force them back inside
			router.replace("/(tabs)/home");
		}
	}, [segments, loaded, authLoading, hasSession]);

	// Prevent rendering stack screens if basic system elements aren't initialized yet
	if (!loaded || authLoading) {
		return null;
	}

	return (
		<View style={{ backgroundColor: themes.background, flex: 1 }}>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(tabs)" />
			</Stack>
		</View>
	);
}

import { Themes } from "@/constants/theme";
import { useFocusEffect, useRouter } from "expo-router";
import {
	Alert,
	Dimensions,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@expo/ui";
import { useCallback, useState } from "react";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

import SettingPageItem from "@/components/setting-page-item";
import SettingSwitch from "@/components/setting-switch";

import PasswordVerifyModal from "@/components/PasswordVerifyModal";
import { isSessionValid } from "@/utils/securitySession";

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

export default function Settings() {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	const router = useRouter();

	// 1. Core Account States
	const [userName, setUserName] = useState<string>("Guest");
	const [userEmail, setUserEmail] = useState<string>("Not Set");
	const [userPhone, setUserPhone] = useState<string>("Not Set");

	// 2. Health Metrics States
	const [birthday, setBirthday] = useState<string>("Jan 01, 2000");
	const [height, setHeight] = useState<string>("Not Set");
	const [weight, setWeight] = useState<string>("Not Set");
	const [bloodType, setBloodType] = useState<string>("Not Set");
	const [allergies, setAllergies] = useState<string>("None Stored");

	// 3. Privacy Preferences States
	const [consent, setConsent] = useState<boolean>(true);
	const [emergencyEscalation, setEmergencyEscalation] = useState<boolean>(true);
	const [isMetric, setIsMetric] = useState(false);

	const [authModalVisible, setAuthModalVisible] = useState(false);
	const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
	const [bloodPickerVisible, setBloodPickerVisible] = useState(false);

	const handleMetricToggle = async (newVal: boolean) => {
		setIsMetric(newVal);
		try {
			console.log("set is metric to ", newVal); // 👈 Use newVal instead of stale isMetric
			const currentObjRaw = await SecureStore.getItemAsync("user_privacy_prefs");
			const currentObj = currentObjRaw ? JSON.parse(currentObjRaw) : {};
			currentObj.useMetric = newVal; // 👈 Correctly saves newVal
			await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify(currentObj));
		} catch (error) {
			console.error("Failed to save metric preference locally:", error);
		}
	};

	const loadAllUserData = useCallback(async () => {
		try {
			// 🌟 Inside loadAllUserData()...

			// 1. First, load your local settings as normal.
			const savedPrivacyString = await SecureStore.getItemAsync("user_privacy_prefs");
			if (savedPrivacyString) {
				const savedPrivacy = JSON.parse(savedPrivacyString);
				if (savedPrivacy.consent !== undefined) setConsent(savedPrivacy.consent);
				if (savedPrivacy.emergencyEscalation !== undefined) setEmergencyEscalation(savedPrivacy.emergencyEscalation);

				// This keeps loading your local setting perfectly!
				if (savedPrivacy.useMetric !== undefined) setIsMetric(savedPrivacy.useMetric);
			}

			const currentUser = auth.currentUser;
			if (currentUser) {
				const userDocRef = doc(db, "users", currentUser.uid);
				const userDocSnap = await getDoc(userDocRef);

				const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");
				const settingsDocSnap = await getDoc(settingsDocRef);

				// ... (keep your profile/health data logic the same)

				// 2. Fetch privacy settings from Firebase, but EXCLUDE "useMetric"
				if (settingsDocSnap.exists()) {
					const settingsData = settingsDocSnap.data();

					if (settingsData.consent !== undefined) setConsent(settingsData.consent);
					if (settingsData.emergencyEscalation !== undefined) setEmergencyEscalation(settingsData.emergencyEscalation);

					// 🌟 FIXED: We read the local cache value for metric, NOT the cloud data
					const currentLocalPrivacyRaw = await SecureStore.getItemAsync("user_privacy_prefs");
					const currentLocalPrivacy = currentLocalPrivacyRaw ? JSON.parse(currentLocalPrivacyRaw) : {};

					const combinedPrivacy = {
						...currentLocalPrivacy,
						consent: settingsData.consent ?? true,
						emergencyEscalation: settingsData.emergencyEscalation ?? true,
					};
					await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify(combinedPrivacy));;
				}
			}
		} catch (error) {
			console.error("Failed to load user profile data:", error);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadAllUserData();
		}, [loadAllUserData])
	);

	const saveHealthField = async (key: string, val: string) => {
		try {
			const currentObjRaw = await SecureStore.getItemAsync("user_health_profile");
			const currentObj = currentObjRaw ? JSON.parse(currentObjRaw) : {};
			currentObj[key] = val;
			await SecureStore.setItemAsync("user_health_profile", JSON.stringify(currentObj));

			const currentUser = auth.currentUser;
			if (currentUser) {
				const userDocRef = doc(db, "users", currentUser.uid);
				await updateDoc(userDocRef, { [key]: val });
			}
		} catch (error) {
			console.error("Failed to save health data:", error);
		}
	};

	const savePrivacyField = async (key: string, val: boolean) => {
		try {
			const currentObjRaw = await SecureStore.getItemAsync("user_privacy_prefs");
			const currentObj = currentObjRaw ? JSON.parse(currentObjRaw) : {};
			currentObj[key] = val;
			await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify(currentObj));

			const currentUser = auth.currentUser;
			if (currentUser) {
				// 🌟 Point directly to users/{uid}/settings/preferences
				const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");

				// setDoc with merge: true creates the document if missing, or updates it if present
				await setDoc(settingsDocRef, { [key]: val }, { merge: true });
			}
		} catch (error) {
			console.error("Failed to save privacy preference:", error);
		}
	};

	const getDisplayHeight = () => {
		if (height === undefined || height === null || height === "Not Set") return "Not Set";
		const cmValue = parseFloat(String(height).replace(/[^0-9.]/g, ""));
		if (isNaN(cmValue)) return String(height);

		if (isMetric) {
			return `${cmValue} cm`;
		} else {
			const totalInches = cmValue / 2.54;
			const feet = Math.floor(totalInches / 12);
			const inches = Math.round(totalInches % 12);
			return `${feet}' ${inches}"`;
		}
	};

	const getDisplayWeight = () => {
		if (weight === undefined || weight === null || weight === "Not Set") return "Not Set";
		const kgValue = parseFloat(String(weight).replace(/[^0-9.]/g, ""));
		if (isNaN(kgValue)) return String(weight);

		if (isMetric) {
			return `${kgValue} kg`;
		} else {
			const lbsValue = Math.round(kgValue * 2.20462);
			return `${lbsValue} lbs`;
		}
	};

	const executeSecureAction = async (action: () => void) => {
		const authenticated = await isSessionValid();
		if (authenticated) {
			action();
		} else {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			setPendingAction(() => () => action());
			setAuthModalVisible(true);
		}
	};

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: currentTheme.background }}
			edges={Platform.OS == "android" ? ["left", "right", "top"] : ["left", "right"]}
		>
			<ScrollView contentContainerStyle={[{ flexGrow: 1 }, Platform.OS == "ios" ? { marginTop: -31 } : { marginTop: 6 }]} showsVerticalScrollIndicator={true} bounces={true}>
				<View style={[styles.container, { borderWidth: 0, borderColor: currentTheme.text}]}>
					<Text style={[styles.pageHeader, { color: currentTheme.text }]}>Settings</Text>
					<View style={{ gap: 20, marginTop: 0, width: "100%" }}>

						{/* ACCOUNT SECTION */}
						<View>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ACCOUNT</Text>
							<View style={{ borderRadius: 12, overflow: "hidden" }}>
								<SettingPageItem
									name="Password"
									iconName={Icon.select({ ios: "asterisk", android: import("@expo/material-symbols/asterisk.xml") })}
									showChevron={true}
									isLast={true}
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
										router.push("/(tabs)/settings/changepass");
									}}
								/>
							</View>
						</View>

						{/* PRIVACY SECTION */}
						<View>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>PRIVACY</Text>
							<View style={{ gap: 20 }}>
								<View style={{ gap: 6 }}>
									<View style={{ borderRadius: 12, overflow: "hidden" }}>
										<SettingSwitch
											name="Data Sharing Consent"
											iconName={Icon.select({ ios: "hand.raised.fill", android: import("@expo/material-symbols/front_hand.xml") })}
											isLast={true}
											value={consent}
											onValueChange={(val) => {
												setConsent(val);
												savePrivacyField("consent", val);
											}}
										/>
									</View>
									<View style={{ paddingHorizontal: 10 }}>
										<Text style={[styles.caption, { color: currentTheme.textSecondary }]}>
											Authorize real-time synchronization with secure cloud nodes.
										</Text>
									</View>
								</View>
								<View style={{ gap: 6 }}>
									<View style={{ borderRadius: 12, overflow: "hidden" }}>
										<SettingSwitch
											name="Emergency Escalation"
											iconName={Icon.select({ ios: "exclamationmark.triangle.fill", android: import("@expo/material-symbols/front_hand.xml") })}
											isLast={true}
											value={emergencyEscalation}
											onValueChange={(val) => {
												setEmergencyEscalation(val);
												savePrivacyField("emergencyEscalation", val);
											}}
										/>
									</View>
									<View style={{ paddingHorizontal: 10 }}>
										<Text style={[styles.caption, { color: currentTheme.textSecondary }]}>
											Automatic alert routing to nearest response center if unresponsive.
										</Text>
									</View>
								</View>
							</View>
						</View>

						{/* APP SECTION */}
						<View>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>APP</Text>
							<View style={{ gap: 20 }}>
								<View style={{ gap: 6 }}>
									<View style={{ borderRadius: 12, overflow: "hidden" }}>
										<SettingSwitch
											name="Use Metric Units"
											iconName={Icon.select({ ios: "ruler.fill", android: import("@expo/material-symbols/straighten.xml") })}
											isLast={true}
											value={isMetric}
											onValueChange={handleMetricToggle}
										/>
										<SettingPageItem
											name="Dark Theme"
											iconName={Icon.select({ ios: "moon.fill", android: import("@expo/material-symbols/dark_mode.xml") })}
											enabled={false}
											isLast={true}
										/>
									</View>
									<View style={{ paddingHorizontal: 10 }}>
										<Text style={[styles.caption, { color: currentTheme.textSecondary }]}>
											You can change your theme in the Settings app.
										</Text>
									</View>
								</View>
								<View style={{ gap: 6 }}>
									<View style={{ borderRadius: 12, overflow: "hidden" }}>
										<SettingPageItem
											name="Sign-out"
											iconName={Icon.select({ ios: "power", android: import("@expo/material-symbols/power_settings_new.xml") })}
											isLast={false}
											onPress={() => {
												Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
												Alert.alert(
													"Are you sure you want to sign out?",
													"You will have to sign in again next time and your local caches will be cleared.",
													[
														{ text: "No", style: "cancel" },
														{
															text: "Yes",
															style: "destructive",
															onPress: async () => {
																try {
																	// 1. Clear session and auth flags
																	await SecureStore.deleteItemAsync("is_logged_in");
																	await SecureStore.deleteItemAsync("security_session_token");

																	// 2. 🧼 CLEAR CACHED USER DATA ON LOGOUT
																	await SecureStore.deleteItemAsync("user_health_profile");
																	await SecureStore.deleteItemAsync("user_privacy_prefs");

																	// 3. Optional: Trigger Firebase sign out if you want to completely destroy the active session
																	// await auth.signOut();

																	Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
																	router.replace("/(auth)/login");
																} catch (error) {
																	Alert.alert("Error", "Could not complete sign out process safely.");
																	console.error(error);
																}
															},
														},
													],
												);
											}}
										/>
										<SettingPageItem
											name="Delete Account"
											iconName={Icon.select({ ios: "trash.fill", android: import("@expo/material-symbols/delete.xml") })}
											isLast={true}
											destructive={true}
										/>
									</View>
									<View style={{ paddingHorizontal: 10 }}>
										<Text style={[styles.caption, { color: currentTheme.textSecondary }]}>
											Permanently delete your account. This action cannot be undone.
										</Text>
									</View>
								</View>
							</View>
						</View>

						{/* FOOTER */}
						<View style={{ paddingHorizontal: 10 }}>
							<Text style={[styles.caption, { color: currentTheme.textSecondary }]}>
								v.26w30d5r02 • made with 💚 by safeseat team
							</Text>
						</View>
					</View>

					<PasswordVerifyModal
						visible={authModalVisible}
						onClose={() => {
							setAuthModalVisible(false);
							setPendingAction(null);
						}}
						onSuccess={() => {
							setAuthModalVisible(false);
							if (pendingAction) {
								pendingAction();
								setPendingAction(null);
							}
						}}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, width: "100%", padding: 20 },
	pageHeader: { fontSize: 40, fontFamily: "Logo-Font" },
	infoLabel: { fontFamily: "Condensed-Bold", fontSize: 14, margin: 0, marginBottom: 8 },
	caption: { fontFeatureSettings: "Body-Medium", opacity: 0.8, fontSize: 13 },
});
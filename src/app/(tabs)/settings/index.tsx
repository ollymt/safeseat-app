import { Themes } from "@/constants/theme";
import { useFocusEffect, useRouter } from "expo-router";
import {
	Alert,
	Dimensions,
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

import SettingDatePickerItem from "@/components/setting-date-picker";
import SettingPageItem from "@/components/setting-page-item";
import SettingPicker from "@/components/setting-picker";
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
	const [isMetric, setIsMetric] = useState(true);

	const [authModalVisible, setAuthModalVisible] = useState(false);
	const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
	const [bloodPickerVisible, setBloodPickerVisible] = useState(false);

	const loadAllUserData = useCallback(async () => {
		try {
			// 1. LOAD INSTANTLY FROM LOCAL STORAGE CACHES
			const savedHealthDataString = await SecureStore.getItemAsync("user_health_profile");
			if (savedHealthDataString) {
				const savedHealth = JSON.parse(savedHealthDataString);
				if (savedHealth.name) setUserName(savedHealth.name);
				if (savedHealth.email) setUserEmail(savedHealth.email);
				if (savedHealth.phone) setUserPhone(savedHealth.phone);
				if (savedHealth.birthday) setBirthday(savedHealth.birthday);
				if (savedHealth.height) setHeight(savedHealth.height);
				if (savedHealth.weight) setWeight(savedHealth.weight);
				if (savedHealth.bloodType) setBloodType(savedHealth.bloodType);
				if (savedHealth.allergies) setAllergies(savedHealth.allergies);
			}

			const savedPrivacyString = await SecureStore.getItemAsync("user_privacy_prefs");
			if (savedPrivacyString) {
				const savedPrivacy = JSON.parse(savedPrivacyString);
				if (savedPrivacy.consent !== undefined) setConsent(savedPrivacy.consent);
				if (savedPrivacy.emergencyEscalation !== undefined) setEmergencyEscalation(savedPrivacy.emergencyEscalation);
				if (savedPrivacy.useMetric !== undefined) setIsMetric(savedPrivacy.useMetric);
			}

			// 2. FETCH FRESH BACKGROUND DATA FROM FIREBASE
			// Find this block inside your loadAllUserData function:
			const currentUser = auth.currentUser;
			if (currentUser) {
				// 1. Fetch User Profile Doc
				const userDocRef = doc(db, "users", currentUser.uid);
				const userDocSnap = await getDoc(userDocRef);

				// 🌟 2. Fetch the new Settings Doc from the subcollection
				const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");
				const settingsDocSnap = await getDoc(settingsDocRef);

				let cloudData: any = {};
				if (userDocSnap.exists()) {
					cloudData = userDocSnap.data();
					if (cloudData.name) setUserName(cloudData.name);
					if (cloudData.email) setUserEmail(cloudData.email);
					if (cloudData.phone) setUserPhone(cloudData.phone);
					if (cloudData.birthday) setBirthday(cloudData.birthday);
					if (cloudData.height) setHeight(cloudData.height);
					if (cloudData.weight) setWeight(cloudData.weight);
					if (cloudData.bloodType) setBloodType(cloudData.bloodType);
					if (cloudData.allergies) setAllergies(cloudData.allergies);

					const combinedProfile = {
						name: cloudData.name || "",
						email: cloudData.email || "",
						phone: cloudData.phone || "",
						birthday: cloudData.birthday || "",
						height: cloudData.height || "",
						weight: cloudData.weight || "",
						bloodType: cloudData.bloodType || "",
						allergies: cloudData.allergies || "",
					};
					await SecureStore.setItemAsync("user_health_profile", JSON.stringify(combinedProfile));
				}

				// 🌟 3. Handle loading Privacy & Metric preferences from the subcollection
				if (settingsDocSnap.exists()) {
					const settingsData = settingsDocSnap.data();

					if (settingsData.consent !== undefined) setConsent(settingsData.consent);
					if (settingsData.emergencyEscalation !== undefined) setEmergencyEscalation(settingsData.emergencyEscalation);
					if (settingsData.useMetric !== undefined) setIsMetric(settingsData.useMetric);

					const combinedPrivacy = {
						useMetric: settingsData.useMetric ?? true,
						consent: settingsData.consent ?? true,
						emergencyEscalation: settingsData.emergencyEscalation ?? true,
					};
					await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify(combinedPrivacy));
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

	const handleMetricToggle = async (newVal: boolean) => {
		setIsMetric(newVal);
		await savePrivacyField("useMetric", newVal);
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
			edges={["left", "right"]}
		>
			<ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={true} bounces={true}>
				<View style={[styles.container, { marginTop: -40 }]}>
					<Text style={[styles.pageHeader, { color: currentTheme.text }]}>Settings</Text>
					<View style={{ gap: 20, marginTop: 10, width: "100%" }}>

						{/* ACCOUNT SECTION */}
						<View>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ACCOUNT</Text>
							<View style={{ borderRadius: 12, overflow: "hidden" }}>
								<SettingPageItem
									name="Name"
									iconName={Icon.select({ ios: "person.fill", android: import("@expo/material-symbols/person.xml") })}
									value={userName}
								/>
								<SettingPageItem
									name="Email"
									iconName={Icon.select({ ios: "at", android: import("@expo/material-symbols/alternate_email.xml") })}
									value={userEmail}
									onPress={() => {
										executeSecureAction(() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											router.push("/(tabs)/settings/changeemail");
										});
									}}
								/>
								<SettingPageItem
									name="Phone Number"
									iconName={Icon.select({ ios: "phone.fill", android: import("@expo/material-symbols/phone_enabled.xml") })}
									value={userPhone}
									onPress={() => {
										executeSecureAction(() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											router.push("/(tabs)/settings/changephone");
										});
									}}
								/>
								<SettingPageItem
									name="Password"
									iconName={Icon.select({ ios: "asterisk", android: import("@expo/material-symbols/asterisk.xml") })}
									showChevron={true}
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
										router.push("/(tabs)/settings/changepass");
									}}
								/>
								<SettingPageItem
									name="Emergency Contacts"
									iconName={Icon.select({ ios: "person.crop.circle.fill", android: import("@expo/material-symbols/account_circle.xml") })}
									isLast={true}
									showChevron={true}
									onPress={() => {
										executeSecureAction(() => {
											console.log("Opening econ editor freely...");
										});
									}}
								/>
							</View>
						</View>

						{/* HEALTH SECTION */}
						<View>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>HEALTH</Text>
							<View style={{ borderRadius: 12, overflow: "hidden" }}>
								<SettingDatePickerItem
									name="Birthday"
									iconName={Icon.select({ ios: "birthday.cake.fill", android: import("@expo/material-symbols/cake.xml") })}
									value={birthday}
									onValueChange={(dateStr) => {
										setBirthday(dateStr);
										saveHealthField("birthday", dateStr);
									}}
								/>
								<SettingPageItem
									name="Height"
									iconName={Icon.select({ ios: "lines.measurement.vertical", android: import("@expo/material-symbols/height.xml") })}
									value={getDisplayHeight()}
								/>
								<SettingPageItem
									name="Weight"
									iconName={Icon.select({ ios: "scalemass.fill", android: import("@expo/material-symbols/scale.xml") })}
									value={getDisplayWeight()}
								/>
								<SettingPicker
									name="Blood Type"
									iconName={Icon.select({ ios: "drop.fill", android: import("@expo/material-symbols/opacity.xml") })}
									isLast={false}
									value={bloodType}
									isOpen={bloodPickerVisible}
									onClose={() => setBloodPickerVisible(false)}
									onValueChange={(type) => {
										setBloodType(type);
										saveHealthField("bloodType", type);
									}}
									onPress={() => {
										executeSecureAction(() => {
											setBloodPickerVisible(true);
										});
									}}
								/>
								<SettingPageItem
									name="Allergies"
									iconName={Icon.select({ ios: "nosign", android: import("@expo/material-symbols/block.xml") })}
									value={allergies}
									showChevron={true}
									isLast={true}
									onPress={() => {
										executeSecureAction(() => {
											console.log("Opening allergies editor freely...");
										});
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
								v.26w29d3r01 • made with 💚 by safeseat team
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
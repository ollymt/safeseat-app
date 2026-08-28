import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useFocusEffect, useNavigation, useRouter, } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from 'react-native';
import {
	Alert,
	Dimensions,
	ScrollView,
	StyleSheet,
	Text,
	View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@expo/ui";
import { useCallback, useState } from "react";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

import SettingPageItem from "@/components/setting-page-item";
import SettingSwitch from "@/components/setting-switch";

import { isSessionValid } from "@/utils/securitySession";

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

import ChangeEmailModal from "@/components/change-email-modal";
import ChangePhoneModal from "@/components/change-phone-modal";
import MiniTab from "@/components/mini-tab";

const IS_LOCKED_IN_KEY = "isLockedIn";

export default function Settings() {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const bottomPad = 104 + (insets.bottom / 2); // extra breathing room

	const [currentTab, setCurrentTab] = useState(0)

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

	const [isLockedIn, setIsLockedIn] = useState(false);

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
			// 1. Load local settings
			const savedPrivacyString = await SecureStore.getItemAsync("user_privacy_prefs");
			if (savedPrivacyString) {
				const savedPrivacy = JSON.parse(savedPrivacyString);
				if (savedPrivacy.consent !== undefined) setConsent(savedPrivacy.consent);
				if (savedPrivacy.emergencyEscalation !== undefined) setEmergencyEscalation(savedPrivacy.emergencyEscalation);
				if (savedPrivacy.useMetric !== undefined) setIsMetric(savedPrivacy.useMetric);
			}

			// 👇 NEW: sync lock state with the Assign screen
			const rawLockedIn = await AsyncStorage.getItem(IS_LOCKED_IN_KEY);
			setIsLockedIn(rawLockedIn ? JSON.parse(rawLockedIn) : false);

			const currentUser = auth.currentUser;
			if (currentUser) {
				// Set fallback/default email from Auth
				if (currentUser.email) {
					setUserEmail(currentUser.email);
				}

				// 2. Fetch User Profile Doc from Firestore
				const userDocRef = doc(db, "users", currentUser.uid);
				const userDocSnap = await getDoc(userDocRef);

				if (userDocSnap.exists()) {
					const userData = userDocSnap.data();

					// Read email and phone fields saved in Firestore
					if (userData.email) setUserEmail(userData.email);
					if (userData.phone) setUserPhone(userData.phone);
				}

				// 3. Fetch Privacy Settings
				const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");
				const settingsDocSnap = await getDoc(settingsDocRef);

				if (settingsDocSnap.exists()) {
					const settingsData = settingsDocSnap.data();

					if (settingsData.consent !== undefined) setConsent(settingsData.consent);
					if (settingsData.emergencyEscalation !== undefined) setEmergencyEscalation(settingsData.emergencyEscalation);

					const currentLocalPrivacyRaw = await SecureStore.getItemAsync("user_privacy_prefs");
					const currentLocalPrivacy = currentLocalPrivacyRaw ? JSON.parse(currentLocalPrivacyRaw) : {};

					const combinedPrivacy = {
						...currentLocalPrivacy,
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

	const [changeEmailVisible, setChangeEmailVisible] = useState(false)
	const [changePhoneVisible, setChangePhoneVisible] = useState(false)

	useFocusEffect(
		useCallback(() => {
			loadAllUserData();
		}, [loadAllUserData])
	);

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: themes.background }}
			edges={["left", "right", "bottom"]}
		>
			<ScrollView contentContainerStyle={[{ flexGrow: 1 }, { marginTop: spacing.one, paddingBottom: bottomPad }]} showsVerticalScrollIndicator={true} bounces={true}>
				<View style={[styles.container, { borderWidth: spacing.none, borderColor: themes.text }]}>
					<Text style={[styles.pageHeader, { color: themes.text }]}>Settings</Text>
					<View style={{ gap: 20, marginTop: 0, width: "100%" }}>

						<MiniTab
							values={["Account", "Privacy", "App"]}
							selectedIndex={currentTab}
							onChange={(index: number) => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
								setCurrentTab(index);
							}}
						/>

						{currentTab == 0 ? (
							<>
								<View style={{ flex: 1 }}>

									<View style={{ gap: spacing.none, borderRadius: spacing.edge, overflow: "hidden" }}>
										<SettingPageItem
											name="Email"
											iconName={Icon.select({
												ios: "at",
												android: import("@expo/material-symbols/alternate_email.xml")
											})}
											isLast={false}
											value={userEmail}
											onPress={() => {
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
												setChangeEmailVisible(true)
											}}
											showChevron={true}
										/>
										<SettingPageItem
											name="Phone"
											iconName={Icon.select({
												ios: "phone.fill",
												android: import("@expo/material-symbols/call.xml")
											})}
											isLast={false}
											value={userPhone}
											onPress={() => {
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
												setChangePhoneVisible(true)
											}}
											showChevron={true}
										/>
										<SettingPageItem
											name="Password"
											iconName={Icon.select({
												ios: "asterisk",
												android: import("@expo/material-symbols/asterisk.xml")
											})}
											isLast={true}
											onPress={() => { }}
											showChevron={true}
										/>
									</View>

								</View>
							</>
						) : currentTab == 1 ? (
							<>
								<View style={{ flex: 1 }}>
									<View style={{ gap: spacing.three }}>

										<View style={{ gap: spacing.one }}>
											<View style={{ borderRadius: spacing.edge, overflow: "hidden" }}>
												<SettingSwitch
													name="Data Sharing Consent"
													iconName={Icon.select({
														ios: "hand.raised.fill",
														android: import("@expo/material-symbols/front_hand.xml")
													})}
													isLast={true}
													value={true}
												/>
											</View>
											<Text style={styles.caption}>Authorize real-time synchrinization with secure cloud nodes.</Text>
										</View>

										<View style={{ gap: spacing.one }}>
											<View style={{ borderRadius: spacing.edge, overflow: "hidden" }}>
												<SettingSwitch
													name="Emergency Escalation"
													iconName={Icon.select({
														ios: "exclamationmark.triangle.fill",
														android: import("@expo/material-symbols/warning.xml")
													})}
													isLast={true}
													value={true}
												/>
											</View>
											<Text style={styles.caption}>Automatic alert routing to nearest response center if unresponsive.</Text>
										</View>

									</View>
								</View>
							</>
						) : (
							<>
								<View style={{ flex: 1 }}>
									<View style={{ gap: spacing.three }}>

										<View style={{ gap: spacing.one }}>
											<View style={{ borderRadius: spacing.edge, overflow: "hidden" }}>
												<SettingSwitch
													name="Use Metric Units"
													iconName={Icon.select({
														ios: "ruler.fill",
														android: import("@expo/material-symbols/front_hand.xml")
													})}
													isLast={true}
													value={isMetric}
													onValueChange={handleMetricToggle}
												/>
											</View>
										</View>

										<View style={{ gap: spacing.one }}>
											<View style={{ borderRadius: spacing.edge, overflow: "hidden" }}>
												<SettingPageItem
													name="Log out"
													iconName={Icon.select({
														ios: "power",
														android: import("@expo/material-symbols/power_settings_new.xml")
													})}
													isLast={false}
													enabled={!isLockedIn}
													onPress={() => {
														if (isLockedIn) return;
														// Add your Log Out logic here
													}}
												/>
												<SettingPageItem
													name="Nuke account"
													iconName={Icon.select({
														ios: "trash.fill",
														android: import("@expo/material-symbols/bomb.xml")
													})}
													isLast={true}
													destructive={true}
													enabled={!isLockedIn}
													onPress={() => {
														if (isLockedIn) return;
														// Add your Account Deletion logic here
													}}
												/>
											</View>
											{isLockedIn &&
												<Text style={styles.caption}>
													Seat assignment must be unlocked before you can log out or nuke your account.
												</Text>
											}
										</View>

									</View>
								</View>
							</>
						)}
					</View>

					{/* FOOTER */}
					<View style={{ paddingHorizontal: spacing.one, gap: spacing.two }}>
						<View>

							<Text style={[styles.caption, { color: themes.primaryBttn, textAlign: "center", textDecorationLine: "underline", marginBottom: spacing.two }]} onPress={() => {
								Linking.openURL("https://github.com/ollymt/safeseat-app")
							}}>
								v.26w35d6r01
							</Text>

							<Text style={[styles.caption, { color: themes.textSecondary, textAlign: "center" }]}>
								made with 🧡 by safeseat team
							</Text>

							<View style={{ flexDirection: "row", gap: spacing.half, justifyContent: "center" }}>
								<Text style={[styles.caption, { color: themes.textSecondary, textAlign: "center" }]}>
									frontend designer and developer -
								</Text>
								<Text style={[styles.caption, { color: themes.primaryBttn, textAlign: "center", textDecorationLine: "underline" }]} onPress={() => {
									Linking.openURL("https://github.com/ollymt")
								}}>
									ollymt
								</Text>
							</View>

							<View style={{ flexDirection: "row", gap: spacing.half, justifyContent: "center" }}>
								<Text style={[styles.caption, { color: themes.textSecondary, textAlign: "center" }]}>
									backend developer -
								</Text>
								<Text style={[styles.caption, { color: themes.primaryBttn, textAlign: "center", textDecorationLine: "underline" }]} onPress={() => {
									Linking.openURL("https://github.com/ooniins")
								}}>
									ooniins
								</Text>
							</View>

							<View style={{ flexDirection: "row", gap: spacing.half, justifyContent: "center" }}>
								<Text style={[styles.caption, { color: themes.textSecondary, textAlign: "center" }]}>
									hardware developer -
								</Text>
								<Text style={[styles.caption, { color: themes.primaryBttn, textAlign: "center", textDecorationLine: "underline" }]} onPress={() => {
									Linking.openURL("https://github.com/Lycos-Blanza")
								}}>
									Lycos-Blanza
								</Text>
							</View>

							<View style={{ flexDirection: "row", gap: spacing.half, justifyContent: "center" }}>
								<Text style={[styles.caption, { color: themes.textSecondary, textAlign: "center" }]}>
									ml developer -
								</Text>
								<Text style={[styles.caption, { color: themes.primaryBttn, textAlign: "center", textDecorationLine: "underline" }]} onPress={() => {
									Linking.openURL("https://github.com/Francis-Medrano")
								}}>
									Francis-Medrano
								</Text>
							</View>

						</View>
						<View>
							<Text style={[styles.caption, { color: themes.textSecondary, textAlign: "center" }]}>
								CREDITS:
							</Text>
							<View style={{ flexDirection: "column", gap: spacing.quarter, justifyContent: "center" }}>
								<Text style={[styles.caption, { color: themes.textSecondary, textAlign: "center" }]}>
									Busy Night Traffic — StockCake:
								</Text>
								<Text style={[styles.caption, { color: themes.primaryBttn, textAlign: "center", textDecorationLine: "underline" }]} onPress={() => {
									Linking.openURL("https://stockcake.com/i/busy-night-traffic_1374713_227178")
								}}>
									https://stockcake.com/i/busy-night-traffic_1374713_227178
								</Text>
							</View>
						</View>
					</View>

					<ChangeEmailModal
						visible={changeEmailVisible}
						onClose={() => { setChangeEmailVisible(false) }}
						onSuccess={() => {
							Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
							setChangeEmailVisible(false)
							loadAllUserData(); // Refresh displayed values
						}}
					/>

					<ChangePhoneModal
						visible={changePhoneVisible}
						onClose={() => { setChangePhoneVisible(false) }}
						onSuccess={() => {
							Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
							setChangePhoneVisible(false)
							loadAllUserData(); // Refresh displayed values
						}}
					/>

				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: "100%",
		paddingLeft: spacing.two,
		paddingRight: spacing.two,
		borderWidth: spacing.none,
		borderColor: "#fff",
		gap: spacing.three
	},
	pageHeader: {
		fontSize: fontsize.pageHeader,
		fontFamily: "Logo-Font",
		color: themes.text,
		margin: spacing.none
	},
	infoLabel: {
		fontFamily: "Condensed-Bold",
		fontSize: fontsize.caption,
		margin: spacing.none,
		marginBottom: spacing.one
	},
	caption: {
		fontFeatureSettings: "Body-Medium",
		fontSize: fontsize.caption,
		color: themes.textSecondary
	},
});
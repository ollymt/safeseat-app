import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useUserPreferences } from "@/hooks/user-preferences-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import {
	Dimensions, Linking, ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@expo/ui";
import { useCallback, useState } from "react";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

import SettingPageItem from "@/components/setting-page-item";
import SettingSwitch from "@/components/setting-switch";

import { isSessionValid } from "@/utils/securitySession";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

import ChangeEmailModal from "@/components/change-email-modal";
import ChangePasswordModal from "@/components/change-password-modal";
import ChangePhoneModal from "@/components/change-phone-modal";
import MiniTab from "@/components/mini-tab";

// 👇 Static icon imports — import(...) called inline inside JSX returns a
// Promise, not the icon data, and breaks every Android icon on this screen.
// These need to be normal top-of-file imports instead.
import alternateEmailXml from "@expo/material-symbols/alternate_email.xml";
import asteriskXml from "@expo/material-symbols/asterisk.xml";
import bombXml from "@expo/material-symbols/bomb.xml";
import callXml from "@expo/material-symbols/call.xml";
import frontHandXml from "@expo/material-symbols/favorite.xml";
import powerSettingsNewXml from "@expo/material-symbols/power_settings_new.xml";
import rulerXml from "@expo/material-symbols/straighten.xml"; // ⚠️ see note below
import warningXml from "@expo/material-symbols/warning.xml";

const IS_LOCKED_IN_KEY = "isLockedIn";
// Local-only settings that the UserPreferencesContext does NOT manage
// (currently just isMetric). consent/emergencyEscalation used to live here
// too, but that caused them to get overwritten on every screen focus —
// see chat for why. Don't add consent/emergencyEscalation back to this key.
const LOCAL_APP_PREFS_KEY = "user_local_app_prefs";

export default function Settings() {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const bottomPad = 104 + (insets.bottom / 2); // extra breathing room

	const [currentTab, setCurrentTab] = useState(0)

	// 1. Core Account States
	const [userName, setUserName] = useState<string>("Guest");
	const [userEmail, setUserEmail] = useState<string>("Not Set");
	const [userPhone, setUserPhone] = useState<string>("Not Set");

	const [isMetric, setIsMetric] = useState(false);

	const [authModalVisible, setAuthModalVisible] = useState(false);
	const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

	const [isLockedIn, setIsLockedIn] = useState(false);

	const handleMetricToggle = async (newVal: boolean) => {
		setIsMetric(newVal);
		try {
			const currentObjRaw = await SecureStore.getItemAsync(LOCAL_APP_PREFS_KEY);
			const currentObj = currentObjRaw ? JSON.parse(currentObjRaw) : {};
			currentObj.useMetric = newVal;
			await SecureStore.setItemAsync(LOCAL_APP_PREFS_KEY, JSON.stringify(currentObj));
		} catch (error) {
			console.error("Failed to save metric preference locally:", error);
		}
	};

	// 👇 consent/emergencyEscalation are no longer loaded or cached here.
	// UserPreferencesContext already loads them (from AsyncStorage, then
	// Firestore) once when the app starts, and keeps them in sync whenever
	// setConsent/setEmergencyEscalation are called. Re-reading and re-setting
	// them here on every focus was overwriting real changes with stale data.
	const loadAllUserData = useCallback(async () => {
		try {
			// 1. Load local-only app settings (currently just isMetric)
			const savedLocalPrefsString = await SecureStore.getItemAsync(LOCAL_APP_PREFS_KEY);
			if (savedLocalPrefsString) {
				const savedLocalPrefs = JSON.parse(savedLocalPrefsString);
				if (savedLocalPrefs.useMetric !== undefined) setIsMetric(savedLocalPrefs.useMetric);
			}

			// Sync lock state with the Assign screen
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
	const [changePassVisible, setChangePassVisible] = useState(false);

	const { consent, setConsent, emergencyEscalation, setEmergencyEscalation, loading } = useUserPreferences();

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
												android: alternateEmailXml
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
												android: callXml
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
												android: asteriskXml
											})}
											isLast={true}
											onPress={() => {
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
												setChangePassVisible(true)
											}}
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
													name="Share Health State"
													iconName={Icon.select({
														ios: "heart.fill",
														android: frontHandXml
													})}
													isLast={true}
													value={consent}
													onValueChange={() => { setConsent(!consent) }}
												/>
											</View>
											<Text style={styles.caption}>When disabled, health states for everyone but the driver won't be shared with the app.</Text>
										</View>

										<View style={{ gap: spacing.one }}>
											<View style={{ borderRadius: spacing.edge, overflow: "hidden" }}>
												<SettingSwitch
													name="Emergency Escalation"
													iconName={Icon.select({
														ios: "exclamationmark.triangle.fill",
														android: warningXml
													})}
													isLast={true}
													value={emergencyEscalation}
													onValueChange={() => { setEmergencyEscalation(!emergencyEscalation) }}
												/>
											</View>
											<Text style={styles.caption}>Automatically notify emergency contacts when an emergency occurs. Works when only the driver is buckled.</Text>
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
														android: rulerXml
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
														android: powerSettingsNewXml
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
														android: bombXml
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
													Must be unbuckled before you can log out or nuke your account.
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
								v.26w35d6r02
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

					<ChangePasswordModal
						visible={changePassVisible}
						onClose={() => { setChangePassVisible(false) }}
						onSuccess={() => {
							Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
							setChangePassVisible(false)
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
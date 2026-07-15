import { Themes } from "@/constants/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
	Dimensions,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Host, Row } from "@expo/ui";
import { buttonBorderShape, buttonStyle, controlSize } from '@expo/ui/swift-ui/modifiers';

import TextBlock from "@/components/text-block";
import { useCallback, useState } from "react";

import PasswordVerifyModal from "@/components/PasswordVerifyModal";
import { isSessionValid } from "@/utils/securitySession";
import * as SecureStore from "expo-secure-store";

import * as Haptics from "expo-haptics";

import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

export default function Profile() {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	const router = useRouter();

	// Extract profileId from the route (e.g. /profile?profileId=XYZ)
	const { profileId } = useLocalSearchParams<{ profileId?: string }>();

	// 1. Core Account States
	const [userName, setUserName] = useState<string>("Guest");
	const [userIcon, setUserIcon] = useState<string>("");
	const [userEmail, setUserEmail] = useState<string>("Not Set");
	const [userPhone, setUserPhone] = useState<string>("Not Set");

	// 2. Health Metrics States
	const [height, setHeight] = useState<string>("Not Set");
	const [weight, setWeight] = useState<string>("Not Set");
	const [bloodType, setBloodType] = useState<string>("Not Set");
	const [allergies, setAllergies] = useState<string>("None Stored");
	const [birthday, setBirthday] = useState<string>("Not Set");

	// 🌟 3. Unit Preference State
	const [isMetric, setIsMetric] = useState<boolean>(true);

	// 4. UI Interaction State
	const [refreshing, setRefreshing] = useState(false);

	const loadAllUserData = useCallback(async () => {
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) return;

			// Are we loading a sub-profile, or the owner's own account?
			const isSubProfile = !!profileId;
			const cacheKey = isSubProfile ? `profile_${profileId}` : "user_health_profile";

			// LOAD INSTANTLY FROM PRIVACY CACHE
			const savedPrivacyString = await SecureStore.getItemAsync("user_privacy_prefs");
			if (savedPrivacyString) {
				const savedPrivacy = JSON.parse(savedPrivacyString);
				if (savedPrivacy.useMetric !== undefined) setIsMetric(savedPrivacy.useMetric);
			}

			// 1. LOAD INSTANTLY FROM PROFILE CACHE
			const cachedHealth = await SecureStore.getItemAsync(cacheKey);
			if (cachedHealth) {
				const localData = JSON.parse(cachedHealth);
				setUserName(localData.name || "Guest");
				setUserIcon(localData.icon || localData.pfp || "Not Set")
				setUserEmail(localData.email || "Not Set");
				setUserPhone(localData.phone || "Not Set");
				setBirthday(localData.birthday || "");
				setHeight(localData.height || "Not Set");
				setWeight(localData.weight || "Not Set");
				setBloodType(localData.bloodType || "Not Set");
				setAllergies(localData.allergies || "None Stored");
			}

			// 2. FETCH FRESH DATA FROM FIREBASE
			let cloudData: any = null;

			if (isSubProfile) {
				const profileDocRef = doc(db, "users", currentUser.uid, "profiles", profileId as string);
				const profileDocSnap = await getDoc(profileDocRef);
				if (profileDocSnap.exists()) {
					cloudData = profileDocSnap.data();
				}
			} else {
				const userDocRef = doc(db, "users", currentUser.uid);
				const userDocSnap = await getDoc(userDocRef);
				if (userDocSnap.exists()) {
					cloudData = userDocSnap.data();
				}
			}

			// FETCH SETTINGS DOC FOR UNIT SYSTEM PREFERENCE
			const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");
			const settingsDocSnap = await getDoc(settingsDocRef);
			if (settingsDocSnap.exists()) {
				const settingsData = settingsDocSnap.data();
				if (settingsData.useMetric !== undefined) {
					setIsMetric(settingsData.useMetric);
					await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify({ useMetric: settingsData.useMetric }));
				}
			}

			// 3. UPDATE UI STATE + CACHE
			if (cloudData) {
				const nameVal = cloudData.name || "Guest";
				const iconVal = cloudData.icon || "Not Set";
				const emailVal = cloudData.email || "Not Set";
				const phoneVal = cloudData.phone || "Not Set";
				const bdayVal = cloudData.birthday || "";
				const heightVal = cloudData.heightCm ? `${cloudData.heightCm}` : (cloudData.height || "Not Set");
				const weightVal = cloudData.weightKg ? `${cloudData.weightKg}` : (cloudData.weight || "Not Set");
				const bloodVal = cloudData.bloodType || "Not Set";
				const allergyVal = cloudData.allergies || "None Stored";

				setUserName(nameVal);
				setUserIcon(iconVal);
				setUserEmail(emailVal);
				setUserPhone(phoneVal);
				setBirthday(bdayVal);
				setHeight(heightVal);
				setWeight(weightVal);
				setBloodType(bloodVal);
				setAllergies(allergyVal);

				const combinedProfile = {
					name: nameVal,
					icon: iconVal,
					email: emailVal,
					phone: phoneVal,
					birthday: bdayVal,
					height: heightVal,
					weight: weightVal,
					bloodType: bloodVal,
					allergies: allergyVal,
				};
				await SecureStore.setItemAsync(cacheKey, JSON.stringify(combinedProfile));
			}
		} catch (error) {
			console.error("Error syncing cache with Firestore:", error);
		}
	}, [profileId]);

	useFocusEffect(
		useCallback(() => {
			loadAllUserData();
		}, [loadAllUserData]),
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadAllUserData();
		setRefreshing(false);
	}, [loadAllUserData]);

	// 🌟 HEIGHT UNIT CONVERTER HELPER
	const getDisplayHeight = () => {
		if (!height || height === "Not Set") return "Not Set";
		const cmValue = parseFloat(height.replace(/[^0-9.]/g, ""));
		if (isNaN(cmValue)) return height;

		if (isMetric) {
			return `${cmValue} cm`;
		} else {
			const totalInches = cmValue / 2.54;
			const feet = Math.floor(totalInches / 12);
			const inches = Math.round(totalInches % 12);
			return `${feet}' ${inches}"`;
		}
	};

	// 🌟 WEIGHT UNIT CONVERTER HELPER
	const getDisplayWeight = () => {
		if (!weight || weight === "Not Set") return "Not Set";
		const kgValue = parseFloat(weight.replace(/[^0-9.]/g, ""));
		if (isNaN(kgValue)) return weight;

		if (isMetric) {
			return `${kgValue} kg`;
		} else {
			const lbsValue = Math.round(kgValue * 2.20462);
			return `${lbsValue} lbs`;
		}
	};

	const getFormattedDate = () => {
		if (!birthday) return "Not Set";
		const parsedDate = new Date(birthday);
		if (isNaN(parsedDate.getTime())) return birthday;
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: '2-digit',
			year: 'numeric'
		}).format(parsedDate);
	};

	const getAge = () => {
		if (!birthday) return "Not Set";
		const birthDate = new Date(birthday);
		if (isNaN(birthDate.getTime())) return "Not Set";

		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDifference = today.getMonth() - birthDate.getMonth();

		if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		return age.toString();
	};

	const getZodiacSign = () => {
		if (!birthday) return "Not Set";
		const birthDate = new Date(birthday);
		if (isNaN(birthDate.getTime())) return "Not Set";

		const month = birthDate.getMonth() + 1;
		const day = birthDate.getDate();

		if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
		if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
		if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
		if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
		if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
		if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
		if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
		if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
		if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
		if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
		if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
		if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";

		return "Not Set";
	};

	const [editMode, setEditMode] = useState(false);

	const [authModalVisible, setAuthModalVisible] = useState(false);
	const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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
			edges={['left', 'right']}
		>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1, marginBottom: 100, marginTop: 100 }}
				showsVerticalScrollIndicator={true}
				bounces={true}
			>
				<View style={[styles.container, { marginTop: -20 }]}>
					<View style={{ flexDirection: "column", alignItems: "center", marginBottom: 0 }}>
						<Image source={userIcon == "Not Set" || userIcon == "" || userIcon == null ? { uri: "https://pbs.twimg.com/media/C8SFjSYWAAA6452.jpg" } : { uri: userIcon }} style={{ width: 150, height: 150, borderRadius: 75 }} />
						<Text style={[styles.pageHeader, { color: currentTheme.text, flex: 1 }]}>
							{userName.split(" ")[0]}
						</Text>
						<Host matchContents>
							{editMode ?
								<Row spacing={8}>
									<Button
										label="Cancel"
										variant="outlined"
										modifiers={[
											controlSize("small"),
											buttonStyle("glass"),
											buttonBorderShape("capsule")]}
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											setEditMode(false)
										}}
									/>
									<Button
										label="Save"
										variant="filled"
										modifiers={[
											controlSize("small"),
											buttonStyle("borderedProminent"),
											buttonBorderShape("capsule")]}
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											setEditMode(false)
										}}
									/>
								</Row> :
								<Button
									label="Edit Profile"
									variant="outlined"
									modifiers={[
										controlSize("small"),
										buttonStyle("glass"),
										buttonBorderShape("capsule")]}
									onPress={() => {
										executeSecureAction(() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											setEditMode(true)
										})
									}}
								/>}
						</Host>
					</View>
					<View style={{ borderColor: currentTheme.textSecondary, borderWidth: 1, opacity: 0.5, marginVertical: 20 }} />
					<View style={{ gap: 10 }}>

						<Text style={{ fontFamily: "Condensed-Bold", color: currentTheme.text, fontSize: 24, marginTop: 10 }}>PERSONAL INFORMATION</Text>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								NAME
							</Text>
							<TextBlock text={userName} />
						</View>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								EMAIL
							</Text>
							<TextBlock text={userEmail} />
						</View>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								PHONE NUMBER
							</Text>
							<TextBlock text={userPhone} />
						</View>

						<View style={{ borderColor: currentTheme.textSecondary, borderWidth: 1, opacity: 0.5, marginVertical: 10 }} />

						<Text style={{ fontFamily: "Condensed-Bold", color: currentTheme.text, fontSize: 24, marginBottom: 10 }}>HEALTH INFORMATION</Text>

						<View style={{ flexDirection: "row", gap: 10, borderColor: "#000", borderWidth: 0 }}>
							<View style={[styles.fieldContainer, { flex: 2 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									BIRTHDAY
								</Text>
								<TextBlock text={getFormattedDate()} />
							</View>
							<View style={[styles.fieldContainer, { flex: 1 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									AGE
								</Text>
								<TextBlock text={getAge()} />
							</View>
							<View style={[styles.fieldContainer, { flex: 2 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									ZODIAC SIGN
								</Text>
								<TextBlock text={getZodiacSign()} />
							</View>
						</View>

						<View style={{ flexDirection: "row", gap: 10, borderColor: "#000", borderWidth: 0 }}>
							<View style={[styles.fieldContainer, { flex: 1 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									HEIGHT
								</Text>
								{/* 🌟 Using helper text converter */}
								<TextBlock text={getDisplayHeight()} />
							</View>
							<View style={[styles.fieldContainer, { flex: 1 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									WEIGHT
								</Text>
								{/* 🌟 Using helper text converter */}
								<TextBlock text={getDisplayWeight()} />
							</View>
						</View>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								BLOOD TYPE
							</Text>
							<TextBlock text={bloodType.toUpperCase()} />
						</View>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								ALLERGIES
							</Text>
							<TextBlock text={allergies == "" ? "None Stored" : allergies} />
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
	container: {
		flex: 1,
		width: "100%",
		padding: 20,
	},
	fieldContainer: {
		gap: 4,
		width: "100%",
	},
	pageHeader: {
		fontSize: 40,
		fontFamily: "Logo-Font",
	},
	infoLabel: {
		fontFamily: "Condensed-Bold",
		fontSize: 14,
		margin: 0,
	},
	caption: {
		fontFeatureSettings: "Body-Medium",
		opacity: 0.8,
		fontSize: 13
	}
});
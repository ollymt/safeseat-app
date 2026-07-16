import { Themes } from "@/constants/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
	Dimensions,
	Image,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	Animated,
	Keyboard,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Host, Row, TextInput } from "@expo/ui";
import { buttonBorderShape, buttonStyle, controlSize, keyboardType } from '@expo/ui/swift-ui/modifiers';

import TextBlock from "@/components/text-block";
import { useCallback, useState, useEffect, useRef } from "react";

import PasswordVerifyModal from "@/components/PasswordVerifyModal";
import { isSessionValid } from "@/utils/securitySession";
import * as SecureStore from "expo-secure-store";

import * as Haptics from "expo-haptics";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { KeyboardAvoidingView } from "react-native";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

const VALID_BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "NOT SET"];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const isLeapYear = (year: number): boolean => {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

const daysInMonth = (year: number, month: number): number => {
	const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return days[month - 1] ?? 31;
};

// Pure int validation, no Date object involved anywhere.
const isValidDateParts = (year: number, month: number, day: number): boolean => {
	if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
	if (month < 1 || month > 12) return false;
	if (day < 1 || day > daysInMonth(year, month)) return false;
	return true;
};

// Birthday is stored as three separate int64 fields in Firestore: birthYear,
// birthMonth, birthDate. This pulls those out of whatever object we loaded
// (cache or cloud), also tolerating an old combined "birthday" value for
// backward compatibility with any pre-existing records.
const extractBirthdayParts = (data: any): { year: number; month: number; day: number } | null => {
	if (!data) return null;

	const hasSeparateFields =
		data.birthYear !== undefined && data.birthYear !== null &&
		data.birthMonth !== undefined && data.birthMonth !== null &&
		((data.birthDate !== undefined && data.birthDate !== null) ||
			(data.birthDay !== undefined && data.birthDay !== null));

	if (hasSeparateFields) {
		const y = Number(data.birthYear);
		const m = Number(data.birthMonth);
		const d = Number(data.birthDate ?? data.birthDay);
		return isValidDateParts(y, m, d) ? { year: y, month: m, day: d } : null;
	}

	// Legacy fallback for older cached/cloud records that stored a single
	// combined "birthday" value instead of separate fields.
	const legacy = data.birthday;
	if (legacy && legacy !== "Not Set") {
		if (typeof legacy === "object") {
			const y = Number(legacy.birthYear ?? legacy.year);
			const m = Number(legacy.birthMonth ?? legacy.month);
			const d = Number(legacy.birthDay ?? legacy.day);
			return isValidDateParts(y, m, d) ? { year: y, month: m, day: d } : null;
		}
		if (typeof legacy === "string") {
			const match = legacy.match(/^(\d{4})-(\d{2})-(\d{2})/);
			if (match) {
				const y = parseInt(match[1], 10);
				const m = parseInt(match[2], 10);
				const d = parseInt(match[3], 10);
				return isValidDateParts(y, m, d) ? { year: y, month: m, day: d } : null;
			}
		}
	}

	return null;
};

export default function Profile() {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	const router = useRouter();

	const { profileId } = useLocalSearchParams<{ profileId?: string }>();
	const isSubProfile = !!profileId;
	const cacheKey = isSubProfile ? `profile_${profileId}` : "user_health_profile";

	// Original data references for checking discard state changes
	const originalDataRef = useRef<any>({});

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

	// Birthday kept as three fully separate fields — mirrors Firestore's
	// birthYear / birthMonth / birthDate int64 schema. Never combined into a
	// Date object or a single date string.
	const [birthYear, setBirthYear] = useState<string>("");
	const [birthMonth, setBirthMonth] = useState<string>("");
	const [birthDate, setBirthDate] = useState<string>("");

	// Imperial height split local editing states
	const [tempFeet, setTempFeet] = useState<string>("");
	const [tempInches, setTempInches] = useState<string>("");

	// 3. Unit Preference State
	const [isMetric, setIsMetric] = useState<boolean>(true);

	// 4. UI Interaction State
	const [refreshing, setRefreshing] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [authModalVisible, setAuthModalVisible] = useState(false);
	const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

	const loadAllUserData = useCallback(async () => {
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) return;

			const savedPrivacyString = await SecureStore.getItemAsync("user_privacy_prefs");
			if (savedPrivacyString) {
				const savedPrivacy = JSON.parse(savedPrivacyString);
				if (savedPrivacy.useMetric !== undefined) setIsMetric(savedPrivacy.useMetric);
			}

			const cachedHealth = await SecureStore.getItemAsync(cacheKey);
			if (cachedHealth) {
				const localData = JSON.parse(cachedHealth);
				const bdayParts = extractBirthdayParts(localData);

				const loadedData = {
					name: localData.name || "Guest",
					icon: localData.icon || localData.pfp || "Not Set",
					email: localData.email || "Not Set",
					phone: localData.phone || "Not Set",
					birthYear: bdayParts ? bdayParts.year : null,
					birthMonth: bdayParts ? bdayParts.month : null,
					birthDate: bdayParts ? bdayParts.day : null,
					height: localData.height || "Not Set",
					weight: localData.weight || "Not Set",
					bloodType: localData.bloodType || "Not Set",
					allergies: localData.allergies || "None Stored",
				};

				originalDataRef.current = loadedData;

				setUserName(loadedData.name);
				setUserIcon(loadedData.icon);
				setUserEmail(loadedData.email);
				setUserPhone(loadedData.phone);
				setBirthYear(bdayParts ? String(bdayParts.year) : "");
				setBirthMonth(bdayParts ? String(bdayParts.month) : "");
				setBirthDate(bdayParts ? String(bdayParts.day) : "");
				setHeight(loadedData.height);
				setWeight(loadedData.weight);
				setBloodType(loadedData.bloodType);
				setAllergies(loadedData.allergies);

				// Parse Height into separate inputs if imperial
				const cmVal = parseFloat(loadedData.height.replace(/[^0-9.]/g, ""));
				if (!isNaN(cmVal)) {
					const totalInches = cmVal / 2.54;
					setTempFeet(String(Math.floor(totalInches / 12)));
					setTempInches(String(Math.round(totalInches % 12)));
				} else {
					setTempFeet("");
					setTempInches("");
				}
			}

			const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");
			const settingsDocSnap = await getDoc(settingsDocRef);
			if (settingsDocSnap.exists()) {
				const settingsData = settingsDocSnap.data();
				if (settingsData.useMetric !== undefined) {
					setIsMetric(settingsData.useMetric);
					await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify({ useMetric: settingsData.useMetric }));
				}
			}

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

			if (cloudData) {
				const nameVal = cloudData.name || "Guest";
				const iconVal = cloudData.icon || "Not Set";
				const emailVal = cloudData.email || "Not Set";
				const phoneVal = cloudData.phone || "Not Set";

				const bdayParts = extractBirthdayParts(cloudData);

				const heightVal = cloudData.heightCm !== undefined ? `${cloudData.heightCm}` : (cloudData.height || "Not Set");
				const weightVal = cloudData.weightKg !== undefined ? `${cloudData.weightKg}` : (cloudData.weight || "Not Set");
				const bloodVal = cloudData.bloodType || "Not Set";
				const allergyVal = cloudData.allergies || "None Stored";

				const loadedCloudData = {
					name: nameVal,
					icon: iconVal,
					email: emailVal,
					phone: phoneVal,
					birthYear: bdayParts ? bdayParts.year : null,
					birthMonth: bdayParts ? bdayParts.month : null,
					birthDate: bdayParts ? bdayParts.day : null,
					height: heightVal,
					weight: weightVal,
					bloodType: bloodVal,
					allergies: allergyVal,
				};

				originalDataRef.current = loadedCloudData;

				setUserName(nameVal);
				setUserIcon(iconVal);
				setUserEmail(emailVal);
				setUserPhone(phoneVal);
				setBirthYear(bdayParts ? String(bdayParts.year) : "");
				setBirthMonth(bdayParts ? String(bdayParts.month) : "");
				setBirthDate(bdayParts ? String(bdayParts.day) : "");
				setHeight(heightVal);
				setWeight(weightVal);
				setBloodType(bloodVal);
				setAllergies(allergyVal);

				const cmVal = parseFloat(heightVal.replace(/[^0-9.]/g, ""));
				if (!isNaN(cmVal)) {
					const totalInches = cmVal / 2.54;
					setTempFeet(String(Math.floor(totalInches / 12)));
					setTempInches(String(Math.round(totalInches % 12)));
				} else {
					setTempFeet("");
					setTempInches("");
				}

				await SecureStore.setItemAsync(cacheKey, JSON.stringify(loadedCloudData));
			}
		} catch (error) {
			console.error("Error syncing cache with Firestore:", error);
		}
	}, [profileId, cacheKey, isSubProfile]);

	useFocusEffect(
		useCallback(() => {
			loadAllUserData();
		}, [loadAllUserData]),
	);

	// Reactively translate separate Imperial Feet/Inches inputs back to Metric (cm) for standard DB compatibility
	useEffect(() => {
		if (!isMetric && editMode) {
			const feetNum = parseFloat(tempFeet);
			const inchesNum = parseFloat(tempInches || "0");

			if (!isNaN(feetNum) && feetNum >= 0) {
				const totalInches = (feetNum * 12) + (isNaN(inchesNum) ? 0 : inchesNum);
				const computedCm = totalInches * 2.54;
				setHeight(String(Math.round(computedCm * 10) / 10)); // Maintain 1 decimal place accuracy
			} else if (tempFeet === "" && tempInches === "") {
				setHeight("Not Set");
			}
		}
	}, [tempFeet, tempInches, isMetric, editMode]);

	// Validation engine: Controls state of the Save button
	const validateForm = () => {
		// 1. Blood Type Validation
		const cleanBloodType = bloodType.trim().toUpperCase();
		if (cleanBloodType !== "" && !VALID_BLOOD_TYPES.includes(cleanBloodType)) {
			return false;
		}

		// 2. Birthday validation
		const yVal = birthYear.trim();
		const mVal = birthMonth.trim();
		const dVal = birthDate.trim();

		if (yVal !== "" || mVal !== "" || dVal !== "") {
			const y = parseInt(yVal, 10);
			const m = parseInt(mVal, 10);
			const d = parseInt(dVal, 10);

			if (!isValidDateParts(y, m, d)) return false;

			const currentYear = new Date().getFullYear();
			if (y < 1900 || y > currentYear) return false;
		}

		// 3. Imperial Height Inputs Validation
		if (!isMetric) {
			const fVal = tempFeet.trim();
			const iVal = tempInches.trim();

			if (fVal !== "" || iVal !== "") {
				const f = parseFloat(fVal);
				const i = parseFloat(iVal || "0");

				if (isNaN(f) || f < 0 || f > 10) return false;
				if (isNaN(i) || i < 0 || i >= 12) return false;
			}
		}

		return true;
	};

	const isFormValid = validateForm();

	const hasUnsavedChanges = () => {
		const orig = originalDataRef.current;
		const origYear = orig.birthYear !== null && orig.birthYear !== undefined ? String(orig.birthYear) : "";
		const origMonth = orig.birthMonth !== null && orig.birthMonth !== undefined ? String(orig.birthMonth) : "";
		const origDay = orig.birthDate !== null && orig.birthDate !== undefined ? String(orig.birthDate) : "";

		const origHeightCm = parseFloat(orig.height.replace(/[^0-9.]/g, ""));
		let origFeet = "";
		let origInches = "";
		if (!isNaN(origHeightCm)) {
			const totalInches = origHeightCm / 2.54;
			origFeet = String(Math.floor(totalInches / 12));
			origInches = String(Math.round(totalInches % 12));
		}

		return (
			userName !== orig.name ||
			userEmail !== orig.email ||
			userPhone !== orig.phone ||
			height !== orig.height ||
			weight !== orig.weight ||
			bloodType !== orig.bloodType ||
			allergies !== orig.allergies ||
			birthYear !== origYear ||
			birthMonth !== origMonth ||
			birthDate !== origDay ||
			(!isMetric && (tempFeet !== origFeet || tempInches !== origInches))
		);
	};

	const handleCancelEdit = () => {
		if (hasUnsavedChanges()) {
			Alert.alert(
				"Discard Changes?",
				"You have unsaved changes. Are you sure you want to discard them?",
				[
					{ text: "Keep Editing", style: "cancel" },
					{
						text: "Discard",
						style: "destructive",
						onPress: () => {
							loadAllUserData();
							setEditMode(false);
						}
					}
				]
			);
		} else {
			setEditMode(false);
		}
	};

	const handleSaveChanges = async () => {
		if (!isFormValid) return;

		try {
			const currentUser = auth.currentUser;
			if (!currentUser) return;

			const y = parseInt(birthYear, 10);
			const m = parseInt(birthMonth, 10);
			const d = parseInt(birthDate, 10);
			const validBday = isValidDateParts(y, m, d);

			const updatedProfile = {
				name: userName,
				icon: userIcon,
				email: userEmail,
				phone: userPhone,
				birthYear: validBday ? y : null,
				birthMonth: validBday ? m : null,
				birthDate: validBday ? d : null,
				height: height,
				weight: weight,
				bloodType: bloodType,
				allergies: allergies,
			};

			await SecureStore.setItemAsync(cacheKey, JSON.stringify(updatedProfile));

			const cleanHeightNum = height !== "Not Set" ? parseFloat(height.replace(/[^0-9.]/g, "")) : null;
			const cleanWeightNum = weight !== "Not Set" ? parseFloat(weight.replace(/[^0-9.]/g, "")) : null;

			// Firestore schema stores birthday as three separate int64 fields —
			// birthYear, birthMonth, birthDate — no combined date value.
			const firestorePayload: any = {
				name: userName,
				email: userEmail,
				phone: userPhone,
				bloodType: bloodType,
				allergies: allergies,
				birthYear: validBday ? y : null,
				birthMonth: validBday ? m : null,
				birthDate: validBday ? d : null,
			};

			if (cleanHeightNum !== null && !isNaN(cleanHeightNum)) {
				firestorePayload.heightCm = cleanHeightNum;
				firestorePayload.height = String(cleanHeightNum);
			}
			if (cleanWeightNum !== null && !isNaN(cleanWeightNum)) {
				firestorePayload.weightKg = cleanWeightNum;
				firestorePayload.weight = String(cleanWeightNum);
			}

			const profileDocRef = isSubProfile
				? doc(db, "users", currentUser.uid, "profiles", profileId as string)
				: doc(db, "users", currentUser.uid);

			await updateDoc(profileDocRef, firestorePayload);
			setEditMode(false);
		} catch (error) {
			console.error("Failed to save changes:", error);
		}
	};

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
		const y = parseInt(birthYear, 10);
		const m = parseInt(birthMonth, 10);
		const d = parseInt(birthDate, 10);
		if (!isValidDateParts(y, m, d)) return "Not Set";
		return `${MONTH_NAMES[m - 1]} ${String(d).padStart(2, "0")}, ${y}`;
	};

	const getAge = () => {
		const y = parseInt(birthYear, 10);
		const m = parseInt(birthMonth, 10);
		const d = parseInt(birthDate, 10);
		if (!isValidDateParts(y, m, d)) return "Not Set";

		// Only reads today's y/m/d off the system clock — never constructs a
		// Date for the birthday itself, so there's no timezone round-trip.
		const now = new Date();
		const todayYear = now.getFullYear();
		const todayMonth = now.getMonth() + 1;
		const todayDay = now.getDate();

		let age = todayYear - y;
		const monthDifference = todayMonth - m;

		if (monthDifference < 0 || (monthDifference === 0 && todayDay < d)) {
			age--;
		}
		return age.toString();
	};

	const getZodiacSign = () => {
		const y = parseInt(birthYear, 10);
		const month = parseInt(birthMonth, 10);
		const day = parseInt(birthDate, 10);
		if (!isValidDateParts(y, month, day)) return "Not Set";

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

	const [keyboardHeight, setKeyboardHeight] = useState(0);

	useEffect(() => {
		const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
		const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

		const showSub = Keyboard.addListener(showEvent, (e) => {
			setKeyboardHeight(e.endCoordinates.height);
		});
		const hideSub = Keyboard.addListener(hideEvent, () => {
			setKeyboardHeight(0);
		});

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: currentTheme.background }}
			edges={Platform.OS == "ios" ? ['left', 'right'] : ['left', 'right', "top"]}
		>
			<ScrollView
				contentContainerStyle={[{ flexGrow: 1, paddingBottom: 40 }, Platform.OS == "android" && { marginTop: 50 }]}
				showsVerticalScrollIndicator={true}
				bounces={true}
				automaticallyAdjustKeyboardInsets={true}
				keyboardShouldPersistTaps="handled"
			>
				<View style={[styles.container, { marginTop: -20, paddingBottom: 100 }]}>
					<View style={{ flexDirection: "column", alignItems: "center", marginBottom: 0 }}>
						<Image source={userIcon === "Not Set" || userIcon === "" || userIcon === null ? { uri: "https://pbs.twimg.com/media/C8SFjSYWAAA6452.jpg" } : { uri: userIcon }} style={{ width: 150, height: 150, borderRadius: 75 }} />
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
											handleCancelEdit();
										}}
									/>
									<Button
										label="Save"
										variant="filled"
										// @ts-ignore
										disabled={!isFormValid}
										modifiers={[
											controlSize("small"),
											buttonStyle("borderedProminent"),
											buttonBorderShape("capsule")]}
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											handleSaveChanges();
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
											setEditMode(true);
										});
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
							{editMode ?
								<View style={[styles.textInput, { backgroundColor: currentTheme.element }]}>
									<Host matchContents>
										<TextInput
											// @ts-ignore
											value={userName}
											onChangeText={setUserName}
											placeholder="Name" />
									</Host>
								</View>
								:
								<TextBlock text={userName} />
							}
						</View>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								EMAIL
							</Text>
							{editMode ?
								<View style={[styles.textInput, { backgroundColor: currentTheme.element }]}>
									<Host matchContents>
										<TextInput
											// @ts-ignore
											value={userEmail}
											onChangeText={setUserEmail}
											placeholder="Email"
											modifiers={[keyboardType("email-address")]} />
									</Host>
								</View>
								:
								<TextBlock text={userEmail} />
							}
						</View>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								PHONE NUMBER
							</Text>
							{editMode ?
								<View style={[styles.textInput, { backgroundColor: currentTheme.element }]}>
									<Host matchContents>
										<TextInput
											// @ts-ignore
											value={userPhone}
											onChangeText={setUserPhone}
											placeholder="Phone Number"
											modifiers={[keyboardType("phone-pad")]} />
									</Host>
								</View>
								:
								<TextBlock text={userPhone} />
							}
						</View>

						<View style={{ borderColor: currentTheme.textSecondary, borderWidth: 1, opacity: 0.5, marginVertical: 10 }} />

						<Text style={{ fontFamily: "Condensed-Bold", color: currentTheme.text, fontSize: 24, marginBottom: 10 }}>HEALTH INFORMATION</Text>

						<View style={{ flexDirection: "row", gap: 10, borderColor: "#000", borderWidth: 0 }}>
							<View style={[styles.fieldContainer, { flex: 2.2 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									BIRTHDAY
								</Text>
								{editMode ?
									<View style={{ flexDirection: "row", gap: 6 }}>
										{/* Month Input */}
										<View style={[styles.textInput, { backgroundColor: currentTheme.element, flex: 1 }]}>
											<Host matchContents>
												<TextInput
													// @ts-ignore
													value={birthMonth}
													onChangeText={(val) => setBirthMonth(val.replace(/[^0-9]/g, ""))}
													placeholder="MM"
													modifiers={[keyboardType("number-pad")]}
												/>
											</Host>
										</View>
										{/* Day Input */}
										<View style={[styles.textInput, { backgroundColor: currentTheme.element, flex: 1 }]}>
											<Host matchContents>
												<TextInput
													// @ts-ignore
													value={birthDate}
													onChangeText={(val) => setBirthDate(val.replace(/[^0-9]/g, ""))}
													placeholder="DD"
													modifiers={[keyboardType("number-pad")]}
												/>
											</Host>
										</View>
										{/* Year Input */}
										<View style={[styles.textInput, { backgroundColor: currentTheme.element, flex: 1.5 }]}>
											<Host matchContents>
												<TextInput
													// @ts-ignore
													value={birthYear}
													onChangeText={(val) => setBirthYear(val.replace(/[^0-9]/g, ""))}
													placeholder="YYYY"
													modifiers={[keyboardType("number-pad")]}
												/>
											</Host>
										</View>
									</View>
									:
									<TextBlock text={getFormattedDate()} />
								}
							</View>
							<View style={[styles.fieldContainer, { flex: .75 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									AGE
								</Text>
								<TextBlock text={getAge()} />
							</View>
							<View style={[styles.fieldContainer, { flex: 1.75 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									ZODIAC
								</Text>
								<TextBlock text={getZodiacSign()} />
							</View>
						</View>

						<View style={{ flexDirection: "row", gap: 10, borderColor: "#000", borderWidth: 0 }}>
							<View style={[styles.fieldContainer, { flex: 1.2 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									HEIGHT {isMetric ? "(CM)" : "(FT / IN)"}
								</Text>
								{editMode ? (
									isMetric ? (
										<View style={[styles.textInput, { backgroundColor: currentTheme.element }]}>
											<Host matchContents>
												<TextInput
													// @ts-ignore
													value={height === "Not Set" ? "" : height}
													onChangeText={setHeight}
													placeholder="e.g. 175"
													modifiers={[keyboardType("decimal-pad")]}
												/>
											</Host>
										</View>
									) : (
										<View style={{ flexDirection: "row", gap: 6 }}>
											{/* Feet Input */}
											<View style={[styles.textInput, { backgroundColor: currentTheme.element, flex: 1 }]}>
												<Host matchContents>
													<TextInput
														// @ts-ignore
														value={tempFeet}
														onChangeText={(val) => setTempFeet(val.replace(/[^0-9]/g, ""))}
														placeholder="Feet"
														modifiers={[keyboardType("number-pad")]}
													/>
												</Host>
											</View>
											{/* Inches Input */}
											<View style={[styles.textInput, { backgroundColor: currentTheme.element, flex: 1 }]}>
												<Host matchContents>
													<TextInput
														// @ts-ignore
														value={tempInches}
														onChangeText={(val) => setTempInches(val.replace(/[^0-9]/g, ""))}
														placeholder="Inches"
														modifiers={[keyboardType("number-pad")]}
													/>
												</Host>
											</View>
										</View>
									)
								) : (
									<TextBlock text={getDisplayHeight()} />
								)}
							</View>
							<View style={[styles.fieldContainer, { flex: 1 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									WEIGHT {isMetric ? "(KG)" : "(LB)"}
								</Text>
								{editMode ?
									<View style={[styles.textInput, { backgroundColor: currentTheme.element }]}>
										<Host matchContents>
											<TextInput
												// @ts-ignore
												value={weight === "Not Set" ? "" : weight}
												onChangeText={setWeight}
												placeholder={isMetric ? "e.g. 70" : "e.g. 154"}
												modifiers={[keyboardType("decimal-pad")]}
											/>
										</Host>
									</View>
									:
									<TextBlock text={getDisplayWeight()} />
								}
							</View>
						</View>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								BLOOD TYPE
							</Text>
							{editMode ?
								<View style={[styles.textInput, { backgroundColor: currentTheme.element }]}>
									<Host matchContents>
										<TextInput
											// @ts-ignore
											value={bloodType === "Not Set" ? "" : bloodType}
											onChangeText={setBloodType}
											placeholder="e.g. A+, O-, AB+"
											autoCapitalize="characters"
										/>
									</Host>
								</View>
								:
								<TextBlock text={bloodType.toUpperCase()} />
							}
						</View>

						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								ALLERGIES
							</Text>
							{editMode ?
								<View style={[styles.textInput, { backgroundColor: currentTheme.element }]}>
									<Host matchContents>
										<TextInput
											// @ts-ignore
											value={allergies === "None Stored" ? "" : allergies}
											onChangeText={setAllergies}
											placeholder="e.g. Peanuts, Penicillin"
										/>
									</Host>
								</View>
								:
								<TextBlock text={allergies === "" ? "None Stored" : allergies} />
							}
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
	},
	textInput: {
		width: "100%",
		minHeight: 46,
		justifyContent: "center",
		paddingHorizontal: 12,
		borderRadius: 8,
	}
});
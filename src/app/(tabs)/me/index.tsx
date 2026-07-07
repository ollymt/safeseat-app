import { Themes } from "@/constants/theme";
import { useRouter, useFocusEffect } from "expo-router"; // Added useFocusEffect
import {
	Dimensions,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	ScrollView,
	RefreshControl, // Added RefreshControl for swipe-to-refresh
} from "react-native";
import { Host, Button } from "@expo/ui";
import { SafeAreaView } from "react-native-safe-area-context";

import TextBlock from "@/components/text-block";
import { useEffect, useState, useCallback } from "react"; // Added useCallback

import * as SecureStore from "expo-secure-store";
import ContactCard from "@/components/contact-card";

const { width: screenWidth } = Dimensions.get("window");

export default function Me() {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	const router = useRouter();

	// 1. Core Account States
	const [userName, setUserName] = useState<string>("Guest");
	const [userEmail, setUserEmail] = useState<string>("Not Set");
	const [userPhone, setUserPhone] = useState<string>("Not Set");

	// 2. Health Metrics States
	const [height, setHeight] = useState<string>("Not Set");
	const [weight, setWeight] = useState<string>("Not Set");
	const [bloodType, setBloodType] = useState<string>("Not Set");
	const [allergies, setAllergies] = useState<string>("None Stored");
	const [birthday, setBirthday] = useState<string>("");

	// 3. UI Interaction State
	const [refreshing, setRefreshing] = useState(false);

	// Isolated data loader function so it can be invoked by both focus events and gestures
	const loadAllUserData = useCallback(async () => {
		try {
			// Fetch Core Account Details
			const savedUserDataString = await SecureStore.getItemAsync("user_account");
			if (savedUserDataString) {
				const savedUser = JSON.parse(savedUserDataString);
				if (savedUser.name) setUserName(savedUser.name);
				if (savedUser.email) setUserEmail(savedUser.email);
				if (savedUser.phone) setUserPhone(savedUser.phone);
			}

			// Fetch Health Profile Details
			const savedHealthDataString = await SecureStore.getItemAsync("user_health_profile");
			if (savedHealthDataString) {
				const savedHealth = JSON.parse(savedHealthDataString);
				if (savedHealth.height) setHeight(savedHealth.height);
				if (savedHealth.weight) setWeight(savedHealth.weight);
				if (savedHealth.bloodType) setBloodType(savedHealth.bloodType);
				if (savedHealth.allergies) setAllergies(savedHealth.allergies);
				if (savedHealth.birthday) setBirthday(savedHealth.birthday);
			}
		} catch (error) {
			console.error("Failed to load user profile data:", error);
		}
	}, []);

	// FIXED: Listens to screen focus. Runs every single time the user clicks on this tab.
	useFocusEffect(
		useCallback(() => {
			loadAllUserData();
		}, [loadAllUserData])
	);

	// Manual manual pull-to-refresh swipe handler
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadAllUserData();
		setRefreshing(false);
	}, [loadAllUserData]);

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

	return (
		<SafeAreaView
			style={{
				flex: 1,
				backgroundColor: currentTheme.background,
			}}
			edges={['left', 'right']}
		>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={true}
				bounces={true}
			>
				<View style={[styles.container, { marginTop: 40 }]}>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Text style={[styles.pageHeader, { color: currentTheme.text, flex: 1 }]}>
							Me
						</Text>
					</View>
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
								<TextBlock text={height} />
							</View>
							<View style={[styles.fieldContainer, { flex: 1 }]}>
								<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
									WEIGHT
								</Text>
								<TextBlock text={weight} />
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
							<TextBlock text={allergies} />
						</View>
					</View>

					<View style={{ borderColor: currentTheme.textSecondary, borderWidth: 1, opacity: 0.5, marginVertical: 20 }} />
					<Text style={{ fontFamily: "Condensed-Bold", color: currentTheme.text, fontSize: 24, marginBottom: 10 }}>EMERGENCY CONTACTS</Text>
					<View style={{ gap: 8 }}>
						<ContactCard name="John Doe" phone="09123456789" order="primary" />
						<ContactCard name="Jane Doe" phone="09123456790" order="secondary" />
					</View>
					<Text style={[styles.caption, { color: currentTheme.textSecondary, marginTop: 20 }]}>You can edit information presented here in the Settings tab.</Text>
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
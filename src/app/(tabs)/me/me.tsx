import { Themes } from "@/constants/theme";
import { useRouter } from "expo-router";
import {
	Dimensions,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	ScrollView,
} from "react-native";
import { Host, Button } from "@expo/ui";
import { SafeAreaView } from "react-native-safe-area-context";

import TextBlock from "@/components/text-block";
import { useEffect, useState } from "react";

import * as SecureStore from "expo-secure-store";
import { buttonStyle, controlSize } from "@expo/ui/swift-ui/modifiers";
import ContactCard from "@/components/contact-card";

const { width: screenWidth } = Dimensions.get("window");

export default function HomeScreen() {
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

	// Fetch both storage blocks when the component mounts
	useEffect(() => {
		async function loadAllUserData() {
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
				}
			} catch (error) {
				console.error("Failed to load user profile data:", error);
			}
		}

		loadAllUserData();
	}, []);

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
				showsVerticalScrollIndicator={true} // Set to false if you want a cleaner look
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
						{/* Full Name */}
						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								NAME
							</Text>
							<TextBlock text={userName} />
						</View>

						{/* Email */}
						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								EMAIL
							</Text>
							<TextBlock text={userEmail} />
						</View>

						{/* Phone Number (Fixed from userEmail) */}
						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								PHONE NUMBER
							</Text>
							<TextBlock text={userPhone} />
						</View>

						<View style={{ borderColor: currentTheme.textSecondary, borderWidth: 1, opacity: 0.5, marginVertical: 10 }} />

						<Text style={{ fontFamily: "Condensed-Bold", color: currentTheme.text, fontSize: 24, marginBottom: 10 }}>HEALTH INFORMATION</Text>
						{/* Height & Weight Inline Row */}
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

						{/* Blood Type */}
						<View style={styles.fieldContainer}>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								BLOOD TYPE
							</Text>
							<TextBlock text={bloodType} />
						</View>

						{/* Allergies */}
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
		fontSize: 12
	}
});
import { Themes } from "@/constants/theme";
import { useRouter } from "expo-router";
import {
	Dimensions,
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@expo/ui";
import { useEffect, useState } from "react";

import * as SecureStore from "expo-secure-store";

import SettingDatePickerItem from "@/components/setting-date-picker";
import SettingItem from "@/components/setting-page-item";
import SettingPicker from "@/components/setting-picker";

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

	const [heightIsExpanded, setHeightIsExpanded] = useState(false);

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
					<Text style={[styles.pageHeader, { color: currentTheme.text }]}>
						Settings
					</Text>
					<View
						style={{
							gap: 20,
							marginTop: 10,
							width: "100%",
							borderWidth: 0,
							borderColor: currentTheme.secondaryBttn,

							borderRadius: 10,
						}}
					>
						<View>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								ACCOUNT
							</Text>
							<View style={{ borderRadius: 12, overflow: "hidden" }}>

								<SettingItem name="Name" iconName={Icon.select({
									ios: "person.fill",
									android: import("@expo/material-symbols/person.xml")
								})} value={userName} />

								<SettingItem name="Email" iconName={Icon.select({
									ios: "at",
									android: import("@expo/material-symbols/person.xml")
								})} value={userEmail} />

								<SettingItem name="Phone Number" iconName={Icon.select({
									ios: "phone.fill",
									android: import("@expo/material-symbols/phone_enabled.xml")
								})} value={userPhone} />

								<SettingItem name="Password" iconName={Icon.select({
									ios: "asterisk",
									android: import("@expo/material-symbols/asterisk.xml")
								})} isLast={true} showChevron={true} />

							</View>
						</View>

						<View>
							<Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>
								HEALTH
							</Text>
							<View style={{ borderRadius: 12, overflow: "hidden" }}>

								<SettingDatePickerItem name="Birthday" iconName={Icon.select({
									ios: "birthday.cake.fill",
									android: import("@expo/material-symbols/cake.xml")
								})} />

								<SettingItem name="Height" iconName={Icon.select({
									ios: "lines.measurement.vertical",
									android: import("@expo/material-symbols/height.xml")
								})} value={height} />

								<SettingItem name="Weight" iconName={Icon.select({
									ios: "scalemass.fill",
									android: import("@expo/material-symbols/scale.xml")
								})} value={weight} />

								<SettingPicker name="Blood Type" iconName={Icon.select({
									ios: "drop.fill",
									android: import("@expo/material-symbols/humidity_high.xml")
								})} isLast={false} value={bloodType} />

								<SettingItem name="Allergies" iconName={Icon.select({
									ios: "nosign",
									android: import("@expo/material-symbols/block.xml")
								})} value={weight} showChevron={true} isLast={true} />
							</View>
						</View>
					</View>
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
		borderWidth: 0,
		borderColor: "#fff",
	},
	logoSection: {
		height: "35%", // Reduced slightly to give more room for keyboard space
		alignItems: "center",
		justifyContent: "flex-end",
	},
	formSection: {
		width: "100%",
		flex: 1,
	},
	loginlogo: {
		fontSize: 60,
		fontFamily: "Logo-Font",
		textAlign: "center",
	},
	pageHeader: {
		fontSize: 40,
		fontFamily: "Logo-Font",
	},
	infoLabel: {
		fontFamily: "Condensed-Bold",
		fontSize: 14,
		margin: 0,
		marginBottom: 8,
	},
});

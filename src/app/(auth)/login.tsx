import Button from "@/components/button";
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Column, FieldGroup, Host, Icon } from "@expo/ui";

import TextInput from "@/components/text-input";
import {
	autocorrectionDisabled,
	frame,
	keyboardType,
	onSubmit,
	scrollDisabled,
	submitLabel,
} from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRef, useState } from "react";
import {
	Alert,
	Dimensions,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	ImageBackground
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { auth } from "../../firebase";

const { width: screenWidth } = Dimensions.get("window");

import visibilityXml from "@expo/material-symbols/visibility.xml";
import visibilityOffXml from "@expo/material-symbols/visibility_off.xml";

export default function Login() {
	const passwordInputRef = useRef<any>(null);
	const router = useRouter();

	// 2. Setup standard React state variables to hold typed credentials
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [passVisible, setPassVisible] = useState(false);

	// 3. The Authentication Validation Function
	const handleLogin = async () => {
		// Basic structural validation checks
		if (!email || !password) {
			Alert.alert("Missing Fields", "Please enter your email and password.");
			return;
		}

		setIsSubmitting(true);

		try {
			const cleanEmail = email.toLowerCase().trim();

			// Sign in via Firebase Authentication
			await signInWithEmailAndPassword(auth, cleanEmail, password);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

			// Save an active login flag for the local navigation guard in _layout.tsx
			await SecureStore.setItemAsync("is_logged_in", "true");

			router.replace("/(tabs)/home");
		} catch (error: any) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

			// Translate common Firebase error codes into friendlier messages
			let message = "Incorrect email or password combination.";
			if (error.code === "auth/invalid-email") {
				message = "Please enter a valid email address.";
			} else if (error.code === "auth/user-not-found") {
				message = "No account found with this email. Please sign up first!";
			} else if (error.code === "auth/too-many-requests") {
				message = "Too many failed attempts. Please try again later.";
			}

			Alert.alert("Authentication Failed", message);
			console.error(error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<ImageBackground
			source={{
				uri: "https://images.stockcake.com/public/f/4/6/f46a0b7f-157f-4ba7-a89a-da22a67672ee_large/busy-night-traffic-stockcake.jpg",
			}}
			style={{ flex: 1 }}
			blurRadius={5}
		>
			<SafeAreaView
				style={{
					flex: 1,
					backgroundColor: "#000000CC",
				}}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					{/* 2. ScrollView absorbs the squeeze and allows scrolling if elements overflow */}
					<ScrollView
						contentContainerStyle={{ flexGrow: 1 }}
						bounces={false}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.container}>
							{/* Header logo area */}
							<View style={styles.logoSection}>
								<Text style={[styles.loginlogo, { color: themes.text }]}>
									Log-in
								</Text>
							</View>

							{/* Input Form area */}
							<View style={styles.formSection}>
								<View style={{ width: "100%" }}>
									<View style={{ flexDirection: "column", gap: spacing.two }}>
										<View style={{ flexDirection: "column", gap: spacing.one }}>
											<TextInput
												variant="regular"
												placeholder="Email"
												type="email"
												value={email}
												onChangeText={setEmail}
											/>
											<View style={{ flexDirection: "row", gap: spacing.one }}>
												<View style={{ flex: 1 }}>
													<TextInput
														variant="regular"
														placeholder="Password"
														type={!passVisible ? "password" : "text"}
														value={password}
														onChangeText={setPassword}
													/>
												</View>
												<Button
													variant={!passVisible ? "secondary" : "primary"}
													onPress={() => setPassVisible(!passVisible)}
												>
													<View style={{ paddingHorizontal: spacing.two, paddingVertical: spacing.one}}>
														<Host>
															{!passVisible ? (
																<Icon name={Icon.select({
																	ios: "eye.fill",
																	android: visibilityXml
																})} /> 
															) : (
																<Icon name={Icon.select({
																	ios: "eye.slash.fill",
																	android: visibilityOffXml
																})} />
															)
															}
														</Host>
													</View>
												</Button>
											</View>
										</View>
									</View>
								</View>
								<View
									style={{
										width: "100%",
										alignSelf: "center",
										marginTop: spacing.two,
										gap: spacing.none,
										borderColor: themes.text,
										borderWidth: spacing.none
									}}
								>
									<Button
										variant={isSubmitting ? "secondary" : "primary"}
										enabled={!isSubmitting}
										label={isSubmitting ? "Logging in..." : "Log-in"}
										onPress={() => {
											if (!isSubmitting) handleLogin();
										}}
										fullWidth={true}
									/>
									<Button
										label="Forgot Password"
										onPress={() => { }}
										variant="tertiary"
										enabled={!isSubmitting}
									/>
								</View>
							</View>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: "100%",
		padding: spacing.two,
		gap: spacing.two,
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
		fontSize: fontsize.giant,
		fontFamily: "Logo-Font",
		textAlign: "center",
	},
});

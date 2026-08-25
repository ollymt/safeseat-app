import Button from "@/components/button";
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Column, FieldGroup, Host, Icon } from "@expo/ui";
import {
	autocorrectionDisabled,
	frame,
	keyboardType,
	onSubmit,
	scrollDisabled,
	submitLabel,
} from "@expo/ui/swift-ui/modifiers";

import TextInput from "@/components/text-input"

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
import { auth, db } from "../../firebase";

const { width: screenWidth } = Dimensions.get("window");

import visibilityXml from "@expo/material-symbols/visibility.xml";
import visibilityOffXml from "@expo/material-symbols/visibility_off.xml";

export default function Login() {
	// 2. Setup state variables to store the user input values
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [passVisible, setPassVisible] = useState(false);

	const emailInputRef = useRef<any>(null);
	const phoneInputRef = useRef<any>(null);
	const passwordInputRef = useRef<any>(null);
	const confirmPasswordInputRef = useRef<any>(null);

	const router = useRouter();

	// 3. The Account Creation Function
	const handleSignUp = async () => {
		// Basic Validation
		if (!name || !email || !phone || !password || !confirmPassword) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			Alert.alert("Error", "Please fill out all fields.");
			return;
		}

		if (password !== confirmPassword) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			Alert.alert("Error", "Passwords do not match.");
			return;
		}

		if (password.length < 6) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			Alert.alert("Error", "Password must be at least 6 characters.");
			return;
		}

		setIsSubmitting(true);

		try {
			const cleanEmail = email.toLowerCase().trim();

			// 1. Create the account in Firebase Authentication (handles email + password securely)
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				cleanEmail,
				password,
			);
			const uid = userCredential.user.uid;

			// 2. Save the rest of the profile (name, phone) in Firestore, linked by the same uid
			await setDoc(doc(db, "users", uid), {
				name,
				email: cleanEmail,
				phone,
				createdAt: new Date().toISOString(),
			});

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			Alert.alert("Success", "Account created successfully!", [
				{
					text: "OK",
					onPress: () => router.replace("/(auth)/login"), // Route them to login screen
				},
			]);
		} catch (error: any) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

			// Translate common Firebase error codes into friendlier messages
			let message = "Something went wrong. Please try again.";
			if (error.code === "auth/email-already-in-use") {
				message = "An account with this email already exists.";
			} else if (error.code === "auth/invalid-email") {
				message = "Please enter a valid email address.";
			} else if (error.code === "auth/weak-password") {
				message = "Password is too weak. Use at least 6 characters.";
			}

			Alert.alert("Sign-up Failed", message);
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
					<ScrollView
						contentContainerStyle={{ flexGrow: 1 }}
						bounces={false}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.container}>
							{/* Logo Context Title Layout Area */}
							<View style={styles.logoSection}>
								<Text style={[styles.loginlogo, { color: themes.text }]}>
									Sign-up
								</Text>
							</View>

							{/* Main Form Context Window Layout Area */}
							<View style={styles.formSection}>
								<View style={{ width: "100%" }}>
									<View style={{ flexDirection: "column", gap: spacing.two }}>
										<View style={{ flexDirection: "column", gap: spacing.one }}>
											<TextInput
												variant="regular"
												placeholder="Name"
												type="text"
												value={name}
												onChangeText={setName}
											/>
											<TextInput
												variant="regular"
												placeholder="Email"
												type="email"
												value={email}
												onChangeText={setEmail}
											/>
											<TextInput
												variant="regular"
												placeholder="Phone Number"
												type="phone"
												value={phone}
												onChangeText={setPhone}
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
													<View style={{ paddingHorizontal: spacing.two, paddingVertical: spacing.one }}>
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
											<View style={{ flexDirection: "row", gap: spacing.one }}>
												<View style={{ flex: 1 }}>
													<TextInput
														variant="regular"
														placeholder="Confirm Password"
														type={!passVisible ? "password" : "text"}
														value={confirmPassword}
														onChangeText={setConfirmPassword}
													/>
												</View>
												<Button
													variant={!passVisible ? "secondary" : "primary"}
													onPress={() => setPassVisible(!passVisible)}
												>
													<View style={{ paddingHorizontal: spacing.two, paddingVertical: spacing.one }}>
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
										label={"Sign-up"}
										onPress={() => {
											if (!isSubmitting) handleSignUp();
										}}
										enabled={!isSubmitting}
										fullWidth={true}
										loading={isSubmitting}
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
		height: "25%",
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

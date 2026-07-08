import Button from "@/components/button";
import { Themes } from "@/constants/theme";
import { Column, FieldGroup, Host, TextInput } from "@expo/ui";
import {
  autocorrectionDisabled,
  frame,
  keyboardType,
  onSubmit,
  scrollDisabled,
  submitLabel,
} from "@expo/ui/swift-ui/modifiers";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../firebase";

const { width: screenWidth } = Dimensions.get("window");

export default function Login() {
  // 2. Setup state variables to store the user input values
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailInputRef = useRef<any>(null);
  const phoneInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);
  const confirmPasswordInputRef = useRef<any>(null);

  const router = useRouter();

  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

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
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentTheme.background,
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
              <Text style={[styles.loginlogo, { color: currentTheme.text }]}>
                Sign-up
              </Text>
            </View>

            {/* Main Form Context Window Layout Area */}
            <View style={styles.formSection}>
              <Host
                style={{
                  height: 300, // 2. Hardcoded height avoids field crushing from multi-inputs
                  width: "100%",
                }}
              >
                <Column
                  spacing={16}
                  modifiers={[frame({ maxWidth: Infinity })]}
                >
                  <FieldGroup modifiers={[scrollDisabled()]}>
                    <TextInput
                      placeholder="Name"
                      modifiers={[
                        submitLabel("next"),
                        autocorrectionDisabled(),
                        onSubmit(() => {
                          emailInputRef.current?.focus();
                        }),
                      ]}
                      onChangeText={setName}
                    />
                    <TextInput
                      ref={emailInputRef}
                      placeholder="Email"
                      modifiers={[
                        keyboardType("email-address"),
                        submitLabel("next"),
                        autocorrectionDisabled(),
                        onSubmit(() => {
                          phoneInputRef.current?.focus();
                        }),
                      ]}
                      onChangeText={setEmail}
                    />
                    <TextInput
                      ref={phoneInputRef}
                      placeholder="Phone Number"
                      modifiers={[
                        keyboardType("phone-pad"),
                        submitLabel("next"),
                        onSubmit(() => {
                          passwordInputRef.current?.focus();
                        }),
                      ]}
                      onChangeText={setPhone}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      secureTextEntry={true}
                      placeholder="Password"
                      modifiers={[
                        submitLabel("next"),
                        onSubmit(() => {
                          confirmPasswordInputRef.current?.focus();
                        }),
                      ]}
                      onChangeText={setPassword}
                    />
                    <TextInput
                      ref={confirmPasswordInputRef}
                      secureTextEntry={true}
                      placeholder="Confirm Password"
                      modifiers={[submitLabel("done")]}
                      onChangeText={setConfirmPassword}
                    />
                  </FieldGroup>
                </Column>
              </Host>

              <View
                style={{ width: "90%", alignSelf: "center", marginTop: 10 }}
              >
                <Button
                  label={isSubmitting ? "Creating account..." : "Sign-up"}
                  onPress={() => {
                    if (!isSubmitting) handleSignUp();
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    padding: 20,
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
    fontSize: 55,
    fontFamily: "Logo-Font",
    textAlign: "center",
  },
});

import Button from "@/components/button";
import SkeuoInput from "@/components/skeuo-input";
import { LinenBackground, PaperCard, Stitching } from "@/components/skeuo";
import { Materials, Themes } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../firebase";

export default function Login() {
  // 2. Setup state variables to store the user input values
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

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
    <LinenBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} keyboardShouldPersistTaps="handled">
            <View style={styles.container}>
              <View style={styles.logoSection}>
                <Text style={[styles.loginlogo, { color: currentTheme.text }]}>Sign-up</Text>
                <Stitching color={Materials.stitchDim} style={{ borderWidth: 0, borderTopWidth: 1, width: 80, marginTop: 10 }} />
              </View>

              <PaperCard style={styles.formSection}>
                <View style={{ gap: 14 }}>
                  <SkeuoInput
                    label="Name"
                    placeholder="Jane Driver"
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    onChangeText={setName}
                  />
                  <SkeuoInput
                    ref={emailInputRef}
                    label="Email"
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneInputRef.current?.focus()}
                    onChangeText={setEmail}
                  />
                  <SkeuoInput
                    ref={phoneInputRef}
                    label="Phone Number"
                    placeholder="(555) 555-5555"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    onChangeText={setPhone}
                  />
                  <SkeuoInput
                    ref={passwordInputRef}
                    label="Password"
                    placeholder="••••••••"
                    secureTextEntry
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                    onChangeText={setPassword}
                  />
                  <SkeuoInput
                    ref={confirmPasswordInputRef}
                    label="Confirm Password"
                    placeholder="••••••••"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <View style={{ width: "100%", marginTop: 20 }}>
                  <Button
                    label={isSubmitting ? "Creating account..." : "Sign-up"}
                    onPress={() => {
                      if (!isSubmitting) handleSignUp();
                    }}
                  />
                </View>
              </PaperCard>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    padding: 20,
  },
  logoSection: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 30,
  },
  formSection: {
    width: "100%",
    padding: 20,
  },
  loginlogo: {
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
  },
});

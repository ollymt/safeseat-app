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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { auth } from "../../firebase";

const { width: screenWidth } = Dimensions.get("window");

export default function Login() {
  const passwordInputRef = useRef<any>(null);
  const router = useRouter();

  // 2. Setup standard React state variables to hold typed credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

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
        {/* 2. ScrollView absorbs the squeeze and allows scrolling if elements overflow */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Header logo area */}
            <View style={styles.logoSection}>
              <Text style={[styles.loginlogo, { color: currentTheme.text }]}>
                Log-in
              </Text>
            </View>

            {/* Input Form area */}
            <View style={styles.formSection}>
              <Host
                style={{
                  borderColor: "#000",
                  borderWidth: 0,
                  height: 140, // 3. Changing from flex: 0.33 to a static height blocks collapse!
                  width: "100%",
                }}
              >
                <Column
                  spacing={16}
                  modifiers={[frame({ maxWidth: Infinity })]}
                >
                  <FieldGroup modifiers={[scrollDisabled()]}>
                    <TextInput
                      placeholder="Email"
                      modifiers={[
                        keyboardType("email-address"),
                        submitLabel("next"),
                        autocorrectionDisabled(),
                        onSubmit(() => {
                          passwordInputRef.current?.focus();
                        }),
                      ]}
                      onChangeText={setEmail}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      secureTextEntry={true}
                      placeholder="Password"
                      modifiers={[submitLabel("done"), onSubmit(handleLogin)]}
                      onChangeText={setPassword}
                    />
                  </FieldGroup>
                </Column>
              </Host>

              <View
                style={{
                  width: "90%",
                  alignSelf: "center",
                  marginTop: 10,
                  gap: 5,
                }}
              >
                <Button
                  label={isSubmitting ? "Logging in..." : "Log-in"}
                  onPress={() => {
                    if (!isSubmitting) handleLogin();
                  }}
                />
                <Button
                  label="Forgot Password"
                  onPress={() => {}}
                  variant="tertiary"
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
});

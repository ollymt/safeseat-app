import Button from "@/components/button";
import { LinenBackground, PaperCard, Stitching } from "@/components/skeuo";
import SkeuoInput from "@/components/skeuo-input";
import { Materials, Themes } from "@/constants/theme";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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
import { setStorageItem } from "../../utils/storage";

import * as Haptics from "expo-haptics";
import { auth } from "../../firebase";

export default function Login() {
  const passwordInputRef = useRef<TextInput>(null);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setStorageItem("is_logged_in", "true");
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

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
    <LinenBackground>
      <SafeAreaView style={{ flex: 1 }}>
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
              <View style={styles.logoSection}>
                <Text style={[styles.loginlogo, { color: currentTheme.text }]}>
                  Log-in
                </Text>
                <Stitching
                  color={Materials.stitchDim}
                  style={{
                    borderWidth: 0,
                    borderTopWidth: 1,
                    width: 80,
                    marginTop: 10,
                  }}
                />
              </View>

              <PaperCard style={styles.formSection}>
                <View style={{ gap: 16 }}>
                  <SkeuoInput
                    label="Email"
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    onChangeText={setEmail}
                  />
                  <SkeuoInput
                    ref={passwordInputRef}
                    label="Password"
                    placeholder="••••••••"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    onChangeText={setPassword}
                  />
                </View>

                <View style={{ width: "100%", marginTop: 20, gap: 6 }}>
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
    paddingVertical: 40,
  },
  formSection: {
    width: "100%",
    padding: 20,
  },
  loginlogo: {
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
  },
});

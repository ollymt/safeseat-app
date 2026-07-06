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
import * as SecureStore from "expo-secure-store";
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

const { width: screenWidth } = Dimensions.get("window");

export default function Login() {
  // 2. Setup state variables to store the user input values
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

    try {
      // Structure the user payload
      const userPayload = {
        name,
        email: email.toLowerCase().trim(),
        phone,
        password, // In production, never save passwords in plain text!
      };

      // Save user payload to local encrypted storage under the key 'user_account'
      await SecureStore.setItemAsync(
        "user_account",
        JSON.stringify(userPayload),
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Account created successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/login"), // Route them to login screen
        },
      ]);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Storage Error", "Could not save account details locally.");
      console.error(error);
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
                <Button label="Sign-up" onPress={() => {
                    handleSignUp()
                    }} />
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

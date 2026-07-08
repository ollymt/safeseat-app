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

const { width: screenWidth } = Dimensions.get("window");

export default function Login() {
  const passwordInputRef = useRef<SecureFieldRef>(null);
  const router = useRouter();

  // 2. Setup standard React state variables to hold typed credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

    try {
      // Fetch the saved user payload string back from the local device keychain
      const savedUserDataString =
        await SecureStore.getItemAsync("user_account");

      if (!savedUserDataString) {
        Alert.alert(
          "Authentication Failed",
          "No account found on this device. Please sign up first!",
        );
        return;
      }

      // Convert the storage JSON string back into an interactive JS Object
      const savedUser = JSON.parse(savedUserDataString);

      const inputEmailClean = email.toLowerCase().trim();
      const storedEmailClean = savedUser.email.toLowerCase().trim();

      // Check if credentials match exactly
      if (
        inputEmailClean === storedEmailClean &&
        password === savedUser.password
      ) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (
          inputEmailClean === storedEmailClean &&
          password === savedUser.password
        ) {
          // Save an active login flag
          await SecureStore.setItemAsync("is_logged_in", "true");

          router.replace("/(tabs)/home");
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Authentication Failed",
          "Incorrect email or password combination.",
        );
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "System Error",
        "An error occurred while reading storage security keys.",
      );
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
                  label="Log-in"
                  onPress={() => {
                    handleLogin();
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

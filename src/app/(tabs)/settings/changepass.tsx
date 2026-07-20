import Button from "@/components/button";
import { Themes } from "@/constants/theme";
import { Column, FieldGroup, Host, TextInput } from "@expo/ui";
import {
  frame,
  scrollDisabled,
  submitLabel,
} from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../../firebase";

export default function ChangePass() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const router = useRouter();

  // 🛠️ Step 1: Separate states for each password field
  // NOTE: @expo/ui's TextInput.value prop expects an ObservableState<string>
  // (from useNativeState), but reading it doesn't reliably trigger a React
  // re-render, so the button's "enabled" check kept seeing stale values.
  // Fix: use `defaultValue` (uncontrolled, native-managed) instead of `value`,
  // and keep tracking the typed text via onChangeText into normal React
  // state, exactly like the original working logic.
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🛠️ Step 2: Change Password Core Logic
  const handleChangePassword = async () => {
    // Basic Client-side Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "New password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const currentUser = auth.currentUser;

      if (!currentUser || !currentUser.email) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "No active session found. Please log in again.");
        setIsLoading(false);
        return;
      }

      // 1. Reauthenticate with the OLD password — Firebase checks it against the real account
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        oldPassword,
      );
      await reauthenticateWithCredential(currentUser, credential);

      // 2. If reauthentication succeeded, update to the NEW password
      await updatePassword(currentUser, newPassword);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your password has been changed successfully!", [
        { text: "OK", onPress: () => router.back() }, // Go back to settings screen
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      let message = "Failed to update password. Please try again.";
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        message = "The old password you entered is incorrect.";
      } else if (error.code === "auth/weak-password") {
        message = "New password is too weak. Use at least 6 characters.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      }

      Alert.alert("Error", message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentTheme.background,
      }}
      edges={["bottom", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={[changepass.container, { borderWidth: 0, borderColor: currentTheme.text }, Platform.OS == "android" ? { marginTop: 60 } : { marginTop: 50 }]}>
          <View style={changepass.logoSection}>
            <Text
              style={[
                changepass.loginlogo,
                { color: currentTheme.text, textAlign: "center" },
              ]}
            >
              Change Password
            </Text>
          </View>

          <View style={changepass.formSection}>
            <Host
              style={{
                borderColor: "#000",
                borderWidth: 0,
                height: 200, // 3. Changing from flex: 0.33 to a static height blocks collapse!
                width: "100%",
              }}
            >
              <Column
                spacing={16}
                modifiers={[frame({ maxWidth: Infinity })]}
              >
                <FieldGroup modifiers={[scrollDisabled()]}>
                  {/* 🛠️ Map each input field to its respective state function hooks */}
                  <TextInput
                    secureTextEntry={true}
                    placeholder="Enter Old Password"
                    defaultValue={oldPassword}
                    modifiers={[submitLabel("next")]}
                    onChangeText={setOldPassword}
                  />
                  <TextInput
                    secureTextEntry={true}
                    placeholder="Enter New Password"
                    defaultValue={newPassword}
                    modifiers={[submitLabel("next")]}
                    onChangeText={setNewPassword}
                  />
                  <TextInput
                    secureTextEntry={true}
                    placeholder="Confirm New Password"
                    defaultValue={confirmPassword}
                    modifiers={[submitLabel("done")]}
                    onChangeText={setConfirmPassword}
                  />
                </FieldGroup>
              </Column>
            </Host>
            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
              {/* 🛠️ Connect function and handle loading states */}
              <Button
                label={isLoading ? "Updating..." : "Change Password"}
                variant="primary"
                fullWidth={true}
                onPress={handleChangePassword}
                enabled={
                  !isLoading &&
                  oldPassword != "" &&
                  newPassword != "" &&
                  confirmPassword != ""
                }
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const changepass = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    padding: 20,
  },
  logoSection: {
    height: "25%", // Reduced slightly to give more room for keyboard space
    alignItems: "center",
    justifyContent: "flex-end",
  },
  formSection: {
    width: "100%",
    flex: 1,
  },
  loginlogo: {
    fontSize: 40,
    fontFamily: "Logo-Font",
    textAlign: "center",
  },
});

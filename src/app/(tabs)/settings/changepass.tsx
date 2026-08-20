import Button from "@/components/button";
import SkeuoInput from "@/components/skeuo-input";
import { LinenBackground, PaperCard, Stitching } from "@/components/skeuo";
import { Materials, Themes } from "@/constants/theme";
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
    <LinenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={[changepass.container, Platform.OS == "android" ? { marginTop: 60 } : { marginTop: 50 }]}>
              <View style={changepass.logoSection}>
                <Text style={[changepass.loginlogo, { color: currentTheme.text, textAlign: "center" }]}>
                  Change Password
                </Text>
                <Stitching color={Materials.stitchDim} style={{ borderWidth: 0, borderTopWidth: 1, width: 80, marginTop: 10, alignSelf: "center" }} />
              </View>

              <PaperCard style={changepass.formSection}>
                <View style={{ gap: 14 }}>
                  <SkeuoInput
                    label="Old Password"
                    placeholder="••••••••"
                    secureTextEntry
                    returnKeyType="next"
                    onChangeText={setOldPassword}
                  />
                  <SkeuoInput
                    label="New Password"
                    placeholder="••••••••"
                    secureTextEntry
                    returnKeyType="next"
                    onChangeText={setNewPassword}
                  />
                  <SkeuoInput
                    label="Confirm New Password"
                    placeholder="••••••••"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleChangePassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
                <View style={{ marginTop: 20 }}>
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
              </PaperCard>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinenBackground>
  );
}

const changepass = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    padding: 20,
  },
  logoSection: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 24,
  },
  formSection: {
    width: "100%",
    padding: 20,
  },
  loginlogo: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },
});

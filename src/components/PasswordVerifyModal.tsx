// components/PasswordVerifyModal.tsx
import { Themes } from "@/constants/theme";
import { extendSession } from "@/utils/securitySession";
import {
    BottomSheet,
    Button,
    Column,
    FieldGroup,
    Host,
    Icon,
    Row,
    Spacer,
    Text,
    TextInput,
} from "@expo/ui";
import {
    buttonBorderShape,
    buttonStyle,
    controlSize,
    scrollDisabled,
    submitLabel,
} from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, useColorScheme } from "react-native";
import { auth } from "../firebase";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function PasswordVerifyModal({
  visible,
  onClose,
  onSuccess,
}: Props) {
  // FIX 1: Use regular useState to ensure accurate string comparisons with secureTextEntry
  const [passwordInput, setPasswordInput] = useState("");
  const passwordInputRef = useRef<any>(null);

  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const handleVerify = async () => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser || !currentUser.email) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "No active session found. Please log in again.");
        return;
      }

      const enteredPassword = passwordInput.trim();

      // Build a credential from the current user's email + entered password,
      // then ask Firebase to reauthenticate with it. Firebase itself checks
      // the password against the real account — we never store or compare it ourselves.
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        enteredPassword,
      );

      await reauthenticateWithCredential(currentUser, credential);

      await extendSession();
      setPasswordInput(""); // Clear field
      onSuccess();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      let message = "Could not verify identity.";
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        message = "Incorrect password. Please try again.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      }

      Alert.alert("Access Denied", message);
      console.error(error);
    }
  };

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [visible]);

  return (
    <Host matchContents>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        showDragIndicator={false}
        snapPoints={["full"]}
      >
        <Column spacing={16} alignment="center">
          {/* 🧭 Header Row */}
          <Row>
            <Button
              variant="outlined"
              onPress={onClose}
              modifiers={[
                buttonStyle("glass"),
                controlSize("large"),
                buttonBorderShape("circle"),
              ]}
            >
              <Icon
                name={Icon.select({
                  ios: "xmark",
                  android: import("@expo/material-symbols/close.xml"),
                })}
              />
            </Button>

            <Spacer flexible />

            <Button
              onPress={handleVerify}
              variant={passwordInput ? "filled" : "outlined"}
              modifiers={[
                passwordInput
                  ? buttonStyle("borderedProminent")
                  : buttonStyle("glass"),
                controlSize("large"),
                buttonBorderShape("circle"),
              ]}
              disabled={passwordInput == ""}
            >
              <Icon
                name={Icon.select({
                  ios: "checkmark",
                  android: import("@expo/material-symbols/check.xml"),
                })}
              />
            </Button>
          </Row>

          {/* Main Content Body */}
          <Text
            textStyle={{
              color: currentTheme.text,
              fontSize: 36,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Enter Password to Continue
          </Text>

          <Column spacing={10} alignment="center">
            {/* TextInput field */}
            <FieldGroup modifiers={[scrollDisabled()]}>
              <TextInput
                placeholder="Password"
                secureTextEntry={true}
                // FIX 2: Use native text and onTextChange properties for custom state sync
                ref={passwordInputRef}
                onChangeText={setPasswordInput}
                modifiers={[submitLabel("done")]}
                textAlign="center"
                onSubmitEditing={handleVerify}
              />
            </FieldGroup>
            <Button
              label="Continue"
              variant={passwordInput ? "filled" : "outlined"}
              modifiers={[
                passwordInput
                  ? buttonStyle("borderedProminent")
                  : buttonStyle("glass"),
                controlSize("large"),
                buttonBorderShape("capsule"),
              ]}
              disabled={passwordInput == ""}
              onPress={handleVerify}
            />
          </Column>
          <Text
            textStyle={{
              fontSize: 13,
              color: currentTheme.textSecondary,
              textAlign: "center",
            }}
          >
            After this, you can change any important setting for 15 minutes.
          </Text>
          <Spacer />
        </Column>
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 36,
    textAlign: "center",
    height: 100,
    fontFamily: "Logo-Font",
    borderWidth: 1,
    borderColor: "#fff",
    marginBottom: 8,
  },
});

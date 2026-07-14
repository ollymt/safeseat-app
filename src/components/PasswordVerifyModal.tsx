// components/PasswordVerifyModal.tsx
import { Themes } from "@/constants/theme";
import { extendSession } from "@/utils/securitySession";
import { BottomSheet, Button, Column, FieldGroup, Host, Icon, Row, Spacer, Text, TextInput } from "@expo/ui";
import { buttonBorderShape, buttonStyle, controlSize, scrollDisabled, submitLabel } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, useColorScheme } from "react-native";

// 🛠️ Fixed: Using single, unified Firebase imports
import { auth } from "../firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function PasswordVerifyModal({ visible, onClose, onSuccess }: Props) {
    const [passwordInput, setPasswordInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const passwordInputRef = useRef<any>(null);

    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const handleVerify = async () => {
        const currentUser = auth.currentUser;
        const enteredPassword = passwordInput.trim();

        if (!currentUser || !currentUser.email) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "No active session found. Please sign in again.");
            return;
        }

        setIsLoading(true);

        try {
            const credential = EmailAuthProvider.credential(
                currentUser.email,
                enteredPassword
            );

            await reauthenticateWithCredential(currentUser, credential);

            await extendSession();
            setPasswordInput(""); // Reset field
            onSuccess();
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                Alert.alert("Access Denied", "Incorrect password. Please try again.");
            } else {
                console.error("Firebase Reauthentication Failure: ", error);
                Alert.alert("Error", "Could not verify identity. Check your connection.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [visible]);

    return (
        <Host matchContents>
            <BottomSheet
                isPresented={visible}
                onDismiss={onClose}
                showDragIndicator={false}
                snapPoints={["half"]}
            >
                <Column spacing={16} alignment="center">
                    {/* 🧭 Header Navigation Row */}
                    <Row>
                        <Button
                            variant="outlined"
                            onPress={onClose}
                            disabled={isLoading}
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
                        <Spacer />
                        <Button
                            onPress={handleVerify}
                            variant={passwordInput && !isLoading ? "filled" : "outlined"}
                            modifiers={[
                                passwordInput && !isLoading
                                    ? buttonStyle("borderedProminent")
                                    : buttonStyle("glass"),
                                controlSize("large"),
                                buttonBorderShape("circle"),
                            ]}
                            disabled={passwordInput === "" || isLoading}
                        >
                            <Icon
                                name={Icon.select({
                                    ios: "checkmark",
                                    android: import("@expo/material-symbols/check.xml"),
                                })}
                            />
                        </Button>
                    </Row>

                    {/* 🔑 Verification Form Stack */}
                    <Column spacing={10} alignment="center">
                        <Text textStyle={{ fontSize: 36, color: currentTheme.text, fontWeight: "bold", textAlign: "center" }}>Enter Password to Continue</Text>
                        <FieldGroup modifiers={[scrollDisabled()]} style={{ borderWidth: 3 }}>
                            <TextInput
                                placeholder="Password"
                                secureTextEntry={true}
                                editable={!isLoading}
                                ref={passwordInputRef}
                                onChangeText={setPasswordInput}
                                value={passwordInput}
                                modifiers={[submitLabel("done")]}
                                textAlign="center"
                                onSubmitEditing={handleVerify}
                            />
                        </FieldGroup>
                        <Button
                            label={isLoading ? "Verifying..." : "Continue"}
                            variant={passwordInput && !isLoading ? "filled" : "outlined"}
                            modifiers={[
                                passwordInput && !isLoading
                                    ? buttonStyle("borderedProminent")
                                    : buttonStyle("glass"),
                                controlSize("large"),
                                buttonBorderShape("capsule"),
                            ]}
                            disabled={passwordInput === "" || isLoading}
                            onPress={handleVerify}
                        />
                    </Column>

                    <Text textStyle={{ fontSize: 13, color: currentTheme.textSecondary, textAlign: "center" }}>
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
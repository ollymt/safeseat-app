// components/PasswordVerifyModal.tsx
import { Themes } from "@/constants/theme";
import { extendSession } from "@/utils/securitySession";
import { BottomSheet, Button, Column, FieldGroup, Host, Icon, Row, Spacer, Text, TextInput } from "@expo/ui";
import { buttonBorderShape, buttonStyle, controlSize, scrollDisabled, submitLabel } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, useColorScheme } from "react-native";

// 🛠️ Step 1: Import Firebase Auth methods
import { auth } from "@/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function PasswordVerifyModal({ visible, onClose, onSuccess }: Props) {
    const [passwordInput, setPasswordInput] = useState("");
    const [isLoading, setIsLoading] = useState(false); // Track loading states during network check
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
            // 🛠️ Step 2: Create a secure credential object using the user's email and entered password
            const credential = EmailAuthProvider.credential(
                currentUser.email,
                enteredPassword
            );

            // 🛠️ Step 3: Pass the credential block directly to the live Firebase instance
            await reauthenticateWithCredential(currentUser, credential);

            // If it succeeds without throwing an error, password is correct!
            await extendSession();
            setPasswordInput(""); // Reset field
            onSuccess();
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            // Catch common Auth-related network/password error codes
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
            <BottomSheet isPresented={visible} onDismiss={onClose} showDragIndicator={false} snapPoints={["full"]}>
                <Column spacing={16} alignment="center">

                    {/* 🧭 Header Row */}
                    <Row>
                        <Button
                            variant="outlined"
                            onPress={onClose}
                            disabled={isLoading}
                            modifiers={[buttonStyle('glass'), controlSize("large"), buttonBorderShape("circle")]}
                        >
                            <Icon name={Icon.select({
                                ios: "xmark",
                                android: import("@expo/material-symbols/close.xml")
                            })} />
                        </Button>

                        <Spacer flexible />

                        <Button
                            onPress={handleVerify}
                            variant={passwordInput && !isLoading ? "filled" : "outlined"}
                            modifiers={[passwordInput && !isLoading ? buttonStyle("borderedProminent") : buttonStyle("glass"), controlSize("large"), buttonBorderShape("circle")]}
                            disabled={passwordInput == "" || isLoading}
                        >
                            <Icon name={Icon.select({
                                ios: "checkmark",
                                android: import("@expo/material-symbols/check.xml")
                            })} />
                        </Button>
                    </Row>

                    {/* Main Content Body */}
                    <Text textStyle={{ color: currentTheme.text, fontSize: 36, fontWeight: "bold", textAlign: "center" }}>
                        Enter Password to Continue
                    </Text>

                    <Column spacing={10} alignment="center">
                        <FieldGroup modifiers={[scrollDisabled()]}>
                            <TextInput
                                placeholder="Password"
                                secureTextEntry={true}
                                editable={!isLoading} // Lock input during cloud check
                                ref={passwordInputRef}
                                onChangeText={setPasswordInput}
                                modifiers={[submitLabel("done")]}
                                textAlign="center"
                                onSubmitEditing={handleVerify}
                            />
                        </FieldGroup>
                        <Button
                            label={isLoading ? "Verifying..." : "Continue"}
                            variant={passwordInput && !isLoading ? "filled" : "outlined"}
                            modifiers={[passwordInput && !isLoading ? buttonStyle("borderedProminent") : buttonStyle("glass"), controlSize("large"), buttonBorderShape("pill")]}
                            disabled={passwordInput == "" || isLoading}
                            onPress={handleVerify}
                        />
                    </Column>
                    <Text textStyle={{ fontSize: 13, color: currentTheme.textSecondary, textAlign: "center" }}>After this, you can change any important setting for 15 minutes.</Text>
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
        marginBottom: 8
    }
});
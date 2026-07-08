// components/PasswordVerifyModal.tsx
import { Themes } from "@/constants/theme";
import { extendSession } from "@/utils/securitySession";
import { BottomSheet, Button, Column, FieldGroup, Host, Icon, Row, Spacer, Text, TextInput } from "@expo/ui";
import { buttonBorderShape, buttonStyle, controlSize, scrollDisabled, submitLabel } from "@expo/ui/swift-ui/modifiers";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics"
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, useColorScheme } from "react-native";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function PasswordVerifyModal({ visible, onClose, onSuccess }: Props) {
    // FIX 1: Use regular useState to ensure accurate string comparisons with secureTextEntry
    const [passwordInput, setPasswordInput] = useState("");
    const passwordInputRef = useRef<any>(null);

    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const handleVerify = async () => {
        try {
            const savedUserDataString = await SecureStore.getItemAsync("user_account");

            if (savedUserDataString) {
                const savedUser = JSON.parse(savedUserDataString);
                const actualPassword = savedUser.password;


                // Clean both sides just in case of keyboard auto-spacing
                const enteredPassword = passwordInput.trim();

                console.log(actualPassword)
                console.log(enteredPassword)

                if (enteredPassword === actualPassword) {
                    await extendSession();
                    setPasswordInput(""); // Clear field
                    onSuccess();
                } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    Alert.alert("Access Denied", "Incorrect password. Please try again.");
                }
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                Alert.alert("Error", "No user profile found on this device. Please sign up again.");
            }
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Error", "Could not verify identity.");
        }
    };

    useEffect(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }, [visible])

    return (
        <Host matchContents>
            <BottomSheet isPresented={visible} onDismiss={onClose} showDragIndicator={false} snapPoints={["full"]}>
                <Column spacing={16} alignment="center">

                    {/* 🧭 Header Row */}
                    <Row>
                        <Button
                            variant="outlined"
                            onPress={onClose}
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
                            variant={passwordInput ? "filled" : "outlined"}
                            modifiers={[passwordInput ? buttonStyle("borderedProminent") : buttonStyle("glass"), controlSize("large"), buttonBorderShape("circle")]}
                            disabled={passwordInput == ""}
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
                            modifiers={[passwordInput ? buttonStyle("borderedProminent") : buttonStyle("glass"), controlSize("large"), buttonBorderShape("pill")]}
                            disabled={passwordInput == ""}
                            onPress={() => { }}
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
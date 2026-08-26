// components/ChangePhoneModal.tsx
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Host, Icon } from "@expo/ui";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";

// 🛠️ Firebase Imports
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import Button from "./button";
import TextInput from "./text-input";

import visibilityXml from "@expo/material-symbols/visibility.xml";
import visibilityOffXml from "@expo/material-symbols/visibility_off.xml";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

// Validates international/standard phone numbers (E.164 compliant: 7 to 15 digits)
const isValidPhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 11;
};

export default function ChangePhoneModal({ visible, onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [passVisible, setPassVisible] = useState(false);

    useEffect(() => {
        if (visible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [visible]);

    const hasUnsavedChanges = phone !== "" || password !== "";
    const isFormInvalid = !isValidPhoneNumber(phone) || password.trim() === "";

    const handleResetAndClose = () => {
        setPhone("");
        setPassword("");
        onClose();
    };

    const handleSave = async () => {
        const currentUser = auth.currentUser;

        if (!currentUser || !currentUser.email) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Authentication Error", "No active user found. Please sign in again.");
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Invalid Phone Number", "Please enter a valid phone number.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Verify the current password against Firebase Auth
            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);

            // 2. Update the phone field directly in the Firestore user document
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                phone: phone.trim(),
            });
            handleResetAndClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Error updating phone document: ", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            let errorMessage = "Failed to update phone number. Please try again.";
            if (
                error.code === "auth/wrong-password" ||
                error.code === "auth/invalid-credential" ||
                error.code === "auth/invalid-password"
            ) {
                errorMessage = "Incorrect password. Please try again.";
            }

            Alert.alert("Update Failed", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={handleResetAndClose}
        >
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={styles.backdrop}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ width: "100%" }}
                    >
                        <View style={styles.container}>
                            <Text style={styles.header}>Change Phone Number</Text>

                            <View style={{ width: "100%", gap: spacing.one }}>
                                <TextInput
                                    type="phone"
                                    variant="regular"
                                    placeholder="New Phone Number"
                                    enabled={!isLoading}
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                                <View style={{ flexDirection: "row", gap: spacing.one }}>

                                    <View style={{ flex: 1 }}>
                                        <TextInput
                                            type={passVisible ? "text" : "password"}
                                            variant="regular"
                                            placeholder="Password"
                                            enabled={true}
                                            value={password}
                                            onChangeText={setPassword}
                                        />
                                    </View>

                                    <Button
                                        variant={!passVisible ? "secondary" : "primary"}
                                        onPress={() => setPassVisible(!passVisible)}
                                    >
                                        <View style={{ paddingHorizontal: spacing.two, paddingVertical: spacing.one }}>
                                            <Host>
                                                {!passVisible ? (
                                                    <Icon name={Icon.select({
                                                        ios: "eye.fill",
                                                        android: visibilityXml
                                                    })} />
                                                ) : (
                                                    <Icon name={Icon.select({
                                                        ios: "eye.slash.fill",
                                                        android: visibilityOffXml
                                                    })} />
                                                )
                                                }
                                            </Host>
                                        </View>
                                    </Button>

                                </View>
                            </View>

                            <View style={styles.actionRow}>
                                <Button
                                    variant={hasUnsavedChanges ? "warn" : "secondary"}
                                    label={hasUnsavedChanges ? "Discard" : "Cancel"}
                                    enabled={!isLoading}
                                    onPress={() => {
                                        if (hasUnsavedChanges) {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                                            Alert.alert("Discard Changes?", "You have unsaved changes. Discard?", [
                                                { text: "Cancel", style: "cancel" },
                                                { text: "Discard", onPress: handleResetAndClose, style: "destructive" },
                                            ]);
                                        } else {
                                            handleResetAndClose();
                                        }
                                    }}
                                    style={{ borderRadius: 6 }}
                                />
                                <View style={{ flex: 1 }}>
                                    <Button
                                        variant="primary"
                                        label="Update Phone Number"
                                        onPress={handleSave}
                                        style={{ borderRadius: 6 }}
                                        enabled={!isFormInvalid && !isLoading}
                                        loading={isLoading}
                                    />
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.two,
    },
    container: {
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: themes.backgroundElement,
        borderWidth: spacing.quarter,
        borderColor: themes.secondaryBttn,
        padding: spacing.one,
        borderRadius: spacing.edge,
        gap: spacing.one,
    },
    header: {
        color: themes.text,
        fontSize: fontsize.header,
        fontFamily: "Heading-Font",
    },
    actionRow: {
        flexDirection: "row",
        gap: spacing.half,
        maxWidth: "100%",
    },
});
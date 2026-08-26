// components/ChangeEmailModal.tsx
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { Host, Icon } from "@expo/ui";
import { useEffect, useState } from "react";
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

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

export default function ChangeEmailModal({ visible, onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passVisible, setPassVisible] = useState(false);

    useEffect(() => {
        if (visible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [visible]);

    const hasUnsavedChanges = email !== "" || password !== "";
    const isFormInvalid = !isValidEmail(email) || password.trim() === "";

    const handleResetAndClose = () => {
        setEmail("");
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

        if (!isValidEmail(email)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Invalid Email", "Please enter a valid email address.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Verify the current password against Firebase Auth
            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);

            // 2. Update the email field directly in the Firestore user document
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                email: email.trim(),
            });

            handleResetAndClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Error updating email document: ", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            let errorMessage = "Failed to update email. Please try again.";
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
                            <Text style={styles.header}>Change Email</Text>

                            <View style={{ width: "100%", gap: spacing.one }}>
                                <TextInput
                                    type="email"
                                    variant="regular"
                                    placeholder="New Email"
                                    enabled={!isLoading}
                                    value={email}
                                    onChangeText={setEmail}
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
                                        label="Update Email"
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
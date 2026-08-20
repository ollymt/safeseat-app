// components/PasswordVerifyModal.tsx
import UButton from "@/components/button";
import SkeuoInput from "@/components/skeuo-input";
import { LeatherPanel, PaperCard } from "@/components/skeuo";
import { Themes } from "@/constants/theme";
import { extendSession } from "@/utils/securitySession";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View,
} from "react-native";

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
    const passwordInputRef = useRef<TextInput>(null);

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
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
                    <LeatherPanel style={styles.sheet} inset={10}>
                        <View style={styles.headerRow}>
                            <Pressable onPress={onClose} disabled={isLoading} style={styles.chromeCircle}>
                                <Ionicons name="close" size={18} color="#F1E3C6" />
                            </Pressable>
                            <View style={{ flex: 1 }} />
                            <Pressable
                                onPress={handleVerify}
                                disabled={passwordInput === "" || isLoading}
                                style={[styles.chromeCircle, passwordInput && !isLoading ? styles.chromeCircleActive : null]}
                            >
                                <Ionicons name="checkmark" size={18} color="#F1E3C6" />
                            </Pressable>
                        </View>

                        <Text style={styles.title}>Enter Password to Continue</Text>

                        <PaperCard style={{ width: "100%", padding: 16, marginTop: 16 }}>
                            <SkeuoInput
                                ref={passwordInputRef}
                                placeholder="Password"
                                secureTextEntry
                                editable={!isLoading}
                                onChangeText={setPasswordInput}
                                value={passwordInput}
                                returnKeyType="done"
                                onSubmitEditing={handleVerify}
                            />
                            <View style={{ marginTop: 16 }}>
                                <UButton
                                    label={isLoading ? "Verifying..." : "Continue"}
                                    variant="primary"
                                    fullWidth
                                    enabled={passwordInput !== "" && !isLoading}
                                    onPress={handleVerify}
                                />
                            </View>
                        </PaperCard>

                        <Text style={styles.caption}>
                            After this, you can change any important setting for 15 minutes.
                        </Text>
                    </LeatherPanel>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
        width: "100%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 34,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    chromeCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    chromeCircleActive: {
        backgroundColor: "#4F8B29",
    },
    title: {
        fontSize: 24,
        color: "#F1E3C6",
        fontWeight: "800",
        textAlign: "center",
    },
    caption: {
        fontSize: 13,
        color: "#C9AC7C",
        textAlign: "center",
        marginTop: 14,
    },
});
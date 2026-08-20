// components/AddContactModal.tsx
import UButton from "@/components/button";
import SkeuoInput from "@/components/skeuo-input";
import { LeatherPanel, PaperCard } from "@/components/skeuo";
import { Materials, Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";

// 🛠️ Firebase Imports
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

const PRIORITY_LABELS = ["Not set", "Primary", "Secondary", "Tertiary", "Quaternary", "Quinary"];

export default function AddContactModal({ visible, onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const [priority, setPriority] = useState(0);
    const priorityString = ["not set", "primary", "secondary", "tertiary", "quaternary", "quinary"][priority];

    const [discardConfirmVisible, setDiscardConfirmVisible] = useState(false);

    useEffect(() => {
        if (visible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [visible]);

    const hasUnsavedChanges =
        name !== "" ||
        phone !== "" ||
        priority !== 0;

    const isFormInvalid =
        name.trim() === "" ||
        phone.trim() === "";

    const handleResetAndClose = () => {
        setName("");
        setPhone("");
        setPriority(0);
        setDiscardConfirmVisible(false);
        onClose();
    };

    const handleAttemptClose = () => {
        if (hasUnsavedChanges) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert("Discard?", "You have unsaved changes. Discard?", [
                { text: "Cancel", style: "cancel" },
                { text: "Discard", style: "destructive", onPress: () => handleResetAndClose() },
            ]);
        } else {
            onClose();
        }
    };

    const handleSave = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Authentication Error", "You must be signed in to add emergency contacts.");
            return;
        }

        setIsLoading(true);
        try {
            const contactsCollectionRef = collection(db, "users", currentUser.uid, "emergencyContacts");

            await addDoc(contactsCollectionRef, {
                name: name.trim(),
                phone: phone.trim(),
                hierarchy: Number(priority),
                createdAt: new Date().toISOString(),
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleResetAndClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error saving emergency contact to Firestore: ", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Save Error", "Failed to create this contact. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleAttemptClose}>
            <View style={styles.backdrop}>
                <LeatherPanel style={styles.sheet} inset={10}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={handleAttemptClose} disabled={isLoading} style={styles.chromeCircle}>
                            <Ionicons name="close" size={18} color="#F1E3C6" />
                        </Pressable>
                        <View style={{ flex: 1 }} />
                        <Pressable
                            onPress={handleSave}
                            disabled={isLoading || isFormInvalid}
                            style={[styles.chromeCircle, !isFormInvalid && !isLoading ? styles.chromeCircleActive : null]}
                        >
                            <Ionicons name="checkmark" size={18} color="#F1E3C6" />
                        </Pressable>
                    </View>

                    <Text style={styles.title}>New Contact</Text>

                    <PaperCard style={{ width: "100%", padding: 16, marginTop: 16 }}>
                        <View style={{ gap: 14 }}>
                            <SkeuoInput
                                label="Name"
                                placeholder="Name"
                                editable={!isLoading}
                                onChangeText={setName}
                                value={name}
                                returnKeyType="next"
                            />
                            <SkeuoInput
                                label="Phone"
                                placeholder="Phone"
                                editable={!isLoading}
                                onChangeText={setPhone}
                                value={phone}
                                keyboardType="phone-pad"
                                returnKeyType="done"
                            />

                            <View>
                                <Text style={[styles.priorityLabel, { color: currentTheme.textSecondary }]}>PRIORITY</Text>
                                <View style={{ flexDirection: "row", gap: 6 }}>
                                    {[0, 1, 2, 3, 4, 5].map((p) => {
                                        const active = p === priority;
                                        return (
                                            <Pressable
                                                key={p}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setPriority(p);
                                                }}
                                                style={[
                                                    styles.priorityTile,
                                                    {
                                                        backgroundColor: active ? currentTheme.primaryBttn : currentTheme.backgroundElement,
                                                        borderColor: Materials.brassDark,
                                                    },
                                                ]}
                                            >
                                                <Text style={{ color: active ? currentTheme.primaryBttnText : currentTheme.textSecondary, fontWeight: "800" }}>
                                                    {p === 0 ? "—" : p}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                        <View style={{ marginTop: 20 }}>
                            <UButton
                                label={isLoading ? "Saving..." : "Save Contact"}
                                variant="primary"
                                fullWidth
                                enabled={!isLoading && !isFormInvalid}
                                onPress={handleSave}
                            />
                        </View>
                    </PaperCard>

                    {priority !== 0 && (
                        <Text style={styles.caption}>
                            {name.trim() === "" ? "This" : name} will be your {priorityString} emergency contact.
                        </Text>
                    )}
                </LeatherPanel>
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
        fontSize: 28,
        color: "#F1E3C6",
        fontWeight: "800",
        textAlign: "center",
    },
    priorityLabel: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    priorityTile: {
        flex: 1,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    caption: {
        fontSize: 13,
        color: "#C9AC7C",
        textAlign: "center",
        marginTop: 14,
    },
});
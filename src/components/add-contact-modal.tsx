// components/AddContactModal.tsx
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, useColorScheme, Modal, Text, View, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";

// 🛠️ Firebase Imports
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

import Button from "./button";
import TextInput from "./text-input";
import { Dropdown } from "react-native-element-dropdown"

const HIERARCHIES = [
    { label: "Primary", value: 1 },
    { label: "Secondary", value: 2 },
    { label: "Tertiary", value: 3 },
    { label: "Quaternary", value: 4 },
    { label: "Quinary", value: 5 }
]

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

export default function AddContactModal({ visible, onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const [priority, setPriority] = useState(0);

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

    const handleSave = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Authentication Error", "You must be signed in to add emergency contacts.");
            return;
        }

        setIsLoading(true);
        try {
            // 🌟 Save to users/{uid}/emergencyContacts subcollection
            const contactsCollectionRef = collection(db, "users", currentUser.uid, "emergencyContacts");

            await addDoc(contactsCollectionRef, {
                name: name.trim(),
                phone: phone.trim(),
                hierarchy: Number(priority), // 🌟 Saved as hierarchy (0-5)
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
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            {/* Full-screen backdrop wrapper that centers children */}
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={styles.backdrop}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS == "ios" ? "padding" : "height"}
                        style={{ width: "100%" }}
                    >

                        <View style={styles.container}>
                            <Text style={styles.header}>
                                New Contact
                            </Text>
                            <View style={{ width: "100%", gap: spacing.one }}>

                                <TextInput
                                    type="text"
                                    variant="regular"
                                    placeholder="Name"
                                    enabled={true}
                                    value={name}
                                    onChangeText={setName}
                                />

                                <TextInput
                                    type="phone"
                                    variant="regular"
                                    placeholder="Phone Number"
                                    enabled={true}
                                    value={phone}
                                    onChangeText={setPhone}
                                />

                                <Dropdown 
                                    mode="default"
                                    data={HIERARCHIES}
                                    labelField="label"
                                    valueField="value"
                                    selectedTextStyle={{ color: themes.text, fontFamily: "Body-Medium" }}
                                    placeholder="Heirarchy"
                                    placeholderStyle={{ color: themes.textInputPlaceholder, fontFamily: "Body-Medium" }}
                                    value={priority}
                                    style={[
                                        styles.input,
                                        
                                    ]}
                                    containerStyle={{
                                        backgroundColor: themes.backgroundElement,
                                        borderRadius: spacing.edge,
                                        borderWidth: spacing.quarter,
                                        borderColor: themes.secondaryBttn,
                                        overflow: "hidden",
                                        gap: spacing.none,
                                    }}
                                    itemTextStyle={{
                                        color: themes.text,
                                        margin: spacing.none,
                                        padding: spacing.none,
                                        fontFamily: "Body-Medium",
                                    }}
                                    itemContainerStyle={{
                                        margin: spacing.none,
                                        marginHorizontal: spacing.none,
                                        padding: spacing.none,
                                        borderBottomWidth: spacing.quarter,
                                        borderColor: themes.secondaryBttn,
                                    }}
                                    activeColor={themes.primaryBttn}
                                    maxHeight={spacing.ten * 3}
                                    onChange={(value) => {setPriority(value)}}
                                    autoScroll={false}
                                />
                            </View>

                            <View style={styles.actionRow}>
                                <Button variant="secondary" label="Cancel" onPress={handleResetAndClose} style={{ borderRadius: 6 }} />
                                <View style={{ flex: 1 }}>
                                    <Button variant="primary" label="Create" onPress={handleSave} style={{ borderRadius: 6 }} />
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
    // Full-screen overlay to dim screen and center content
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.two, // Prevents modal from touching screen edges
    },
    // Centered card content container
    container: {
        width: "100%", // Or a fixed width/max-width like 320
        maxWidth: 400,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: themes.backgroundElement,
        borderWidth: spacing.quarter,
        borderColor: themes.secondaryBttn,
        padding: spacing.one,
        borderRadius: spacing.edge,
        gap: spacing.one
    },
    header: {
        color: themes.text,
        fontSize: fontsize.header,
        fontFamily: "Heading-Font"
    },
    actionRow: {
        flexDirection: "row",
        gap: spacing.half,
        maxWidth: "100%",
    },
    input: {
        height: spacing.six,
        borderWidth: spacing.quarter,
        paddingHorizontal: spacing.two,
        fontSize: fontsize.button,
        borderRadius: spacing.edge,
        color: themes.text,
        fontFamily: "Body-Medium",
        backgroundColor: themes.backgroundElement,
        borderColor: themes.textSecondary,
        borderStyle: "dashed"
    },
    focused: {
        borderColor: themes.text,
        borderStyle: "solid"
    },
    warnInput: {
        borderColor: themes.warnBttn,
    },
    disabledInput: {
        opacity: 0.5,
    },
});
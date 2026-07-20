// components/AddContactModal.tsx
import { Themes } from "@/constants/theme";
import { BottomSheet, Button, Column, FieldGroup, Host, Icon, Row, Slider, Spacer, Text, TextInput } from "@expo/ui";
import { ConfirmationDialog, Button as SwiftButton } from "@expo/ui/swift-ui";
import { buttonBorderShape, buttonStyle, controlSize, submitLabel } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { StyleSheet, useColorScheme, Alert, Platform } from "react-native";

// 🛠️ Firebase Imports
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

export default function AddContactModal({ visible, onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const [priority, setPriority] = useState(0);
    const [priorityString, setPriorityString] = useState("");

    useEffect(() => {
        switch (priority) {
            case 1:
                setPriorityString("primary");
                break;
            case 2:
                setPriorityString("secondary");
                break;
            case 3:
                setPriorityString("tertiary");
                break;
            case 4:
                setPriorityString("quaternary");
                break;
            case 5:
                setPriorityString("quinary");
                break;
            default:
                setPriorityString("not set");
        }
    }, [priority]);

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
        <Host matchContents>
            <BottomSheet
                isPresented={visible}
                onDismiss={onClose}
                showDragIndicator={false}
                snapPoints={["full"]}
            >
                <Column spacing={16} alignment="center">
                    <Row>
                        {Platform.OS === "ios" ? (
                            <ConfirmationDialog
                                title="Discard your progress?"
                                isPresented={discardConfirmVisible}
                                onIsPresentedChange={setDiscardConfirmVisible}
                                titleVisibility="visible"
                            >
                                <ConfirmationDialog.Trigger>
                                    <Button
                                        variant="outlined"
                                        onPress={() => {
                                            if (hasUnsavedChanges) {
                                                setDiscardConfirmVisible(true);
                                            } else {
                                                onClose();
                                            }
                                        }}
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
                                </ConfirmationDialog.Trigger>
                                <ConfirmationDialog.Actions>
                                    <SwiftButton
                                        label="Discard"
                                        role="destructive"
                                        onPress={handleResetAndClose}
                                    />
                                    <SwiftButton
                                        label="Cancel"
                                        onPress={() => setDiscardConfirmVisible(false)}
                                    />
                                </ConfirmationDialog.Actions>
                            </ConfirmationDialog>
                        ) : (
                            <Button
                                variant="outlined"
                                onPress={() => {
                                    if (hasUnsavedChanges) {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        Alert.alert("Discard?", "You have unsaved changes. Discard?", [
                                            {
                                                text: "Cancel",
                                                style: "cancel"
                                            },
                                            {
                                                text: "Discard",
                                                style: "destructive",
                                                onPress: () => handleResetAndClose()
                                            }
                                        ]);
                                    } else {
                                        onClose();
                                    }
                                }}
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
                        )}
                        <Spacer flexible />
                        <Button
                            onPress={handleSave}
                            variant={isFormInvalid ? "outlined" : "filled"}
                            modifiers={[
                                isFormInvalid ? buttonStyle("glass") : buttonStyle("borderedProminent"),
                                controlSize("large"),
                                buttonBorderShape("circle"),
                            ]}
                            disabled={isLoading || isFormInvalid}
                        >
                            <Icon
                                name={Icon.select({
                                    ios: "checkmark",
                                    android: import("@expo/material-symbols/check.xml"),
                                })}
                            />
                        </Button>
                    </Row>

                    <Column spacing={0} alignment="center">
                        <Text textStyle={{ fontSize: 36, color: currentTheme.text, fontWeight: "bold", textAlign: "center" }}>
                            New Contact
                        </Text>
                        <FieldGroup>
                            <FieldGroup.Section>
                                <TextInput
                                    placeholder="Name"
                                    editable={!isLoading}
                                    onChangeText={setName}
                                    // @ts-ignore
                                    value={name}
                                    modifiers={[submitLabel("next")]}
                                    // @ts-ignore
                                    textAlign="left"
                                />
                                <TextInput
                                    placeholder="Phone"
                                    editable={!isLoading}
                                    onChangeText={setPhone}
                                    // @ts-ignore
                                    value={phone}
                                    modifiers={[submitLabel("next")]}
                                    keyboardType="phone-pad"
                                    // @ts-ignore
                                    textAlign="left"
                                />
                                <Row spacing={8} alignment="center">
                                    <Text>Priority</Text>
                                    <Column>
                                        <Slider
                                            value={priority}
                                            onValueChange={setPriority}
                                            min={0}
                                            max={5}
                                            step={1}
                                        />
                                    </Column>
                                </Row>
                            </FieldGroup.Section>
                        </FieldGroup>
                        {priority !== 0 && (
                            // @ts-ignore
                            <Text textStyle={{ fontSize: 13, color: currentTheme.textSecondary, textAlign: "center" }}>
                                {name.trim() === "" ? "This" : name} will be your {priorityString} emergency contact.
                            </Text>
                        )}
                    </Column>
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
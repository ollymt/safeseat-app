// components/AddProfileModal.tsx
import { Themes } from "@/constants/theme";
import { BottomSheet, Button, Column, FieldGroup, Host, Icon, Row, Spacer, Text, TextInput, Picker } from "@expo/ui";
import { ConfirmationDialog, Button as SwiftButton, DatePicker, Group } from "@expo/ui/swift-ui";
import { buttonBorderShape, buttonStyle, controlSize, presentationBackground, presentationDetents, submitLabel } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { StyleSheet, useColorScheme, Platform, Alert } from "react-native";

// 🛠️ Firebase Imports
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

const bloodTypes = [
    { label: "Not Set", value: "none" },
    { label: "A+", value: "a+" },
    { label: "A-", value: "a-" },
    { label: "B+", value: "b+" },
    { label: "B-", value: "b-" },
    { label: "AB+", value: "ab+" },
    { label: "AB-", value: "ab-" },
    { label: "O+", value: "o+" },
    { label: "O-", value: "o-" },
];

export default function AddProfileModal({ visible, onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const [name, setName] = useState("");
    const [icon, setIcon] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [birthday, setBirthday] = useState(new Date());

    const [isMetric, setIsMetric] = useState(false);

    const [heightCm, setHeightCm] = useState("");
    const [heightFt, setHeightFt] = useState("");
    const [heightIn, setHeightIn] = useState("");

    const [weightKg, setWeightKg] = useState("");
    const [weightLb, setWeightLb] = useState("");

    const [bloodType, setBloodType] = useState("none");

    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const [discardConfirmVisible, setDiscardConfirmVisible] = useState(false);

    useEffect(() => {
        if (visible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [visible]);

    // Helper functions to safely check numeric inputs
    const parseNum = (val: string) => parseFloat(val) || 0;

    const hasUnsavedChanges =
        name !== "" ||
        icon !== "" ||
        email !== "" ||
        phone !== "" ||
        parseNum(heightCm) > 0 ||
        parseNum(heightFt) > 0 ||
        parseNum(heightIn) > 0 ||
        parseNum(weightKg) > 0 ||
        parseNum(weightLb) > 0;

    // 🌟 Birthday Validation: Must be at least 18 years old
    const isUnder18 = (() => {
        if (!birthday) return true;
        const today = new Date();
        const ageLimitDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        return birthday > ageLimitDate;
    })();

    const isHeightInvalid = isMetric
        ? parseNum(heightCm) <= 0
        : (parseNum(heightFt) <= 0 || parseNum(heightIn) <= 0);

    const isWeightInvalid = isMetric
        ? parseNum(weightKg) <= 0
        : parseNum(weightLb) <= 0;

    const isFormInvalid =
        name.trim() === "" ||
        email.trim() === "" ||
        phone.trim() === "" ||
        !birthday ||
        isUnder18 || // 🌟 Enforced 18+ limit
        isHeightInvalid ||
        isWeightInvalid;

    const handleResetAndClose = () => {
        setName("");
        setIcon("");
        setEmail("");
        setPhone("");
        setBirthday(new Date());
        setHeightCm("");
        setHeightFt("");
        setHeightIn("");
        setWeightKg("");
        setWeightLb("");
        setBloodType("none");
        setDiscardConfirmVisible(false);
        onClose();
    };

    // 🌟 Save Logic directly connecting to Firestore Subcollection
    const handleSave = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Authentication Error", "You must be signed in to add profiles.");
            return;
        }

        setIsLoading(true);
        try {
            const subcollectionRef = collection(db, "users", currentUser.uid, "profiles");

            await addDoc(subcollectionRef, {
                name: name.trim(),
                icon: icon.trim() || null,
                email: email.trim(),
                phone: phone.trim(),
                birthday: birthday.toISOString(),
                bloodType: bloodType,
                height: isMetric ? `${heightCm} cm` : `${heightFt} ft ${heightIn} in`,
                weight: isMetric ? `${weightKg} kg` : `${weightLb} lb`,
                createdAt: new Date().toISOString()
            });

            handleResetAndClose();
            onSuccess();
        } catch (error) {
            console.error("Error saving profile to Firestore: ", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Save Error", "Failed to create this profile. Please try again.");
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
                <Group modifiers={[
                    presentationDetents(["medium", "large"]),
                    (activeScheme == "dark") ? presentationBackground("#1C1C1E") : presentationBackground("#F2F2F6")
                ]}>
                    <Column spacing={16} alignment="center">
                        {/* 🧭 Header Navigation Row */}
                        <Row>
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
                            <Spacer />
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
                            <Text textStyle={{ fontSize: 36, color: currentTheme.text, fontWeight: "bold", textAlign: "center" }}>New Profile</Text>
                            <FieldGroup>
                                <FieldGroup.Section>
                                    <TextInput
                                        placeholder="Name"
                                        editable={!isLoading}
                                        onChangeText={setName}
                                        value={name}
                                        modifiers={[submitLabel("next")]}
                                        textAlign="start"
                                    />
                                    <TextInput
                                        placeholder="Icon URL (optional)"
                                        editable={!isLoading}
                                        onChangeText={setIcon}
                                        value={icon}
                                        modifiers={[submitLabel("next")]}
                                        textAlign="start"
                                    />
                                    <TextInput
                                        placeholder="Email"
                                        editable={!isLoading}
                                        onChangeText={setEmail}
                                        value={email}
                                        modifiers={[submitLabel("next")]}
                                        keyboardType="email-address"
                                        textAlign="start"
                                    />
                                    <TextInput
                                        placeholder="Phone"
                                        editable={!isLoading}
                                        onChangeText={setPhone}
                                        value={phone}
                                        modifiers={[submitLabel("next")]}
                                        keyboardType="phone-pad"
                                        textAlign="start"
                                    />
                                    {Platform.OS == "ios" &&
                                        <>
                                            <DatePicker
                                                title="Birthday"
                                                selection={birthday}
                                                onDateChange={date => {
                                                    setBirthday(date);
                                                }}
                                            />
                                        </>
                                    }
                                </FieldGroup.Section>

                                <FieldGroup.Section>
                                    {isMetric ? (
                                        <Row>
                                            <TextInput
                                                placeholder="Height (cm)"
                                                editable={!isLoading}
                                                onChangeText={setHeightCm}
                                                value={heightCm}
                                                modifiers={[submitLabel("next")]}
                                                keyboardType="number-pad"
                                                textAlign="start"
                                            />
                                            <TextInput
                                                placeholder="Weight (kg)"
                                                editable={!isLoading}
                                                onChangeText={setWeightKg}
                                                value={weightKg}
                                                modifiers={[submitLabel("next")]}
                                                keyboardType="number-pad"
                                                textAlign="start"
                                            />
                                        </Row>
                                    ) : (
                                        <>
                                            <Row>
                                                <TextInput
                                                    placeholder="Height (ft)"
                                                    editable={!isLoading}
                                                    onChangeText={setHeightFt}
                                                    value={heightFt}
                                                    modifiers={[submitLabel("next")]}
                                                    keyboardType="number-pad"
                                                    textAlign="start"
                                                />
                                                <TextInput
                                                    placeholder="Height (in)"
                                                    editable={!isLoading}
                                                    onChangeText={setHeightIn}
                                                    value={heightIn}
                                                    modifiers={[submitLabel("next")]}
                                                    keyboardType="number-pad"
                                                    textAlign="start"
                                                />
                                            </Row>
                                            <TextInput
                                                placeholder="Weight (lb)"
                                                editable={!isLoading}
                                                onChangeText={setWeightLb}
                                                value={weightLb}
                                                modifiers={[submitLabel("next")]}
                                                keyboardType="number-pad"
                                                textAlign="start"
                                            />
                                        </>
                                    )}
                                    {/* 🌟 Added alignment="center" to keep text and Picker on the same line */}
                                    <Row alignment="center">
                                        <Text>Blood Type</Text>
                                        <Spacer />
                                        <Picker
                                            selectedValue={bloodType}
                                            onValueChange={setBloodType}
                                            appearance="menu"
                                        >
                                            {bloodTypes.map((b) => (
                                                <Picker.Item key={b.value} label={b.label} value={b.value} />
                                            ))}
                                        </Picker>
                                    </Row>
                                </FieldGroup.Section>
                            </FieldGroup>
                            {/* 🌟 Inline visual alert when user selects an age under 18 */}
                            {isUnder18 && birthday && (
                                <Text textStyle={{ fontSize: 13, color: "#FF3B30", textAlign: "center" }}>
                                    Profile holder must be at least 18 years old to use SafeSeat.
                                </Text>
                            )}
                        </Column>
                    </Column>
                </Group>
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
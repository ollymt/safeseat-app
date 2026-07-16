// components/AddProfileModal.tsx
import { Themes } from "@/constants/theme";
import { BottomSheet, Button, Column, FieldGroup, Host, Icon, Row, Spacer, Text, TextInput } from "@expo/ui";
import { ConfirmationDialog, Button as SwiftButton, Group } from "@expo/ui/swift-ui";
import { buttonBorderShape, buttonStyle, controlSize, presentationBackground, presentationDetents, submitLabel } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { StyleSheet, useColorScheme, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";

// 🛠️ Firebase Imports
import { auth, db } from "../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

// Standardized list of blood types for validation
const bloodTypes = [
    { label: "A+", value: "a+" },
    { label: "A-", value: "a-" },
    { label: "B+", value: "b+" },
    { label: "B-", value: "b-" },
    { label: "AB+", value: "ab+" },
    { label: "AB-", value: "ab-" },
    { label: "O+", value: "o+" },
    { label: "O-", value: "o-" },
];

// 🌟 Pure math helper: Check if leap year
const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

// 🌟 Manual calendar checker: Validates days in months (February / Leap Year safe)
const isValidDate = (year: number, month: number, day: number): boolean => {
    const currentYear = new Date().getFullYear(); // Only using Date to get current year ceiling
    if (year < 1900 || year > currentYear) return false;
    if (month < 1 || month > 12) return false;

    const daysInMonths = [
        31,
        isLeapYear(year) ? 29 : 28, // Feb leap year toggle
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31
    ];

    const maxDays = daysInMonths[month - 1];
    return day >= 1 && day <= maxDays;
};

export default function AddProfileModal({ visible, onClose, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const [name, setName] = useState("");
    const [icon, setIcon] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // Controlled string states for easy input typing
    const [birthYear, setBirthYear] = useState("");
    const [birthMonth, setBirthMonth] = useState("");
    const [birthDate, setBirthDate] = useState("");

    const [isMetric, setIsMetric] = useState(true);

    const [heightCm, setHeightCm] = useState("");
    const [heightFt, setHeightFt] = useState("");
    const [heightIn, setHeightIn] = useState("");

    const [weightKg, setWeightKg] = useState("");
    const [weightLb, setWeightLb] = useState("");

    const [bloodType, setBloodType] = useState("");

    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const [discardConfirmVisible, setDiscardConfirmVisible] = useState(false);

    useEffect(() => {
        if (visible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const loadUnitPreference = async () => {
                try {
                    const savedPrivacyString = await SecureStore.getItemAsync("user_privacy_prefs");
                    if (savedPrivacyString) {
                        const savedPrivacy = JSON.parse(savedPrivacyString);
                        const targetKey = savedPrivacy.useMetric !== undefined ? savedPrivacy.useMetric : savedPrivacy.isMetric;

                        if (targetKey !== undefined) {
                            const normalizedMetric = targetKey === true || targetKey === "true";
                            setIsMetric(normalizedMetric);
                        }
                    }
                } catch (error) {
                    console.error("Failed to read SecureStore in modal:", error);
                }

                try {
                    const currentUser = auth.currentUser;
                    if (currentUser) {
                        const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");
                        const settingsDocSnap = await getDoc(settingsDocRef);

                        if (settingsDocSnap.exists()) {
                            const settingsData = settingsDocSnap.data();
                            const cloudMetricVal = settingsData.useMetric !== undefined ? settingsData.useMetric : settingsData.isMetric;

                            if (cloudMetricVal !== undefined) {
                                const normalizedMetric = cloudMetricVal === true || cloudMetricVal === "true";
                                setIsMetric(normalizedMetric);

                                const combinedPrivacy = {
                                    useMetric: normalizedMetric,
                                    consent: settingsData.consent ?? true,
                                    emergencyEscalation: settingsData.emergencyEscalation ?? true,
                                };
                                await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify(combinedPrivacy));
                            }
                        }
                    }
                } catch (cloudError) {
                    console.error("Failed to clear cloud validation fallback in modal:", cloudError);
                }
            };

            loadUnitPreference();
        }
    }, [visible]);

    const parseNum = (val: string) => parseFloat(val) || 0;

    const hasUnsavedChanges =
        name !== "" ||
        icon !== "" ||
        email !== "" ||
        phone !== "" ||
        birthMonth !== "" ||
        birthDate !== "" ||
        birthYear !== "" ||
        bloodType !== "" ||
        parseNum(heightCm) > 0 ||
        parseNum(heightFt) > 0 ||
        parseNum(heightIn) > 0 ||
        parseNum(weightKg) > 0 ||
        parseNum(weightLb) > 0;

    const parsedYear = parseInt(birthYear, 10);
    const parsedMonth = parseInt(birthMonth, 10);
    const parsedDate = parseInt(birthDate, 10);

    // 🌟 1. Validate Month, Day, Year bounds (Leap-year safe)
    const isValidDateInput = isValidDate(parsedYear, parsedMonth, parsedDate);

    // 🌟 2. Pure Arithmetic Age Check (No date objects for comparisons)
    const isUnder18 = (() => {
        if (!isValidDateInput) return true;

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // 1-12 range
        const currentDay = today.getDate();

        const age = currentYear - parsedYear;

        if (age > 18) return false;
        if (age < 18) return true;

        // If they are exactly 18, compare birthday month and day to today
        if (parsedMonth < currentMonth) return false;
        if (parsedMonth > currentMonth) return true;

        return parsedDate > currentDay; // If birth day has not occurred yet this month, they are under 18
    })();

    // 🌟 3. Blood Type String Validation
    const normalizedBloodInput = bloodType.trim().toLowerCase();
    const isBloodTypeInvalid = bloodType.trim() !== "" && !bloodTypes.some(t => t.value === normalizedBloodInput);

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
        !isValidDateInput ||
        isUnder18 ||
        isBloodTypeInvalid ||
        bloodType.trim() === "" ||
        isHeightInvalid ||
        isWeightInvalid;

    const handleResetAndClose = () => {
        setName("");
        setIcon("");
        setEmail("");
        setPhone("");
        setBirthYear("");
        setBirthMonth("");
        setBirthDate("");
        setHeightCm("");
        setHeightFt("");
        setHeightIn("");
        setWeightKg("");
        setWeightLb("");
        setBloodType("");
        setDiscardConfirmVisible(false);
        onClose();
    };

    const handleSave = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Authentication Error", "You must be signed in to add profiles.");
            return;
        }

        setIsLoading(true);
        try {
            const subcollectionRef = collection(db, "users", currentUser.uid, "profiles");

            let finalHeightCm = 0;
            let finalWeightKg = 0;

            if (isMetric) {
                finalHeightCm = parseNum(heightCm);
                finalWeightKg = parseNum(weightKg);
            } else {
                const totalInches = (parseNum(heightFt) * 12) + parseNum(heightIn);
                finalHeightCm = Math.round((totalInches * 2.54) * 10) / 10;
                finalWeightKg = Math.round((parseNum(weightLb) * 0.45359237) * 10) / 10;
            }

            // 🌟 Stored strictly as integers & strings
            await addDoc(subcollectionRef, {
                name: name.trim(),
                icon: icon.trim() || null,
                email: email.trim(),
                phone: phone.trim(),

                // Integers
                birthYear: parsedYear,
                birthMonth: parsedMonth,
                birthDate: parsedDate,

                // String
                bloodType: normalizedBloodInput.toUpperCase(),

                heightCm: finalHeightCm,
                weightKg: finalWeightKg,
                displayHeight: isMetric ? `${heightCm} cm` : `${heightFt} ft ${heightIn} in`,
                displayWeight: isMetric ? `${weightKg} kg` : `${weightLb} lb`,
                createdAt: new Date().toISOString()
            });

            handleResetAndClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error saving profile to Firestore: ", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                                        // @ts-ignore
                                        value={name}
                                        modifiers={[submitLabel("next")]}
                                        // @ts-ignore
                                        textAlign="left"
                                    />
                                    <TextInput
                                        placeholder="Icon URL (optional)"
                                        editable={!isLoading}
                                        onChangeText={setIcon}
                                        // @ts-ignore
                                        value={icon}
                                        modifiers={[submitLabel("next")]}
                                        // @ts-ignore
                                        textAlign="left"
                                    />
                                    <TextInput
                                        placeholder="Email"
                                        editable={!isLoading}
                                        onChangeText={setEmail}
                                        // @ts-ignore
                                        value={email}
                                        modifiers={[submitLabel("next")]}
                                        keyboardType="email-address"
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
                                    <Row>
                                        <Text>Birthday</Text>
                                        <Spacer />
                                        <TextInput
                                            placeholder="MM"
                                            editable={!isLoading}
                                            // @ts-ignore
                                            value={birthMonth}
                                            onChangeText={setBirthMonth}
                                            modifiers={[submitLabel("next")]}
                                            keyboardType="number-pad"
                                            textAlign="center"
                                            maxLength={2}
                                        />
                                        <TextInput
                                            placeholder="DD"
                                            editable={!isLoading}
                                            // @ts-ignore
                                            value={birthDate}
                                            onChangeText={setBirthDate}
                                            modifiers={[submitLabel("next")]}
                                            keyboardType="number-pad"
                                            textAlign="center"
                                            maxLength={2}
                                        />
                                        <TextInput
                                            placeholder="YYYY"
                                            editable={!isLoading}
                                            // @ts-ignore
                                            value={birthYear}
                                            onChangeText={setBirthYear}
                                            modifiers={[submitLabel("next")]}
                                            keyboardType="number-pad"
                                            textAlign="center"
                                            maxLength={4}
                                        />
                                    </Row>
                                </FieldGroup.Section>

                                <FieldGroup.Section>
                                    {isMetric ? (
                                        <Row>
                                            <TextInput
                                                placeholder="Height (cm)"
                                                editable={!isLoading}
                                                onChangeText={setHeightCm}
                                                // @ts-ignore
                                                value={heightCm}
                                                modifiers={[submitLabel("next")]}
                                                keyboardType="number-pad"
                                                // @ts-ignore
                                                textAlign="left"
                                            />
                                            <TextInput
                                                placeholder="Weight (kg)"
                                                editable={!isLoading}
                                                onChangeText={setWeightKg}
                                                // @ts-ignore
                                                value={weightKg}
                                                modifiers={[submitLabel("next")]}
                                                keyboardType="number-pad"
                                                // @ts-ignore
                                                textAlign="left"
                                            />
                                        </Row>
                                    ) : (
                                        <>
                                            <Row>
                                                <TextInput
                                                    placeholder="Height (ft)"
                                                    editable={!isLoading}
                                                    onChangeText={setHeightFt}
                                                    // @ts-ignore
                                                    value={heightFt}
                                                    modifiers={[submitLabel("next")]}
                                                    keyboardType="number-pad"
                                                    // @ts-ignore
                                                    textAlign="left"
                                                />
                                                <TextInput
                                                    placeholder="Height (in)"
                                                    editable={!isLoading}
                                                    onChangeText={setHeightIn}
                                                    // @ts-ignore
                                                    value={heightIn}
                                                    modifiers={[submitLabel("next")]}
                                                    keyboardType="number-pad"
                                                    // @ts-ignore
                                                    textAlign="left"
                                                />
                                            </Row>
                                            <TextInput
                                                placeholder="Weight (lb)"
                                                editable={!isLoading}
                                                onChangeText={setWeightLb}
                                                // @ts-ignore
                                                value={weightLb}
                                                modifiers={[submitLabel("next")]}
                                                keyboardType="number-pad"
                                                // @ts-ignore
                                                textAlign="left"
                                            />
                                        </>
                                    )}
                                    <Row alignment="center">
                                        <TextInput
                                            placeholder="Blood Type (e.g. O+)"
                                            editable={!isLoading}
                                            onChangeText={setBloodType}
                                            // @ts-ignore
                                            value={bloodType}
                                            modifiers={[submitLabel("done")]}
                                            // @ts-ignore
                                            textAlign="left"
                                            maxLength={3}
                                        />
                                    </Row>
                                </FieldGroup.Section>
                            </FieldGroup>

                            {/* 🌟 Diagnostic warnings */}
                            {birthYear !== "" && birthMonth !== "" && birthDate !== "" && !isValidDateInput && (
                                <Text textStyle={{ fontSize: 13, color: "#FF3B30", textAlign: "center", marginTop: 8 }}>
                                    Please enter a valid calendar date.
                                </Text>
                            )}
                            {isValidDateInput && isUnder18 && (
                                <Text textStyle={{ fontSize: 13, color: "#FF3B30", textAlign: "center", marginTop: 8 }}>
                                    Profile holder must be at least 18 years old.
                                </Text>
                            )}
                            {isBloodTypeInvalid && (
                                <Text textStyle={{ fontSize: 13, color: "#FF3B30", textAlign: "center", marginTop: 8 }}>
                                    Please enter a valid blood type (A, B, AB, O with +/-).
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
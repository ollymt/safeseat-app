// components/AddProfileModal.tsx
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, useColorScheme, Modal, Text, View, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";

import Button from "./button";
import { Dropdown } from "react-native-element-dropdown"

// 🛠️ Firebase Imports
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import TextInput from "./text-input";

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

    const [allergies, setAllergies] = useState("");

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

                            // Don't flip units if the user has already started entering values
                            const userHasEnteredMeasurements =
                                heightCm !== "" || heightFt !== "" || heightIn !== "" ||
                                weightKg !== "" || weightLb !== "";

                            if (cloudMetricVal !== undefined && !userHasEnteredMeasurements) {
                                setIsMetric(cloudMetricVal === true || cloudMetricVal === "true");
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
        birthMonth !== "" ||
        birthDate !== "" ||
        birthYear !== "" ||
        bloodType !== "" ||
        allergies !== "" ||
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

    const isHeightInvalid = isMetric
        ? parseNum(heightCm) <= 0
        : (parseNum(heightFt) <= 0 || parseNum(heightIn) <= 0);

    const isWeightInvalid = isMetric
        ? parseNum(weightKg) <= 0
        : parseNum(weightLb) <= 0;

    const isFormInvalid =
        name.trim() === "" ||
        !isValidDateInput ||
        isUnder18 ||
        bloodType.trim() === "" ||
        isHeightInvalid ||
        isWeightInvalid;

    const handleResetAndClose = () => {
        setName("");
        setIcon("");
        setBirthYear("");
        setBirthMonth("");
        setBirthDate("");
        setHeightCm("");
        setHeightFt("");
        setHeightIn("");
        setWeightKg("");
        setWeightLb("");
        setBloodType("");
        setAllergies("");
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
            // 🌟 Stored strictly as integers & strings
            await addDoc(subcollectionRef, {
                name: name.trim(),
                icon: icon.trim() || null,

                // Integers
                birthYear: parsedYear,
                birthMonth: parsedMonth,
                birthDate: parsedDate,

                // String
                bloodType: bloodType,
                allergies: allergies.trim() || null, // 👈 Added here

                heightCm: finalHeightCm,
                weightKg: finalWeightKg,
                displayHeight: isMetric ? `${heightCm} cm` : `${heightFt} ft ${heightIn} in`,
                displayWeight: isMetric ? `${weightKg} kg` : `${weightLb} lb`,
                createdAt: new Date().toISOString()
            });

            handleResetAndClose();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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
                                New Profile
                            </Text>
                            <View style={{ width: "100%", gap: spacing.one }}>
                                <TextInput
                                    type="text"
                                    variant="regular"
                                    placeholder="Name"
                                    enabled={!isLoading}
                                    value={name}
                                    onChangeText={setName}
                                />
                                <View style={{ flexDirection: "row", gap: spacing.one, alignItems: "center" }}>
                                    <Text style={{ marginHorizontal: spacing.one, flex: 1, textAlign: "center", fontSize: fontsize.body, color: themes.text, fontFamily: "Body-Medium" }}>Birthday</Text>
                                    <TextInput
                                        type="number"
                                        variant="regular"
                                        placeholder="MM"
                                        enabled={!isLoading}
                                        value={birthMonth}
                                        onChangeText={setBirthMonth}
                                    />
                                    <TextInput
                                        type="number"
                                        variant="regular"
                                        placeholder="DD"
                                        enabled={!isLoading}
                                        value={birthDate}
                                        onChangeText={setBirthDate}
                                    />
                                    <TextInput
                                        type="number"
                                        variant="regular"
                                        placeholder="YYYY"
                                        enabled={!isLoading}
                                        value={birthYear}
                                        onChangeText={setBirthYear}
                                    />
                                </View>
                                {isMetric ? (
                                    <View style={{ flexDirection: "row", gap: spacing.one }}>
                                        <View style={{ flex: 1 }}>
                                            <TextInput
                                                type="number"
                                                variant="regular"
                                                placeholder="Height (cm)"
                                                enabled={!isLoading}
                                                value={heightCm}
                                                onChangeText={setHeightCm}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <TextInput
                                                type="number"
                                                variant="regular"
                                                placeholder="Weight (kg)"
                                                enabled={!isLoading}
                                                value={weightKg}
                                                onChangeText={setWeightKg}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ gap: spacing.one }}>
                                        <View style={{ flexDirection: "row", gap: spacing.one }}>
                                            <View style={{ flex: 1 }}>
                                                <TextInput
                                                    type="number"
                                                    variant="regular"
                                                    placeholder="Height (ft)"
                                                    enabled={!isLoading}
                                                    value={heightFt}
                                                    onChangeText={setHeightFt}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <TextInput
                                                    type="number"
                                                    variant="regular"
                                                    placeholder="Height (in)"
                                                        enabled={!isLoading}
                                                    value={heightIn}
                                                    onChangeText={setHeightIn}
                                                />
                                            </View>
                                        </View>
                                        <TextInput
                                            type="number"
                                            variant="regular"
                                            placeholder="Weight (lb)"
                                                enabled={!isLoading}
                                            value={weightLb}
                                            onChangeText={setWeightLb}
                                        />
                                    </View>
                                )}

                                <Dropdown
                                    mode="default"
                                    data={bloodTypes}
                                    labelField="label"
                                    valueField="value"
                                    selectedTextStyle={{ color: themes.text, fontFamily: "Body-Medium" }}
                                    placeholder="Blood Type"
                                    placeholderStyle={{ color: themes.textInputPlaceholder }}
                                    value={bloodType}
                                    disable={isLoading}
                                    style={[
                                        styles.input
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
                                        fontFamily: "Body-Medium"
                                    }}
                                    itemContainerStyle={{
                                        margin: spacing.none,
                                        marginHorizontal: spacing.none,
                                        padding: spacing.none,
                                        borderBottomWidth: spacing.quarter,
                                        borderColor: themes.secondaryBttn
                                    }}
                                    activeColor={themes.primaryBttn}
                                    maxHeight={spacing.ten * 3}
                                    onChange={(item) => { setBloodType(item.value) }}
                                    autoScroll={false}
                                />

                                <TextInput
                                    type="text"
                                    variant="regular"
                                    placeholder="Allergies (optional)"
                                    enabled={!isLoading}
                                    value={allergies}
                                    onChangeText={setAllergies}
                                />
                            </View>

                            <View style={styles.actionRow}>
                                <Button 
                                    variant={hasUnsavedChanges ? "warn" : "secondary"}
                                    label={hasUnsavedChanges ? "Discard" : "Cancel"}
                                    enabled={!isLoading}
                                    onPress={() => {
                                        if (hasUnsavedChanges) {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                                            Alert.alert("Discard?", "You have unsaved changes. Discard?", [
                                                {
                                                    text: "Cancel",
                                                    style: "cancel"
                                                },
                                                {
                                                    text: "Discard",
                                                    onPress: handleResetAndClose,
                                                    style: "destructive"
                                                }
                                            ])
                                        } else {
                                            handleResetAndClose()
                                        }
                                }} 
                                    style={{ borderRadius: 6 }} />
                                <View style={{ flex: 1 }}>
                                    <Button
                                        variant="primary" 
                                        label="Create" 
                                        onPress={handleSave} 
                                        style={{ borderRadius: 6 }} 
                                        enabled={!isFormInvalid || !isLoading}
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
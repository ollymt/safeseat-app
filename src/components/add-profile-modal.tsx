// components/AddProfileModal.tsx
import React from "react";
import UButton from "@/components/button";
import SkeuoInput from "@/components/skeuo-input";
import { LeatherPanel, PaperCard } from "@/components/skeuo";
import { Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

// 🛠️ Firebase Imports
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

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
        <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {
            if (hasUnsavedChanges) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert("Discard?", "You have unsaved changes. Discard?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Discard", style: "destructive", onPress: () => handleResetAndClose() },
                ]);
            } else {
                onClose();
            }
        }}>
            <View style={styles.backdrop}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%", maxHeight: "92%" }}>
                    <LeatherPanel style={styles.sheet} inset={10}>
                        <View style={styles.headerRow}>
                            <Pressable
                                onPress={() => {
                                    if (hasUnsavedChanges) {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        Alert.alert("Discard?", "You have unsaved changes. Discard?", [
                                            { text: "Cancel", style: "cancel" },
                                            { text: "Discard", style: "destructive", onPress: () => handleResetAndClose() },
                                        ]);
                                    } else {
                                        onClose();
                                    }
                                }}
                                disabled={isLoading}
                                style={styles.chromeCircle}
                            >
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

                        <Text style={styles.title}>New Profile</Text>

                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
                            <PaperCard style={{ padding: 16 }}>
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
                                        label="Icon URL (optional)"
                                        placeholder="Icon URL (optional)"
                                        editable={!isLoading}
                                        onChangeText={setIcon}
                                        value={icon}
                                        returnKeyType="next"
                                    />
                                    <SkeuoInput
                                        label="Email"
                                        placeholder="Email"
                                        editable={!isLoading}
                                        onChangeText={setEmail}
                                        value={email}
                                        keyboardType="email-address"
                                        returnKeyType="next"
                                    />
                                    <SkeuoInput
                                        label="Phone"
                                        placeholder="Phone"
                                        editable={!isLoading}
                                        onChangeText={setPhone}
                                        value={phone}
                                        keyboardType="phone-pad"
                                        returnKeyType="next"
                                    />
                                    <View>
                                        <Text style={styles.fieldLabel}>BIRTHDAY</Text>
                                        <View style={{ flexDirection: "row", gap: 8 }}>
                                            <View style={{ width: 70 }}>
                                                <SkeuoInput
                                                    placeholder="MM"
                                                    editable={!isLoading}
                                                    value={birthMonth}
                                                    onChangeText={setBirthMonth}
                                                    keyboardType="number-pad"
                                                    maxLength={2}
                                                    textAlign="center"
                                                />
                                            </View>
                                            <View style={{ width: 70 }}>
                                                <SkeuoInput
                                                    placeholder="DD"
                                                    editable={!isLoading}
                                                    value={birthDate}
                                                    onChangeText={setBirthDate}
                                                    keyboardType="number-pad"
                                                    maxLength={2}
                                                    textAlign="center"
                                                />
                                            </View>
                                            <View style={{ width: 90 }}>
                                                <SkeuoInput
                                                    placeholder="YYYY"
                                                    editable={!isLoading}
                                                    value={birthYear}
                                                    onChangeText={setBirthYear}
                                                    keyboardType="number-pad"
                                                    maxLength={4}
                                                    textAlign="center"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </PaperCard>

                            <PaperCard style={{ padding: 16 }}>
                                <View style={{ gap: 14 }}>
                                    {isMetric ? (
                                        <View style={{ flexDirection: "row", gap: 10 }}>
                                            <View style={{ flex: 1 }}>
                                                <SkeuoInput
                                                    label="Height (cm)"
                                                    placeholder="Height (cm)"
                                                    editable={!isLoading}
                                                    onChangeText={setHeightCm}
                                                    value={heightCm}
                                                    keyboardType="number-pad"
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <SkeuoInput
                                                    label="Weight (kg)"
                                                    placeholder="Weight (kg)"
                                                    editable={!isLoading}
                                                    onChangeText={setWeightKg}
                                                    value={weightKg}
                                                    keyboardType="number-pad"
                                                />
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            <View style={{ flexDirection: "row", gap: 10 }}>
                                                <View style={{ flex: 1 }}>
                                                    <SkeuoInput
                                                        label="Height (ft)"
                                                        placeholder="Height (ft)"
                                                        editable={!isLoading}
                                                        onChangeText={setHeightFt}
                                                        value={heightFt}
                                                        keyboardType="number-pad"
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <SkeuoInput
                                                        label="Height (in)"
                                                        placeholder="Height (in)"
                                                        editable={!isLoading}
                                                        onChangeText={setHeightIn}
                                                        value={heightIn}
                                                        keyboardType="number-pad"
                                                    />
                                                </View>
                                            </View>
                                            <SkeuoInput
                                                label="Weight (lb)"
                                                placeholder="Weight (lb)"
                                                editable={!isLoading}
                                                onChangeText={setWeightLb}
                                                value={weightLb}
                                                keyboardType="number-pad"
                                            />
                                        </>
                                    )}
                                    <SkeuoInput
                                        label="Blood Type (e.g. O+)"
                                        placeholder="Blood Type (e.g. O+)"
                                        editable={!isLoading}
                                        onChangeText={setBloodType}
                                        value={bloodType}
                                        maxLength={3}
                                        returnKeyType="done"
                                    />
                                </View>
                            </PaperCard>

                            {birthYear !== "" && birthMonth !== "" && birthDate !== "" && !isValidDateInput && (
                                <Text style={styles.warningText}>Please enter a valid calendar date.</Text>
                            )}
                            {isValidDateInput && isUnder18 && (
                                <Text style={styles.warningText}>Profile holder must be at least 18 years old.</Text>
                            )}
                            {isBloodTypeInvalid && (
                                <Text style={styles.warningText}>Please enter a valid blood type (A, B, AB, O with +/-).</Text>
                            )}

                            <UButton
                                label={isLoading ? "Saving..." : "Save Profile"}
                                variant="primary"
                                fullWidth
                                enabled={!isLoading && !isFormInvalid}
                                onPress={handleSave}
                            />
                        </ScrollView>
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
        paddingBottom: 30,
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
        marginBottom: 14,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.8,
        marginLeft: 4,
        marginBottom: 6,
        color: "#7C5A38",
    },
    warningText: {
        fontSize: 13,
        color: "#E36A54",
        textAlign: "center",
        fontWeight: "600",
    },
});
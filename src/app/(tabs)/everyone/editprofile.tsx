import { Themes } from "@/constants/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Column, FieldGroup, Host, TextInput } from "@expo/ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import { useCallback, useState } from "react";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";


import PasswordVerifyModal from "@/components/PasswordVerifyModal";
import { isSessionValid } from "@/utils/securitySession";

import { submitLabel } from "@expo/ui/swift-ui/modifiers";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

export default function EditProfile() {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const router = useRouter();

    // 🌟 Which profile are we editing? Absent = the owner's own account.
    const { profileId } = useLocalSearchParams<{ profileId?: string }>();
    const isSubProfile = !!profileId;

    // 1. Core Account States
    const [userName, setUserName] = useState<string>("Guest");
    const [userEmail, setUserEmail] = useState<string>("Not Set");
    const [userPhone, setUserPhone] = useState<string>("Not Set");

    // 2. Health Metrics States
    const [birthday, setBirthday] = useState<string>("Jan 01, 2000");
    const [height, setHeight] = useState<string>("Not Set");
    const [weight, setWeight] = useState<string>("Not Set");
    const [bloodType, setBloodType] = useState<string>("Not Set");
    const [allergies, setAllergies] = useState<string>("None Stored");

    // 🌟 Missing state that the JSX below relies on — was undefined before
    const [consent, setConsent] = useState<boolean>(true);
    const [emergencyEscalation, setEmergencyEscalation] = useState<boolean>(true);

    const [isMetric, setIsMetric] = useState<boolean>(false);

    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [bloodPickerVisible, setBloodPickerVisible] = useState(false);

    // Cache key varies depending on whether we're editing a sub-profile or the owner
    const healthCacheKey = isSubProfile ? `profile_${profileId}` : "user_health_profile";

    const loadAllUserData = useCallback(async () => {
        try {
            // 1. LOAD INSTANTLY FROM LOCAL STORAGE CACHE
            const savedHealthDataString = await SecureStore.getItemAsync(healthCacheKey);
            if (savedHealthDataString) {
                const savedHealth = JSON.parse(savedHealthDataString);
                if (savedHealth.name) setUserName(savedHealth.name);
                if (savedHealth.email) setUserEmail(savedHealth.email);
                if (savedHealth.phone) setUserPhone(savedHealth.phone);
                if (savedHealth.birthday) setBirthday(savedHealth.birthday);
                if (savedHealth.height) setHeight(savedHealth.height);
                if (savedHealth.weight) setWeight(savedHealth.weight);
                if (savedHealth.bloodType) setBloodType(savedHealth.bloodType);
                if (savedHealth.allergies) setAllergies(savedHealth.allergies);
            }

            // Privacy prefs (useMetric/consent/emergencyEscalation) always live at the account level,
            // regardless of which profile is being viewed
            const savedPrivacyString = await SecureStore.getItemAsync("user_privacy_prefs");
            if (savedPrivacyString) {
                const savedPrivacy = JSON.parse(savedPrivacyString);
                if (savedPrivacy.useMetric !== undefined) setIsMetric(savedPrivacy.useMetric);
                if (savedPrivacy.consent !== undefined) setConsent(savedPrivacy.consent);
                if (savedPrivacy.emergencyEscalation !== undefined) setEmergencyEscalation(savedPrivacy.emergencyEscalation);
            }

            // 2. FETCH FRESH BACKGROUND DATA FROM FIREBASE
            const currentUser = auth.currentUser;
            if (currentUser) {
                // 🌟 Point at the sub-profile doc or the main user doc depending on context
                const profileDocRef = isSubProfile
                    ? doc(db, "users", currentUser.uid, "profiles", profileId as string)
                    : doc(db, "users", currentUser.uid);
                const profileDocSnap = await getDoc(profileDocRef);

                // Settings/preferences (privacy + metric) still come from the owner's own subcollection
                const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");
                const settingsDocSnap = await getDoc(settingsDocRef);

                let cloudData: any = {};
                if (profileDocSnap.exists()) {
                    cloudData = profileDocSnap.data();
                    if (cloudData.name) setUserName(cloudData.name);
                    if (cloudData.email) setUserEmail(cloudData.email);
                    if (cloudData.phone) setUserPhone(cloudData.phone);
                    if (cloudData.birthday) setBirthday(cloudData.birthday);
                    if (cloudData.height) setHeight(cloudData.height);
                    if (cloudData.weight) setWeight(cloudData.weight);
                    if (cloudData.bloodType) setBloodType(cloudData.bloodType);
                    if (cloudData.allergies) setAllergies(cloudData.allergies);

                    const combinedProfile = {
                        name: cloudData.name || "",
                        email: cloudData.email || "",
                        phone: cloudData.phone || "",
                        birthday: cloudData.birthday || "",
                        height: cloudData.height || "",
                        weight: cloudData.weight || "",
                        bloodType: cloudData.bloodType || "",
                        allergies: cloudData.allergies || "",
                    };
                    await SecureStore.setItemAsync(healthCacheKey, JSON.stringify(combinedProfile));
                }

                if (settingsDocSnap.exists()) {
                    const settingsData = settingsDocSnap.data();
                    if (settingsData.useMetric !== undefined) setIsMetric(settingsData.useMetric);
                    if (settingsData.consent !== undefined) setConsent(settingsData.consent);
                    if (settingsData.emergencyEscalation !== undefined) setEmergencyEscalation(settingsData.emergencyEscalation);

                    const combinedPrivacy = {
                        useMetric: settingsData.useMetric ?? true,
                        consent: settingsData.consent ?? true,
                        emergencyEscalation: settingsData.emergencyEscalation ?? true,
                    };
                    await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify(combinedPrivacy));
                }
            }
        } catch (error) {
            console.error("Failed to load user profile data:", error);
        }
    }, [healthCacheKey, isSubProfile, profileId]);

    useFocusEffect(
        useCallback(() => {
            loadAllUserData();
        }, [loadAllUserData])
    );

    const saveHealthField = async (key: string, val: string) => {
        try {
            const currentObjRaw = await SecureStore.getItemAsync(healthCacheKey);
            const currentObj = currentObjRaw ? JSON.parse(currentObjRaw) : {};
            currentObj[key] = val;
            await SecureStore.setItemAsync(healthCacheKey, JSON.stringify(currentObj));

            const currentUser = auth.currentUser;
            if (currentUser) {
                // 🌟 Write to the correct doc: sub-profile or main user doc
                const profileDocRef = isSubProfile
                    ? doc(db, "users", currentUser.uid, "profiles", profileId as string)
                    : doc(db, "users", currentUser.uid);
                await updateDoc(profileDocRef, { [key]: val });
            }
        } catch (error) {
            console.error("Failed to save health data:", error);
        }
    };

    const savePrivacyField = async (key: string, val: boolean) => {
        try {
            const currentObjRaw = await SecureStore.getItemAsync("user_privacy_prefs");
            const currentObj = currentObjRaw ? JSON.parse(currentObjRaw) : {};
            currentObj[key] = val;
            await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify(currentObj));

            const currentUser = auth.currentUser;
            if (currentUser) {
                // Privacy settings always belong to the owner account, not a sub-profile
                const settingsDocRef = doc(db, "users", currentUser.uid, "settings", "preferences");
                await setDoc(settingsDocRef, { [key]: val }, { merge: true });
            }
        } catch (error) {
            console.error("Failed to save privacy preference:", error);
        }
    };

    const getDisplayHeight = () => {
        if (height === undefined || height === null || height === "Not Set") return "Not Set";
        const cmValue = parseFloat(String(height).replace(/[^0-9.]/g, ""));
        if (isNaN(cmValue)) return String(height);

        if (isMetric) {
            return `${cmValue} cm`;
        } else {
            const totalInches = cmValue / 2.54;
            const feet = Math.floor(totalInches / 12);
            const inches = Math.round(totalInches % 12);
            return `${feet}' ${inches}"`;
        }
    };

    const getDisplayWeight = () => {
        if (weight === undefined || weight === null || weight === "Not Set") return "Not Set";
        const kgValue = parseFloat(String(weight).replace(/[^0-9.]/g, ""));
        if (isNaN(kgValue)) return String(weight);

        if (isMetric) {
            return `${kgValue} kg`;
        } else {
            const lbsValue = Math.round(kgValue * 2.20462);
            return `${lbsValue} lbs`;
        }
    };

    const handleMetricToggle = async (newVal: boolean) => {
        setIsMetric(newVal);
        await savePrivacyField("useMetric", newVal);
    };

    const executeSecureAction = async (action: () => void) => {
        const authenticated = await isSessionValid();
        if (authenticated) {
            action();
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setPendingAction(() => () => action());
            setAuthModalVisible(true);
        }
    };

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: currentTheme.background }}
            edges={["left", "right"]}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={true} bounces={true}>
                <View style={[styles.container, { marginTop: -30 }]}>
                    <Text style={[styles.pageHeader, { color: currentTheme.text }]}>Edit {userName.split(" ")[0]}</Text>
                    <View style={{ gap: 20, marginTop: 10, width: "100%", height: "auto", borderWidth: 3, borderColor: "#000" }}>
                        <Host>
                            <Column
                                spacing={16}
                                style={{ height: "100%" }}
                            >
                                <TextInput
                                    placeholder="Name"
                                    value={userName}
                                    onChangeText={setUserName}
                                    modifiers={[submitLabel("next")]}
                                    textAlign="left"
                                />
                                <FieldGroup>
                                    <FieldGroup.Section title="Basic Information">
                                        <TextInput
                                            placeholder="Name"
                                            value={userName}
                                            onChangeText={setUserName}
                                            modifiers={[submitLabel("next")]}
                                            textAlign="left"
                                        />
                                    </FieldGroup.Section>
                                </FieldGroup>
                            </Column>
                        </Host>
                    </View>

                    <PasswordVerifyModal
                        visible={authModalVisible}
                        onClose={() => {
                            setAuthModalVisible(false);
                            setPendingAction(null);
                        }}
                        onSuccess={() => {
                            setAuthModalVisible(false);
                            if (pendingAction) {
                                pendingAction();
                                setPendingAction(null);
                            }
                        }}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, width: "100%", padding: 20, height: "100%" },
    pageHeader: { fontSize: 40, fontFamily: "Logo-Font" },
    infoLabel: { fontFamily: "Condensed-Bold", fontSize: 14, margin: 0, marginBottom: 8 },
    caption: { fontFeatureSettings: "Body-Medium", opacity: 0.8, fontSize: 13 },
});
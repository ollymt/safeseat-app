// components/AssignSeatModal.tsx
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Alert, Modal, StyleSheet, View, Text, ScrollView, FlatList, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import Button from "./button";

// 🛠️ Firebase Imports
import { auth, db } from "../firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import ProfileList from "./profile-list";

export type Profile = {
    id: string;
    name: string;
    icon?: string;
    isAccountOwner?: boolean;
    weight?: string;
    weightKg?: number;
};

type Props = {
    visible: boolean;
    seat: number;
    onClose: () => void;
    onSuccess?: (seat: number, profile: Profile | null) => void;
};

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";

export default function AssignSeatModal({ visible, onClose, onSuccess, seat }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingProfiles, setIsFetchingProfiles] = useState(false);

    const [role, setRole] = useState("");
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [isCurrentlyAssigned, setIsCurrentlyAssigned] = useState(false);

    // Resolve seat number -> role label
    useEffect(() => {
        if (!visible) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        switch (seat) {
            case 1:
                setRole("Driver");
                break;
            case 2:
                setRole("Passenger");
                break;
            case 3:
                setRole("L Backseat");
                break;
            case 4:
                setRole("C Backseat");
                break;
            case 5:
                setRole("R Backseat");
                break;
            default:
                setRole("MISSINGNO");
                break;
        }
    }, [visible, seat]);

    // Fetch user account + profiles + filter already-assigned profiles
    useEffect(() => {
        if (!visible) return;

        const currentUser = auth.currentUser;
        if (!currentUser) return;

        let cancelled = false;

        (async () => {
            setIsFetchingProfiles(true);
            try {
                const combinedList: Profile[] = [];

                // 1. Resolve Account Owner details
                let primaryName = currentUser.displayName;
                let primaryIcon = currentUser.photoURL ?? undefined;

                const localHealthRaw = await SecureStore.getItemAsync("user_health_profile");
                if (localHealthRaw) {
                    const localHealth = JSON.parse(localHealthRaw);
                    if (localHealth.name) primaryName = localHealth.name;
                }

                const userDocRef = doc(db, "users", currentUser.uid);
                let primaryWeight: string | undefined;
                let primaryWeightKg: number | undefined;

                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.name) primaryName = userData.name;
                    if (userData.icon || userData.photoURL) {
                        primaryIcon = userData.icon ?? userData.photoURL;
                    }
                    if (userData.weightKg !== undefined) primaryWeightKg = userData.weightKg;
                    if (userData.weight !== undefined) primaryWeight = userData.weight;
                }

                const accountOwnerProfile: Profile = {
                    id: currentUser.uid,
                    name: `${primaryName ?? "Me"} (Me)`,
                    icon: primaryIcon,
                    isAccountOwner: true,
                    weight: primaryWeight,
                    weightKg: primaryWeightKg,
                };
                combinedList.push(accountOwnerProfile);

                // 2. Fetch sub-profiles subcollection
                const profilesRef = collection(db, "users", currentUser.uid, "profiles");
                const snapshot = await getDocs(profilesRef);
                const subProfiles: Profile[] = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data();
                    return {
                        id: docSnap.id,
                        name: data.name ?? "Unnamed Profile",
                        icon: data.icon ?? data.photoURL,
                        weight: data.weight,
                        weightKg: data.weightKg,
                    };
                });

                combinedList.push(...subProfiles);

                // 3. Get existing seat assignments & filter out already-assigned profiles
                const raw = await AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY);
                const assignments: Record<number, Profile> = raw ? JSON.parse(raw) : {};

                const assignedSeatProfile = assignments[seat];
                const currentlyAssignedProfileId = assignedSeatProfile?.id ?? null;

                setIsCurrentlyAssigned(!!assignedSeatProfile);
                setSelectedProfileId(currentlyAssignedProfileId);

                // Collect IDs assigned to OTHER seats (so we can hide them)
                const assignedOtherIds = new Set<string>();
                Object.entries(assignments).forEach(([seatNumStr, prof]) => {
                    if (parseInt(seatNumStr, 10) !== seat && prof?.id) {
                        assignedOtherIds.add(prof.id);
                    }
                });

                // Filter out profiles assigned elsewhere
                const availableProfiles = combinedList.filter(
                    (p) => !assignedOtherIds.has(p.id)
                );

                if (cancelled) return;
                setProfiles(availableProfiles);
            } catch (error) {
                console.error("Error fetching profiles/user: ", error);
                if (!cancelled) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert("Load Error", "Failed to load profiles. Please try again.");
                }
            } finally {
                if (!cancelled) setIsFetchingProfiles(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [visible, seat]);

    const handleResetAndClose = () => {
        setSelectedProfileId(null);
        onClose();
    };

    const handleSelectProfile = (profileId: string) => {
        Haptics.selectionAsync();
        setSelectedProfileId(profileId);
    };

    const handleSave = async () => {
        if (!selectedProfileId) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert("No Profile Selected", "Please select a profile to assign to this seat.");
            return;
        }

        const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
        if (!selectedProfile) return;

        setIsLoading(true);
        try {
            const raw = await AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY);
            const assignments: Record<number, Profile> = raw ? JSON.parse(raw) : {};
            assignments[seat] = selectedProfile;
            await AsyncStorage.setItem(SEAT_ASSIGNMENTS_KEY, JSON.stringify(assignments));

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (onSuccess) onSuccess(seat, selectedProfile);
            handleResetAndClose();
        } catch (error) {
            console.error("Error saving seat assignment: ", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Save Error", "Failed to assign this seat. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnassign = async () => {
        setIsLoading(true);
        try {
            const raw = await AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY);
            const assignments: Record<number, Profile> = raw ? JSON.parse(raw) : {};
            delete assignments[seat];
            await AsyncStorage.setItem(SEAT_ASSIGNMENTS_KEY, JSON.stringify(assignments));

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (onSuccess) onSuccess(seat, null);
            handleResetAndClose();
        } catch (error) {
            console.error("Error unassigning seat: ", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "Failed to unassign this seat. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const numToRole = (role: number) => {
        switch (role) {
            case 1:
                return "Driver"
                break
            case 2:
                return "Passenger"
                break
            case 3:
                return "L Backseat"
                break
            case 4:
                return "C Backseat"
                break
            case 5:
                return "R Backseat"
                break
            default:
                return "MISSINGNO"
                break
        }
    }

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            {/* Full-screen backdrop wrapper that centers children */}
            <View style={styles.backdrop}>
                <View style={styles.container}>
                    <Text style={styles.header}>
                        Assign {numToRole(seat)}
                    </Text>
                    <View style={{ width: "100%" }}>
                        {isFetchingProfiles ? (
                            <ActivityIndicator size="large" color={themes.text} style={{ padding: spacing.two }} />
                        ) : (
                            <View style={{ maxHeight: 320, width: "100%" }}>
                                <FlatList
                                    data={profiles}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item, index }) => (
                                        <ProfileList
                                            name={item.name}
                                            pfp={item.icon || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNyV3QnQOwXP124try4wkWE0xXqxT6KZitbq4TerzfLkMDDY-v1CXzTGw&s=10"}
                                            checked={item.id === selectedProfileId}
                                            onPress={() => handleSelectProfile(item.id)}
                                            isLast={!(index === profiles.length - 1)}
                                        />
                                    )}
                                    style={{ width: "100%" }}
                                    ListEmptyComponent={
                                        <Text style={{ color: themes.text }}>No available profiles found.</Text>
                                    }
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.actionRow}>
                        {isCurrentlyAssigned &&
                            <Button variant="warn" label="Remove" onPress={handleUnassign} enabled={!isFetchingProfiles} style={{ borderRadius: 6 }} />
                        }
                        <Button variant="secondary" label="Cancel" onPress={onClose} enabled={!isFetchingProfiles} style={{ borderRadius: 6 }} />
                        <View style={{ flex: 1 }}>
                            <Button variant="primary" label="Assign" onPress={handleSave} enabled={!isFetchingProfiles && selectedProfileId} style={{ borderRadius: 6 }} />
                        </View>
                    </View>

                </View>
            </View>
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
    }
});
// components/AssignSeatModal.tsx
import { Themes } from "@/constants/theme";
import { BottomSheet, Button, Column, Host, Icon, List, Row, Spacer, Text } from "@expo/ui";
import { buttonBorderShape, buttonStyle, controlSize } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { useColorScheme, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// 🛠️ Firebase Imports
import { auth, db } from "../firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

export type Profile = {
    id: string;
    name: string;
    icon?: string; // 👈 Updated to use 'icon'
    isAccountOwner?: boolean;
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

    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

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
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.name) primaryName = userData.name;
                    // Read 'icon' field first, fallback to 'photoURL'
                    if (userData.icon || userData.photoURL) {
                        primaryIcon = userData.icon ?? userData.photoURL;
                    }
                }

                const accountOwnerProfile: Profile = {
                    id: currentUser.uid,
                    name: `${primaryName ?? "Me"} (Me)`,
                    icon: primaryIcon,
                    isAccountOwner: true,
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
                        icon: data.icon ?? data.photoURL, // 👈 Reads 'icon' from Firestore
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

    return (
        <Host matchContents>
            <BottomSheet
                isPresented={visible}
                onDismiss={onClose}
                showDragIndicator={false}
                snapPoints={["half"]}
            >
                <Column spacing={16} alignment="center">
                    {/* Header Controls */}
                    <Row>
                        <Button
                            variant="outlined"
                            onPress={onClose}
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

                        <Spacer flexible />

                        <Button
                            onPress={handleSave}
                            variant="filled"
                            modifiers={[
                                buttonStyle("borderedProminent"),
                                controlSize("large"),
                                buttonBorderShape("circle"),
                            ]}
                            disabled={isLoading || !selectedProfileId}
                        >
                            <Icon
                                name={Icon.select({
                                    ios: "checkmark",
                                    android: import("@expo/material-symbols/check.xml"),
                                })}
                            />
                        </Button>
                    </Row>

                    <Spacer />

                    {/* Content Section */}
                    <Column spacing={12} alignment="center">
                        {/* @ts-ignore */}
                        <Text textStyle={{ fontSize: 32, color: currentTheme.text, fontWeight: "bold", textAlign: "center" }}>
                            Assign {role}
                        </Text>

                        {isFetchingProfiles ? (
                            /* @ts-ignore */
                            <Text textStyle={{ fontSize: 16, color: currentTheme.textSecondary, textAlign: "center" }}>
                                Loading Profiles...
                            </Text>
                        ) : profiles.length === 0 ? (
                            /* @ts-ignore */
                            <Text textStyle={{ fontSize: 16, color: currentTheme.textSecondary, textAlign: "center" }}>
                                All available profiles have been assigned.
                            </Text>
                        ) : (
                            <List>
                                {profiles.map((profile) => {
                                    const isSelected = profile.id === selectedProfileId;
                                    return (
                                        <Button
                                            key={profile.id}
                                            onPress={() => handleSelectProfile(profile.id)}
                                            // @ts-ignore
                                            variant={"plain"}
                                        >
                                            <Row spacing={12} alignment="center">
                                                {/* @ts-ignore */}
                                                <Text textStyle={{ fontSize: 18, color: currentTheme.text }}>
                                                    {profile.name}
                                                </Text>

                                                <Spacer flexible />

                                                {isSelected && (
                                                    <Icon
                                                        name={Icon.select({
                                                            ios: "checkmark",
                                                            android: import("@expo/material-symbols/check.xml"),
                                                        })}
                                                    />
                                                )}
                                            </Row>
                                        </Button>
                                    );
                                })}
                            </List>
                        )}

                        {/* Unassign Button (Shown only when seat is currently assigned) */}
                        {isCurrentlyAssigned && !isFetchingProfiles && (
                            <Button
                                variant="outlined"
                                onPress={handleUnassign}
                                disabled={isLoading}
                                modifiers={[
                                    buttonStyle("bordered"),
                                    controlSize("regular"),
                                ]}
                            >
                                {/* @ts-ignore */}
                                <Text textStyle={{ color: "#FF3B30", fontWeight: "600" }}>
                                    Unassign Seat
                                </Text>
                            </Button>
                        )}
                    </Column>
                    <Spacer flexible />
                </Column>
            </BottomSheet>
        </Host>
    );
}
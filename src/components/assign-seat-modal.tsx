import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { auth, db } from "../firebase";
import Button from "./button";
import ProfileList from "./profile-list";

export type Profile = {
  id: string;
  name: string;
  icon?: string;
  isAccountOwner?: boolean;
  isGuest?: boolean;
  sessionOnly?: boolean;
};

type Props = {
  visible: boolean;
  seat: number;
  onClose: () => void;
  onSuccess?: (seat: number, profile: Profile | null) => void;
};

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";

const ROLE_LABELS: Record<number, string> = {
  1: "Driver",
  2: "Front Passenger",
  3: "Left Rear",
  4: "Center Rear",
  5: "Right Rear",
};

export default function AssignSeatModal({ visible, onClose, onSuccess, seat }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfiles, setIsFetchingProfiles] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isCurrentlyAssigned, setIsCurrentlyAssigned] = useState(false);

  useEffect(() => {
    if (!visible) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    let cancelled = false;

    void (async () => {
      setIsFetchingProfiles(true);
      try {
        const combinedList: Profile[] = [];
        let primaryName = currentUser.displayName;
        let primaryIcon = currentUser.photoURL ?? undefined;

        const localHealthRaw = await SecureStore.getItemAsync("user_health_profile");
        if (localHealthRaw) {
          const localHealth = JSON.parse(localHealthRaw);
          if (localHealth.name) primaryName = localHealth.name;
          if (localHealth.icon || localHealth.pfp) {
            primaryIcon = localHealth.icon ?? localHealth.pfp;
          }
        }

        const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.name) primaryName = userData.name;
          if (userData.icon || userData.photoURL) {
            primaryIcon = userData.icon ?? userData.photoURL;
          }
        }

        combinedList.push({
          id: currentUser.uid,
          name: `${primaryName ?? "Me"} (Me)`,
          icon: primaryIcon,
          isAccountOwner: true,
        });

        const profilesRef = collection(db, "users", currentUser.uid, "profiles");
        const snapshot = await getDocs(profilesRef);
        combinedList.push(
          ...snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.name ?? "Unnamed Profile",
              icon: data.icon ?? data.photoURL,
            } satisfies Profile;
          }),
        );

        const raw = await AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY);
        const assignments: Record<number, Profile> = raw ? JSON.parse(raw) : {};
        const assignedSeatProfile = assignments[seat];

        setIsCurrentlyAssigned(Boolean(assignedSeatProfile));
        setSelectedProfileId(
          assignedSeatProfile && !assignedSeatProfile.sessionOnly
            ? assignedSeatProfile.id
            : null,
        );

        const assignedOtherIds = new Set<string>();
        Object.entries(assignments).forEach(([seatNumStr, profile]) => {
          if (
            Number(seatNumStr) !== seat &&
            profile?.id &&
            !profile.sessionOnly
          ) {
            assignedOtherIds.add(profile.id);
          }
        });

        if (cancelled) return;
        setProfiles(combinedList.filter((profile) => !assignedOtherIds.has(profile.id)));
      } catch (error) {
        console.error("Error fetching profiles/user:", error);
        if (!cancelled) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Load Error", "Failed to load saved profiles. Please try again.");
        }
      } finally {
        if (!cancelled) setIsFetchingProfiles(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, seat]);

  const resetAndClose = () => {
    setSelectedProfileId(null);
    onClose();
  };

  const persistAssignment = async (profile: Profile) => {
    const raw = await AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY);
    const assignments: Record<number, Profile> = raw ? JSON.parse(raw) : {};
    assignments[seat] = profile;
    await AsyncStorage.setItem(SEAT_ASSIGNMENTS_KEY, JSON.stringify(assignments));

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSuccess?.(seat, profile);
    resetAndClose();
  };

  const handleSave = async () => {
    if (!selectedProfileId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("No profile selected", "Choose a saved profile, or use Guest for a passenger seat.");
      return;
    }

    const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
    if (!selectedProfile) return;

    setIsLoading(true);
    try {
      await persistAssignment(selectedProfile);
    } catch (error) {
      console.error("Error saving seat assignment:", error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Save Error", "Failed to assign this seat. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    if (seat === 1) return;

    setIsLoading(true);
    try {
      await persistAssignment({
        id: `guest-seat-${seat}`,
        name: "Guest",
        isGuest: true,
        sessionOnly: true,
      });
    } catch (error) {
      console.error("Error assigning guest:", error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Save Error", "Could not create the session-only guest.");
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

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.(seat, null);
      resetAndClose();
    } catch (error) {
      console.error("Error unassigning seat:", error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to unassign this seat. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const role = ROLE_LABELS[seat] ?? `Seat ${seat}`;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>ASSIGN SEAT</Text>
            <Text style={styles.header}>Who is in the {role} seat?</Text>
            <Text style={styles.subhead}>Choose a person below. This person will appear on the {role} seat map.</Text>
          </View>

          {seat !== 1 && (
            <Pressable
              disabled={isLoading || isFetchingProfiles}
              onPress={() => void handleGuest()}
              style={({ pressed }) => [styles.guestCard, pressed && styles.pressed]}
            >
              <View style={styles.guestIcon}>
                <Text style={styles.guestIconText}>G</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guestTitle}>Guest passenger</Text>
                <Text style={styles.guestText}>Use for this trip only. Nothing is saved after the session.</Text>
              </View>
              <Text style={styles.guestAction}>SELECT</Text>
            </Pressable>
          )}

          <View style={styles.savedHeaderRow}>
            <Text style={styles.savedHeader}>CHOOSE A PERSON</Text>
            <Text style={styles.savedCount}>{profiles.length}</Text>
          </View>

          <View style={styles.listWrap}>
            {isFetchingProfiles ? (
              <ActivityIndicator size="large" color={themes.primaryBttn} style={styles.loader} />
            ) : (
              <FlatList
                data={profiles}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <ProfileList
                    name={item.name}
                    pfp={item.icon}
                    checked={item.id === selectedProfileId}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedProfileId(item.id);
                    }}
                    isLast={index !== profiles.length - 1}
                  />
                )}
                style={{ width: "100%" }}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>No saved profiles available</Text>
                    <Text style={styles.emptyText}>Create one from Profiles, or use Guest for a passenger seat.</Text>
                  </View>
                }
              />
            )}
          </View>

          <View style={styles.actionRow}>
            {isCurrentlyAssigned && (
              <Button
                variant="tertiary"
                label="Remove"
                onPress={() => void handleUnassign()}
                enabled={!isFetchingProfiles && !isLoading}
              />
            )}
            <Button
              variant="secondary"
              label="Cancel"
              onPress={resetAndClose}
              enabled={!isLoading}
            />
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                label={`Assign to ${role}`}
                onPress={() => void handleSave()}
                enabled={!isFetchingProfiles && !isLoading && Boolean(selectedProfileId)}
                fullWidth
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 15, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.two,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "88%",
    backgroundColor: themes.backgroundElevated,
    borderWidth: 1,
    borderColor: themes.divider,
    padding: spacing.two,
    borderRadius: 24,
    gap: spacing.two,
  },
  headerBlock: {
    gap: spacing.half,
  },
  eyebrow: {
    color: themes.primaryBttn,
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: "Body-Bold",
  },
  header: {
    color: themes.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Heading-Font",
  },
  subhead: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 18,
    fontFamily: "Body-Regular",
  },
  guestCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
    padding: spacing.one + 4,
    borderRadius: 17,
    backgroundColor: themes.primarySoft,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
  },
  guestIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themes.primaryBttn,
  },
  guestIconText: {
    color: themes.primaryBttnText,
    fontSize: 14,
    fontFamily: "Body-Bold",
  },
  guestTitle: {
    color: themes.text,
    fontSize: 14,
    fontFamily: "Body-Bold",
  },
  guestText: {
    color: themes.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    fontFamily: "Body-Regular",
  },
  guestAction: {
    color: themes.primaryBttn,
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: "Body-Bold",
  },
  pressed: {
    opacity: 0.75,
  },
  savedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savedHeader: {
    color: themes.textMuted,
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: "Body-Bold",
  },
  savedCount: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    fontFamily: "Body-Medium",
  },
  listWrap: {
    maxHeight: 260,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: themes.divider,
  },
  loader: {
    padding: spacing.three,
  },
  emptyWrap: {
    padding: spacing.three,
    alignItems: "center",
  },
  emptyTitle: {
    color: themes.text,
    fontSize: 14,
    fontFamily: "Body-Bold",
  },
  emptyText: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 17,
    textAlign: "center",
    marginTop: spacing.half,
    fontFamily: "Body-Regular",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.half,
  },
});

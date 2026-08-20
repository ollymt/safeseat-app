import UButton from "@/components/button";
import { LeatherPanel, PaperCard } from "@/components/skeuo";
import { Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

// 🛠️ Firebase Imports
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

export type Profile = {
  id: string;
  name: string;
  icon?: string;
  isAccountOwner?: boolean;
};

type Props = {
  visible: boolean;
  seat: number;
  onClose: () => void;
  onSuccess?: (seat: number, profile: Profile | null) => void;
};

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";

export default function AssignSeatModal({
  visible,
  onClose,
  onSuccess,
  seat,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfiles, setIsFetchingProfiles] = useState(false);

  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const [role, setRole] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
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

        const localHealthRaw = await SecureStore.getItemAsync(
          "user_health_profile",
        );
        if (localHealthRaw) {
          const localHealth = JSON.parse(localHealthRaw);
          if (localHealth.name) primaryName = localHealth.name;
        }

        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.name) primaryName = userData.name;
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
        const profilesRef = collection(
          db,
          "users",
          currentUser.uid,
          "profiles",
        );
        const snapshot = await getDocs(profilesRef);
        const subProfiles: Profile[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name ?? "Unnamed Profile",
            icon: data.icon ?? data.photoURL,
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

        // Collect IDs assigned to OTHER seats
        const assignedOtherIds = new Set<string>();
        Object.entries(assignments).forEach(([seatNumStr, prof]) => {
          if (parseInt(seatNumStr, 10) !== seat && prof?.id) {
            assignedOtherIds.add(prof.id);
          }
        });

        // Filter out profiles assigned elsewhere
        const availableProfiles = combinedList.filter(
          (p) => !assignedOtherIds.has(p.id),
        );

        if (cancelled) return;
        setProfiles(availableProfiles);
      } catch (error) {
        console.error("Error fetching profiles/user: ", error);
        if (!cancelled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            "Load Error",
            "Failed to load profiles. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setIsFetchingProfiles(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, seat]);

  const handleSelectProfile = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProfileId(id);
  };

  const handleSave = async () => {
    if (!selectedProfileId) return;
    setIsLoading(true);
    try {
      const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
      if (!selectedProfile) return;

      const raw = await AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY);
      const assignments: Record<number, Profile> = raw ? JSON.parse(raw) : {};
      assignments[seat] = selectedProfile;
      await AsyncStorage.setItem(
        SEAT_ASSIGNMENTS_KEY,
        JSON.stringify(assignments),
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.(seat, selectedProfile);
      onClose();
    } catch (error) {
      console.error("Error assigning seat:", error);
      Alert.alert("Error", "Failed to assign seat.");
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
      await AsyncStorage.setItem(
        SEAT_ASSIGNMENTS_KEY,
        JSON.stringify(assignments),
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.(seat, null);
      onClose();
    } catch (error) {
      console.error("Error unassigning seat:", error);
      Alert.alert("Error", "Failed to unassign seat.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <LeatherPanel style={styles.sheet} inset={10}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={onClose}
              disabled={isLoading}
              style={styles.chromeCircle}
            >
              <Ionicons name="close" size={18} color="#F1E3C6" />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={handleSave}
              disabled={isLoading || !selectedProfileId}
              style={[
                styles.chromeCircle,
                selectedProfileId && !isLoading
                  ? styles.chromeCircleActive
                  : null,
              ]}
            >
              <Ionicons name="checkmark" size={18} color="#F1E3C6" />
            </Pressable>
          </View>

          <Text style={styles.title}>Assign {role}</Text>

          {isFetchingProfiles ? (
            <Text style={styles.caption}>Loading Profiles...</Text>
          ) : profiles.length === 0 ? (
            <Text style={styles.caption}>
              All available profiles have been assigned.
            </Text>
          ) : (
            <PaperCard style={{ marginTop: 16, padding: 6, maxHeight: 320 }}>
              <ScrollView>
                {profiles.map((profile, i) => {
                  const isSelected = profile.id === selectedProfileId;
                  return (
                    <Pressable
                      key={profile.id}
                      onPress={() => handleSelectProfile(profile.id)}
                      style={[
                        styles.profileRow,
                        i !== profiles.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: "rgba(120,90,50,0.25)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileName,
                          {
                            color: isSelected
                              ? currentTheme.primaryBttn
                              : currentTheme.text,
                            fontWeight: isSelected ? "800" : "600",
                          },
                        ]}
                      >
                        {profile.name}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={currentTheme.primaryBttn}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </PaperCard>
          )}

          <View style={{ marginTop: 16 }}>
            <UButton
              label={isLoading ? "Saving..." : "Assign Seat"}
              variant="primary"
              fullWidth
              enabled={!isLoading && !!selectedProfileId}
              onPress={handleSave}
            />
          </View>

          {isCurrentlyAssigned && !isFetchingProfiles && (
            <Pressable
              onPress={handleUnassign}
              disabled={isLoading}
              style={{ alignItems: "center", marginTop: 14 }}
            >
              <Text style={styles.unassignText}>Unassign Seat</Text>
            </Pressable>
          )}
        </LeatherPanel>
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
    paddingBottom: 34,
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
    fontSize: 26,
    color: "#F1E3C6",
    fontWeight: "800",
    textAlign: "center",
  },
  caption: {
    fontSize: 15,
    color: "#C9AC7C",
    textAlign: "center",
    marginTop: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  profileName: {
    fontSize: 17,
  },
  unassignText: {
    color: "#E36A54",
    fontSize: 15,
    fontWeight: "700",
  },
});

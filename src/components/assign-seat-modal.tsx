import { Themes } from "@/constants/theme";
import {
  createGuestAssignment,
  type SafeSeatAssignment,
  type SafeSeatSeatNo,
} from "@/types/safeseat-session";
import {
  BottomSheet,
  Button,
  Column,
  Host,
  Icon,
  List,
  Row,
  Spacer,
  Text,
} from "@expo/ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
} from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { auth, db } from "../firebase";

type Props = {
  visible: boolean;
  seat: SafeSeatSeatNo;
  assignments: Record<number, SafeSeatAssignment>;
  onClose: () => void;
  onSuccess?: (seat: SafeSeatSeatNo, profile: SafeSeatAssignment | null) => void;
};

const GUEST_OPTION_ID = "__safeseat_guest__";

const ROLE_LABELS: Record<SafeSeatSeatNo, string> = {
  1: "Driver",
  2: "Front Passenger",
  3: "Rear Left",
  4: "Rear Center",
  5: "Rear Right",
};

export default function AssignSeatModal({
  visible,
  onClose,
  onSuccess,
  seat,
  assignments,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfiles, setIsFetchingProfiles] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<SafeSeatAssignment[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const currentTheme = Themes[colorScheme === "dark" ? "dark" : "light"];

  const assignedSeatProfile = assignments[seat];
  const isCurrentlyAssigned = Boolean(assignedSeatProfile);
  const role = ROLE_LABELS[seat];

  const assignedOtherIds = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(assignments).forEach(([seatNo, profile]) => {
      if (Number(seatNo) !== seat && profile?.id && !profile.isGuest) {
        ids.add(profile.id);
      }
    });
    return ids;
  }, [assignments, seat]);

  useEffect(() => {
    if (!visible) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadWarning(null);
    setSelectedProfileId(
      assignedSeatProfile?.isGuest
        ? GUEST_OPTION_ID
        : assignedSeatProfile?.id ?? null,
    );

    let cancelled = false;

    (async () => {
      setIsFetchingProfiles(true);
      const combinedList: SafeSeatAssignment[] = [];
      const currentUser = auth.currentUser;

      // Guest mode is always available, even when the SafeSeat Wi-Fi has no
      // Internet path and Firebase cannot be contacted.
      if (currentUser) {
        let primaryName = currentUser.displayName;
        let primaryIcon = currentUser.photoURL ?? undefined;

        try {
          const localHealthRaw = await SecureStore.getItemAsync("user_health_profile");
          if (localHealthRaw) {
            const localHealth = JSON.parse(localHealthRaw);
            if (localHealth.name) primaryName = localHealth.name;
          }
        } catch {
          // Local profile metadata is optional for assignment.
        }

        try {
          const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.name) primaryName = userData.name;
            if (userData.icon || userData.photoURL) {
              primaryIcon = userData.icon ?? userData.photoURL;
            }
          }
        } catch {
          setLoadWarning(
            "Cloud profiles are temporarily unavailable. Guest Occupant remains available offline.",
          );
        }

        combinedList.push({
          id: currentUser.uid,
          name: `${primaryName ?? "Me"} (Me)`,
          icon: primaryIcon ?? null,
          isAccountOwner: true,
        });

        try {
          const snapshot = await getDocs(
            collection(db, "users", currentUser.uid, "profiles"),
          );
          snapshot.docs.forEach((profileDoc) => {
            const data = profileDoc.data();
            combinedList.push({
              id: profileDoc.id,
              name: data.name ?? "Unnamed Profile",
              icon: data.icon ?? data.photoURL ?? null,
              photoURL: data.photoURL ?? null,
            });
          });
        } catch {
          setLoadWarning(
            "Cloud profiles are temporarily unavailable. Guest Occupant remains available offline.",
          );
        }
      }

      // If a registered profile is already assigned and cloud lookup is
      // unavailable, keep that current assignment selectable.
      if (
        assignedSeatProfile &&
        !assignedSeatProfile.isGuest &&
        !combinedList.some((profile) => profile.id === assignedSeatProfile.id)
      ) {
        combinedList.push(assignedSeatProfile);
      }

      if (cancelled) return;
      setProfiles(
        combinedList.filter((profile) => !assignedOtherIds.has(profile.id)),
      );
      setIsFetchingProfiles(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [assignedOtherIds, assignedSeatProfile, visible]);

  const handleResetAndClose = () => {
    setSelectedProfileId(null);
    setLoadWarning(null);
    onClose();
  };

  const handleSelectProfile = (profileId: string) => {
    Haptics.selectionAsync();
    setSelectedProfileId(profileId);
  };

  const handleSave = async () => {
    if (!selectedProfileId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const selectedProfile =
      selectedProfileId === GUEST_OPTION_ID
        ? createGuestAssignment(seat)
        : profiles.find((profile) => profile.id === selectedProfileId);

    if (!selectedProfile) return;

    setIsLoading(true);
    try {
      onSuccess?.(seat, selectedProfile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleResetAndClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    try {
      onSuccess?.(seat, null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleResetAndClose();
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

          <Column spacing={12} alignment="center">
            {/* @ts-ignore Expo UI textStyle is platform-rendered */}
            <Text
              textStyle={{
                fontSize: 32,
                color: currentTheme.text,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Assign {role}
            </Text>

            {loadWarning ? (
              /* @ts-ignore Expo UI textStyle is platform-rendered */
              <Text
                textStyle={{
                  fontSize: 13,
                  color: currentTheme.textSecondary,
                  textAlign: "center",
                }}
              >
                {loadWarning}
              </Text>
            ) : null}

            <List>
              <Button
                onPress={() => handleSelectProfile(GUEST_OPTION_ID)}
                variant="text"
              >
                <Row spacing={12} alignment="center">
                  {/* @ts-ignore Expo UI textStyle is platform-rendered */}
                  <Text textStyle={{ fontSize: 18, color: currentTheme.text }}>
                    Guest / Temporary Occupant
                  </Text>
                  <Spacer flexible />
                  {selectedProfileId === GUEST_OPTION_ID ? (
                    <Icon
                      name={Icon.select({
                        ios: "checkmark",
                        android: import("@expo/material-symbols/check.xml"),
                      })}
                    />
                  ) : null}
                </Row>
              </Button>

              {profiles.map((profile) => {
                const isSelected = profile.id === selectedProfileId;
                return (
                  <Button
                    key={profile.id}
                    onPress={() => handleSelectProfile(profile.id)}
                    variant="text"
                  >
                    <Row spacing={12} alignment="center">
                      {/* @ts-ignore Expo UI textStyle is platform-rendered */}
                      <Text textStyle={{ fontSize: 18, color: currentTheme.text }}>
                        {profile.name}
                      </Text>
                      <Spacer flexible />
                      {isSelected ? (
                        <Icon
                          name={Icon.select({
                            ios: "checkmark",
                            android: import("@expo/material-symbols/check.xml"),
                          })}
                        />
                      ) : null}
                    </Row>
                  </Button>
                );
              })}
            </List>

            {isFetchingProfiles ? (
              /* @ts-ignore Expo UI textStyle is platform-rendered */
              <Text
                textStyle={{
                  fontSize: 13,
                  color: currentTheme.textSecondary,
                  textAlign: "center",
                }}
              >
                Loading saved profiles…
              </Text>
            ) : null}

            {isCurrentlyAssigned ? (
              <Button
                variant="outlined"
                onPress={handleUnassign}
                disabled={isLoading}
                modifiers={[buttonStyle("bordered"), controlSize("regular")]}
              >
                {/* @ts-ignore Expo UI textStyle is platform-rendered */}
                <Text textStyle={{ color: "#FF3B30", fontWeight: "600" }}>
                  Unassign Seat
                </Text>
              </Button>
            ) : null}
          </Column>
          <Spacer flexible />
        </Column>
      </BottomSheet>
    </Host>
  );
}

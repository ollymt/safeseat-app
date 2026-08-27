import AssignCard from "@/components/assign-card";
import AssignSeatModal from "@/components/assign-seat-modal";
import Button from "@/components/button";
import { Themes } from "@/constants/theme";
import { useSafeSeatSession } from "@/hooks/use-safeseat-session";
import {
  clearSafeSeatSession,
  updateSafeSeatSession,
} from "@/services/safeseat-session-store";
import {
  SAFESEAT_SEATS,
  getSafeSeatLabel,
  type SafeSeatActiveSession,
  type SafeSeatAssignment,
  type SafeSeatSeatNo,
} from "@/types/safeseat-session";
import * as Haptics from "expo-haptics";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../../../firebase";

function cloudSafeAssignment(profile: SafeSeatAssignment) {
  return {
    id: profile.id,
    name: profile.isGuest ? "Guest Occupant" : profile.name,
    photoURL: profile.isGuest ? null : profile.photoURL ?? null,
    icon: profile.isGuest ? null : profile.icon ?? null,
    isAccountOwner: profile.isGuest ? false : profile.isAccountOwner ?? false,
    isGuest: Boolean(profile.isGuest),
    sessionOnly: Boolean(profile.sessionOnly),
  };
}

function mirrorSessionToFirestore(session: SafeSeatActiveSession) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // Temporary Guest occupants remain local to the active phone session.
  // Do not write Guest identity/session data to Firestore, even transiently.
  const assignments = Object.fromEntries(
    Object.entries(session.assignments)
      .filter(([, profile]) => !profile.isGuest && !profile.sessionOnly)
      .map(([seatNo, profile]) => [seatNo, cloudSafeAssignment(profile)]),
  );

  const tripDocRef = doc(
    db,
    "users",
    currentUser.uid,
    "activeTrip",
    "current",
  );

  void setDoc(
    tripDocRef,
    {
      prototypeMode: "single_seat_uat",
      monitoredSeatNo: session.monitoredSeatNo,
      assignments,
      isLockedIn: session.isLockedIn,
      lockedInAt: session.lockedInAt,
      seatStatuses: session.seatStatuses,
      emergencyEvents: session.emergencyEvents,
      appSessionUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  ).catch((error) => {
    // The SafeSeat AP is local-only. Cloud mirroring is intentionally best
    // effort and must never block assignment/monitoring on the phone.
    console.warn("SafeSeat cloud session mirror deferred:", error);
  });
}

async function archiveAndDeleteCloudSession(session: SafeSeatActiveSession) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const registeredAssignments = Object.fromEntries(
      Object.entries(session.assignments)
        .filter(([, profile]) => !profile.isGuest && !profile.sessionOnly)
        .map(([seatNo, profile]) => [seatNo, cloudSafeAssignment(profile)]),
    );

    if (session.lockedInAt) {
      await addDoc(collection(db, "users", currentUser.uid, "tripHistory"), {
        startedAt: session.lockedInAt,
        endedAt: new Date().toISOString(),
        monitoredSeatNo: session.monitoredSeatNo,
        assignments: registeredAssignments,
        finalSeatStatuses: session.seatStatuses,
        emergencyEvents: session.emergencyEvents,
        hadEmergency: session.emergencyEvents.length > 0,
        prototypeMode: "single_seat_uat",
      });
    }

    await deleteDoc(
      doc(db, "users", currentUser.uid, "activeTrip", "current"),
    );
  } catch (error) {
    console.warn(
      "SafeSeat cloud archive is pending/unavailable; local session was still ended safely:",
      error,
    );
  }
}

export default function Assign() {
  const colorScheme = useColorScheme();
  const currentTheme = Themes[colorScheme === "dark" ? "dark" : "light"];
  const { ready, session } = useSafeSeatSession();

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<SafeSeatSeatNo>(1);

  const {
    monitoredSeatNo,
    assignments,
    isLockedIn,
    lockedInAt,
  } = session;

  const hasAssignedSeats = Object.values(assignments).some(Boolean);
  const monitoredSeatAssigned = Boolean(assignments[monitoredSeatNo]);
  const sessionHasStarted = Boolean(lockedInAt);

  const getCardState = (seatNo: SafeSeatSeatNo) => {
    if (!assignments[seatNo]) return "empty" as const;
    if (!isLockedIn) return "assigned" as const;
    return seatNo === monitoredSeatNo ? "monitored" as const : "unmonitored" as const;
  };

  const choosePrototypePosition = (seatNo: SafeSeatSeatNo) => {
    Haptics.selectionAsync();

    if (sessionHasStarted) {
      Alert.alert(
        "Prototype position is fixed",
        "End Session before physically moving the SafeSeat prototype to another seat.",
      );
      return;
    }

    const next = updateSafeSeatSession({ monitoredSeatNo: seatNo });
    mirrorSessionToFirestore(next);
  };

  const handleLockIn = () => {
    if (!monitoredSeatAssigned) {
      Alert.alert(
        "Assign the monitored seat",
        `Assign an occupant to ${getSafeSeatLabel(monitoredSeatNo)} before Lock Deployment.`,
      );
      return;
    }

    const now = new Date().toISOString();
    const next = updateSafeSeatSession((current) => ({
      ...current,
      isLockedIn: true,
      lockedInAt: current.lockedInAt ?? now,
      // Do not manufacture SAFE at lock time. Main Hub Fusion must provide the
      // first authoritative SAFE/WARNING/EMERGENCY state. WATCH remains a
      // participant-facing MONITORING state and is intentionally not persisted
      // as a safety verdict.
      seatStatuses: { ...current.seatStatuses },
    }));

    mirrorSessionToFirestore(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleUnlock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Pause monitoring?",
      "Unlock Deployment pauses monitoring and allows occupant reassignment. It does not end this session or allow the prototype to be moved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          style: "destructive",
          onPress: () => {
            const next = updateSafeSeatSession({ isLockedIn: false });
            mirrorSessionToFirestore(next);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const handleEndSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "End SafeSeat session?",
      "This ends monitoring, clears temporary Guest assignments, and allows the physical prototype to be moved to another seat.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: async () => {
            const endedSession = session;
            await clearSafeSeatSession();
            void archiveAndDeleteCloudSession(endedSession);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const handleSeatAssigned = (
    seatNumber: SafeSeatSeatNo,
    profile: SafeSeatAssignment | null,
  ) => {
    const next = updateSafeSeatSession((current) => {
      const nextAssignments = { ...current.assignments };
      const nextStatuses = { ...current.seatStatuses };

      if (profile) {
        nextAssignments[seatNumber] = profile;
      } else {
        delete nextAssignments[seatNumber];
        delete nextStatuses[seatNumber];
      }

      return {
        ...current,
        assignments: nextAssignments,
        seatStatuses: nextStatuses,
      };
    });

    mirrorSessionToFirestore(next);
  };

  const handleCardPress = (seatNo: SafeSeatSeatNo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isLockedIn) {
      Alert.alert(
        "Deployment locked",
        "Use Unlock Deployment before changing occupant assignments.",
      );
      return;
    }

    setSelectedSeat(seatNo);
    setAssignModalVisible(true);
  };

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.background }}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: currentTheme.textSecondary }}>Loading SafeSeat session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: currentTheme.background }}
      edges={["left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.pageHeader, { color: currentTheme.text }]}>Assign</Text>

        <View style={[styles.prototypeCard, { backgroundColor: currentTheme.element }]}>
          <Text style={[styles.prototypeTitle, { color: currentTheme.text }]}>Prototype Position</Text>
          <Text style={[styles.prototypeHint, { color: currentTheme.textSecondary }]}>
            Select the seat where the one physical SafeSeat prototype is installed.
          </Text>

          <View style={styles.positionWrap}>
            {SAFESEAT_SEATS.map((seat) => {
              const selected = seat.seatNo === monitoredSeatNo;
              return (
                <Pressable
                  key={seat.seatNo}
                  onPress={() => choosePrototypePosition(seat.seatNo)}
                  style={[
                    styles.positionChip,
                    {
                      backgroundColor: selected
                        ? currentTheme.primaryBttn
                        : currentTheme.backgroundElement,
                      opacity: sessionHasStarted && !selected ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.positionChipText,
                      {
                        color: selected
                          ? currentTheme.primaryBttnText
                          : currentTheme.text,
                      },
                    ]}
                  >
                    {seat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {sessionHasStarted ? (
            <Text style={[styles.fixedHint, { color: currentTheme.textSecondary }]}>
              Position fixed for this session. End Session before moving the prototype.
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 10, width: "100%" }}>
          <View style={styles.frontRow}>
            {SAFESEAT_SEATS.slice(0, 2).map((seat) => (
              <AssignCard
                key={seat.seatNo}
                seatNo={seat.seatNo}
                assignedProfile={assignments[seat.seatNo]}
                onPress={() => handleCardPress(seat.seatNo)}
                state={getCardState(seat.seatNo)}
                seatCode={`${seat.seatCode}${seat.seatNo === monitoredSeatNo ? " • prototype" : ""}`}
              />
            ))}
          </View>

          <View style={styles.backRow}>
            {SAFESEAT_SEATS.slice(2).map((seat) => (
              <AssignCard
                key={seat.seatNo}
                seatNo={seat.seatNo}
                assignedProfile={assignments[seat.seatNo]}
                onPress={() => handleCardPress(seat.seatNo)}
                state={getCardState(seat.seatNo)}
                seatCode={`${seat.seatCode}${seat.seatNo === monitoredSeatNo ? " • prototype" : ""}`}
              />
            ))}
          </View>
        </View>

        {!monitoredSeatAssigned ? (
          <Text style={[styles.lockHint, { color: currentTheme.warnBttn }]}>
            Assign an occupant to {getSafeSeatLabel(monitoredSeatNo)} before Lock Deployment.
          </Text>
        ) : null}

        <View style={styles.actions}>
          {isLockedIn ? (
            <Button
              label="Unlock Deployment"
              onPress={handleUnlock}
              fullWidth
              variant="warn"
              glass={false}
            />
          ) : (
            <>
              <Button
                label={sessionHasStarted ? "Resume / Lock Deployment" : "Lock Deployment"}
                onPress={handleLockIn}
                fullWidth
                variant="primary"
                enabled={hasAssignedSeats && monitoredSeatAssigned}
                glass={false}
              />
              {hasAssignedSeats || sessionHasStarted ? (
                <Button
                  label="End Session"
                  onPress={handleEndSession}
                  fullWidth
                  variant="secondary"
                  glass={false}
                />
              ) : null}
            </>
          )}
        </View>

        <AssignSeatModal
          seat={selectedSeat}
          visible={assignModalVisible}
          assignments={assignments}
          onClose={() => setAssignModalVisible(false)}
          onSuccess={handleSeatAssigned}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 70,
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeader: {
    fontSize: 40,
    fontFamily: "Logo-Font",
  },
  prototypeCard: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  prototypeTitle: {
    fontSize: 18,
    fontFamily: "Body-Bold",
  },
  prototypeHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  positionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  positionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  positionChipText: {
    fontSize: 12,
    fontFamily: "Body-Bold",
  },
  fixedHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  frontRow: {
    gap: 10,
    flexDirection: "row",
    height: 205,
  },
  backRow: {
    gap: 10,
    flexDirection: "row",
    height: 205,
  },
  lockHint: {
    fontFamily: "Body-Medium",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  actions: {
    gap: 10,
    paddingTop: 4,
  },
});

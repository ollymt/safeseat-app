import { Themes } from "@/constants/theme";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AssignCard from "@/components/assign-card";
import AssignSeatModal from "@/components/assign-seat-modal";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";

import Button from "@/components/button";
import EmergencytModal from "@/components/emergency-modal";

import {
	addDoc,
	arrayUnion,
	collection,
	deleteField,
	doc,
	onSnapshot,
	setDoc,
	updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

type Profile = {
  id: string;
  name: string;
  photoURL?: string;
  icon?: string;
  isAccountOwner?: boolean;
};

export type SeatState = "empty" | "assigned" | "safe" | "warning" | "emergency";

type EmergencyEvent = {
  seatNo: number;
  occurredAt: string;
};

const SEATS = [
  { seatNo: 1, seatCode: "driver" },
  { seatNo: 2, seatCode: "passenger" },
  { seatNo: 3, seatCode: "l backseat" },
  { seatNo: 4, seatCode: "c backseat" },
  { seatNo: 5, seatCode: "r backseat" },
];

export default function Assign() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const router = useRouter();

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(1);

  // Map seat numbers (1-5) to assigned Profiles — now sourced live from Firestore
  const [assignments, setAssignments] = useState<Record<number, Profile>>({});

  // Lock-in state & status mapping (seatNo -> "safe" | "warning" | "emergency") — live from Firestore
  const [isLockedIn, setIsLockedIn] = useState<boolean>(false);
  const [seatStatuses, setSeatStatuses] = useState<Record<number, SeatState>>(
    {},
  );

  // 🕒 Trip history bookkeeping — when the current trip started, and every
  // emergency moment logged during it, so we can archive both on Unlock.
  const [lockedInAt, setLockedInAt] = useState<string | null>(null);
  const [emergencyEvents, setEmergencyEvents] = useState<EmergencyEvent[]>([]);

  // Check if at least one seat has an assigned profile
  const hasAssignedSeats = Object.values(assignments).some((profile) =>
    Boolean(profile),
  );

  // 📡 Real-time listener on users/{uid}/activeTrip/current — replaces the old
  // AsyncStorage read. This fires instantly whenever the doc changes, whether
  // the change came from this device, another device, or (later) a sensor.
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const tripDocRef = doc(
      db,
      "users",
      currentUser.uid,
      "activeTrip",
      "current",
    );

    const unsubscribe = onSnapshot(
      tripDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAssignments(data.assignments ?? {});
          setIsLockedIn(Boolean(data.isLockedIn));
          setSeatStatuses(data.seatStatuses ?? {});
          setLockedInAt(data.lockedInAt ?? null);
          setEmergencyEvents(data.emergencyEvents ?? []);
        } else {
          setAssignments({});
          setIsLockedIn(false);
          setSeatStatuses({});
          setLockedInAt(null);
          setEmergencyEvents([]);
        }
      },
      (error) => {
        console.error("Failed to listen to active trip data:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  // 🛠️ Derive the current state for any given seat number
  const getCardState = (seatNo: number): SeatState => {
    const hasProfile = Boolean(assignments[seatNo]);

    if (!hasProfile) return "empty";
    if (!isLockedIn) return "assigned";

    // When locked in, return its live status (defaulting to "safe")
    return seatStatuses[seatNo] ?? "safe";
  };

  // 🔒 Lock In Handler
  const handleLockIn = async () => {
    if (!hasAssignedSeats) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Default all currently assigned seats to "safe" status upon lock-in
    const initialStatuses: Record<number, SeatState> = {};
    Object.keys(assignments).forEach((seatStr) => {
      const seatNum = parseInt(seatStr, 10);
      initialStatuses[seatNum] = seatStatuses[seatNum] ?? "safe";
    });

    try {
      const tripDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "activeTrip",
        "current",
      );
      await setDoc(
        tripDocRef,
        {
          isLockedIn: true,
          seatStatuses: initialStatuses,
          lockedInAt: new Date().toISOString(),
          emergencyEvents: [], // fresh log for this new trip
        },
        { merge: true },
      );
      // No local setState needed — the onSnapshot listener above will
      // pick up this write and update the UI automatically.
    } catch (error) {
      console.error("Failed to lock in assignments:", error);
      Alert.alert("Error", "Could not save locked-in state.");
    }
  };

  // 📦 Archive the trip that's about to end into tripHistory, then clear
  // the current trip's bookkeeping fields (assignments/seatStatuses are
  // intentionally left alone, matching the existing "stay assigned after
  // unlock" behavior).
  const archiveCurrentTrip = async (currentUserUid: string) => {
    try {
      const historyRef = collection(db, "users", currentUserUid, "tripHistory");
      await addDoc(historyRef, {
        startedAt: lockedInAt ?? null,
        endedAt: new Date().toISOString(),
        assignments: assignments,
        finalSeatStatuses: seatStatuses,
        emergencyEvents: emergencyEvents,
        hadEmergency: emergencyEvents.length > 0,
      });

      const tripDocRef = doc(
        db,
        "users",
        currentUserUid,
        "activeTrip",
        "current",
      );
      await setDoc(
        tripDocRef,
        {
          isLockedIn: false,
          lockedInAt: deleteField(),
          emergencyEvents: [],
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Failed to archive trip history:", error);
    }
  };

  // 🔓 Unlock Handler
  const handleUnlock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Seats are locked in.", "Are you sure you want to unlock?", [
      {
        text: "No",
        style: "cancel",
      },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          const currentUser = auth.currentUser;
          if (!currentUser) return;

          try {
            await archiveCurrentTrip(currentUser.uid);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error("Failed to unlock assignments:", error);
          }
        },
      },
    ]);
  };

  // ⚡ Mutator: Update status for a specific locked seat ("safe" | "warning" | "emergency")
  const updateSeatStatus = async (
    seatNo: number,
    status: "safe" | "warning" | "emergency",
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Clear dismissal so a new emergency on this seat shows the modal again
    if (status === "emergency") {
      setDismissedSeats((prev) => {
        const next = new Set(prev);
        next.delete(seatNo);
        return next;
      });
    }

    try {
      const tripDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "activeTrip",
        "current",
      );
      await setDoc(
        tripDocRef,
        {
          seatStatuses: { [String(seatNo)]: status },
          // Log the exact moment an emergency was triggered, so it
          // survives even if the seat is later cycled back to "safe"
          // before Unlock is pressed.
          ...(status === "emergency"
            ? {
                emergencyEvents: arrayUnion({
                  seatNo,
                  occurredAt: new Date().toISOString(),
                }),
              }
            : {}),
        },
        { merge: true },
      );
    } catch (error) {
      console.error(`Failed to update status for seat ${seatNo}:`, error);
    }
  };

  // ⚡ Mutator: Update status for ALL assigned seats at once
  const setAllSeatsStatus = async (
    status: "safe" | "warning" | "emergency",
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const updatedStatuses: Record<number, SeatState> = {};
    const newEmergencyEvents: EmergencyEvent[] = [];
    Object.keys(assignments).forEach((seatStr) => {
      const seatNum = parseInt(seatStr, 10);
      updatedStatuses[seatNum] = status;
      if (status === "emergency") {
        newEmergencyEvents.push({
          seatNo: seatNum,
          occurredAt: new Date().toISOString(),
        });
      }
    });

    try {
      const tripDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "activeTrip",
        "current",
      );
      await setDoc(
        tripDocRef,
        {
          seatStatuses: updatedStatuses,
          ...(newEmergencyEvents.length > 0
            ? {
                emergencyEvents: arrayUnion(...newEmergencyEvents),
              }
            : {}),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Failed to update status for all seats:", error);
    }
  };

  // Callback when modal updates or unassigns a seat
  const handleSeatAssigned = async (
    seatNumber: number,
    profile: Profile | null,
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const tripDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "activeTrip",
        "current",
      );

      if (profile) {
        await setDoc(
          tripDocRef,
          {
            assignments: { [String(seatNumber)]: profile },
          },
          { merge: true },
        );
      } else {
        // deleteField() fully removes the key, unlike setting it to null
        await updateDoc(tripDocRef, {
          [`assignments.${seatNumber}`]: deleteField(),
        });
      }
    } catch (error) {
      console.error("Failed to update seat assignment:", error);
      Alert.alert("Error", "Could not save seat assignment.");
    }
  };

  // Card tap interaction
  const handleCardPress = (seatNo: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isLockedIn) {
      // Options or quick-status toggle when locked in
      const currentStatus = getCardState(seatNo);
      if (currentStatus === "empty") return;

      // Example cycle when tapped while locked in: safe -> warning -> emergency -> safe
      const nextStatus: Record<string, "safe" | "warning" | "emergency"> = {
        safe: "warning",
        warning: "emergency",
        emergency: "safe",
      };
      updateSeatStatus(seatNo, nextStatus[currentStatus] ?? "safe");
    } else {
      // Open assignment modal when unlocked
      setSelectedSeat(seatNo);
      setAssignModalVisible(true);
    }
  };

  const [dismissedSeats, setDismissedSeats] = useState<Set<number>>(new Set());

  const emergencySeat = isLockedIn
    ? SEATS.find(
        ({ seatNo }) =>
          seatStatuses[seatNo] === "emergency" &&
          assignments[seatNo] &&
          !dismissedSeats.has(seatNo),
      )
    : undefined;

  const emergencyProfile = emergencySeat
    ? assignments[emergencySeat.seatNo]
    : undefined;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentTheme.background,
      }}
      edges={["left", "right"]}
    >
      <View style={[styles.container, { marginTop: 40 }]}>
        <Text style={[styles.pageHeader, { color: currentTheme.text }]}>
          Assign
        </Text>

        <View
          style={{
            gap: 10,
            marginTop: 10,
            width: "100%",
            borderWidth: 0,
            borderColor: currentTheme.secondaryBttn,
            borderRadius: 10,
          }}
        >
          {/* Front Row */}
          <View style={{ gap: 10, flexDirection: "row", height: 230 }}>
            <AssignCard
              seatNo={1}
              assignedProfile={assignments[1]}
              onPress={() => handleCardPress(1)}
              state={getCardState(1)}
              seatCode="driver"
            />
            <AssignCard
              seatNo={2}
              assignedProfile={assignments[2]}
              onPress={() => handleCardPress(2)}
              state={getCardState(2)}
              seatCode="passenger"
            />
          </View>

          {/* Back Row */}
          <View style={{ gap: 10, flexDirection: "row", height: 230 }}>
            <AssignCard
              seatNo={3}
              assignedProfile={assignments[3]}
              onPress={() => handleCardPress(3)}
              state={getCardState(3)}
              seatCode="l backseat"
            />
            <AssignCard
              seatNo={4}
              assignedProfile={assignments[4]}
              onPress={() => handleCardPress(4)}
              state={getCardState(4)}
              seatCode="c backseat"
            />
            <AssignCard
              seatNo={5}
              assignedProfile={assignments[5]}
              onPress={() => handleCardPress(5)}
              state={getCardState(5)}
              seatCode="r backseat"
            />
          </View>
        </View>

        {/* Lock In / Unlock Action Controls */}
        <View style={{ paddingVertical: 20 }}>
          {isLockedIn ? (
            <Button
              label="Unlock"
              onPress={handleUnlock}
              fullWidth={true}
              variant="warn"
              glass={false}
            />
          ) : (
            <Button
              label="Lock In"
              onPress={handleLockIn}
              fullWidth={true}
              variant="primary"
              enabled={hasAssignedSeats}
              glass={false}
            />
          )}
        </View>

        <AssignSeatModal
          seat={selectedSeat}
          visible={assignModalVisible}
          onClose={() => {
            setAssignModalVisible(false);
          }}
          onSuccess={(seatNum, profile) => {
            handleSeatAssigned(seatNum, profile);
          }}
        />

        {emergencySeat && emergencyProfile && (
          <EmergencytModal
            seat={emergencySeat.seatNo}
            visible={true}
            onClose={() =>
              setDismissedSeats((prev) =>
                new Set(prev).add(emergencySeat.seatNo),
              )
            }
            id={emergencyProfile.id}
            name={emergencyProfile.name}
            icon={emergencyProfile.photoURL ?? emergencyProfile.icon}
            isAccountOwner={emergencyProfile.isAccountOwner}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    padding: 20,
    borderWidth: 0,
    borderColor: "#fff",
  },
  pageHeader: {
    fontSize: 40,
    fontFamily: "Logo-Font",
  },
});

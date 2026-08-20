import { Themes } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "@/components/button";
import EmergencytModal from "@/components/emergency-modal";
import SeatCard from "@/components/seat-card";
import {
  EngravedTitle,
  LeatherPanel,
  LinenBackground,
} from "@/components/skeuo";
import { Ionicons } from "@expo/vector-icons";

import { auth, db } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";

const SeatCardAny = SeatCard as any;

type Profile = {
  id: string;
  name: string;
  photoURL?: string;
  icon?: string;
  isAccountOwner?: boolean;
};

export type SeatState = "empty" | "assigned" | "safe" | "warning" | "emergency";

const SEAT_ROLES: Record<number, string> = {
  1: "driver",
  2: "passenger",
  3: "l backseat",
  4: "c backseat",
  5: "r backseat",
};

export default function Home() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const router = useRouter();

  const [isLockedIn, setIsLockedIn] = useState<boolean>(false);
  const [assignments, setAssignments] = useState<Record<number, Profile>>({});
  const [seatStatuses, setSeatStatuses] = useState<Record<number, SeatState>>(
    {},
  );

  // Tracks which emergency seats the user has dismissed
  const [dismissedSeats, setDismissedSeats] = useState<Set<number>>(new Set());

  // 📡 Real-time listener on active trip data
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
          setIsLockedIn(Boolean(data.isLockedIn));
          setAssignments(data.assignments ?? {});
          setSeatStatuses(data.seatStatuses ?? {});
        } else {
          setIsLockedIn(false);
          setAssignments({});
          setSeatStatuses({});
        }
      },
      (error) => {
        console.error("Failed to listen to active trip data:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  // Derive card status state
  const getSeatState = (
    seatNo: number,
  ): "empty" | "safe" | "warning" | "emergency" => {
    const profile = assignments[seatNo];
    if (!profile) return "empty";

    const status = seatStatuses[seatNo];
    if (status === "assigned") return "safe";
    return status ?? "safe";
  };

  // 🚨 Find active emergency seat
  const emergencySeatNo = isLockedIn
    ? [1, 2, 3, 4, 5].find(
        (seatNo) =>
          seatStatuses[seatNo] === "emergency" &&
          assignments[seatNo] &&
          !dismissedSeats.has(seatNo),
      )
    : undefined;

  const emergencyProfile =
    emergencySeatNo !== undefined ? assignments[emergencySeatNo] : undefined;

  return (
    <LinenBackground>
      <SafeAreaView
        style={{
          flex: 1,
        }}
        edges={["left", "right"]}
      >
        {isLockedIn && (
          <LeatherPanel style={styles.headerPanel}>
            <EngravedTitle size={26}>Home</EngravedTitle>
          </LeatherPanel>
        )}
        <View style={[styles.container, { marginTop: isLockedIn ? 16 : 40 }]}>
          {isLockedIn ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={{ gap: 10, marginTop: 10 }}>
                {[1, 2, 3, 4, 5].map((seatNo) => {
                  const profile = assignments[seatNo];
                  const state = getSeatState(seatNo);

                  return (
                    <SeatCardAny
                      key={seatNo}
                      seatNo={seatNo}
                      role={SEAT_ROLES[seatNo]}
                      name={profile?.name}
                      pfp={profile?.icon ?? profile?.photoURL}
                      state={state}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    />
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.unlockedContainer}>
              <View style={{ marginVertical: 20 }}>
                <Ionicons
                  name="lock-open"
                  size={180}
                  color={currentTheme.secondaryBttn}
                />
              </View>
              <Text
                style={[styles.unlockedTitle, { color: currentTheme.text }]}
              >
                Trip Not Locked In
              </Text>
              <Text
                style={[
                  styles.unlockedSubtitle,
                  { color: currentTheme.textSecondary },
                ]}
              >
                Assign passengers to seats and tap "Lock In" on the Assign page
                to start monitoring.
              </Text>
              <View style={{ width: "100%", marginTop: 24 }}>
                <Button
                  label="Go to Assign"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/assign");
                  }}
                  fullWidth={true}
                  glass={false}
                />
              </View>
            </View>
          )}

          {emergencySeatNo !== undefined && emergencyProfile && (
            <EmergencytModal
              seat={emergencySeatNo}
              visible={true}
              onClose={() =>
                setDismissedSeats((prev) => new Set(prev).add(emergencySeatNo))
              }
              id={emergencyProfile.id}
              name={emergencyProfile.name}
              icon={emergencyProfile.photoURL ?? emergencyProfile.icon}
              isAccountOwner={emergencyProfile.isAccountOwner}
            />
          )}
        </View>
      </SafeAreaView>
    </LinenBackground>
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
  headerPanel: {
    width: "100%",
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  unlockedContainer: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 140,
    alignItems: "center",
    paddingHorizontal: 20,
    borderWidth: 0,
    borderColor: "#fff",
  },
  unlockedTitle: {
    fontSize: 22,
    fontFamily: "Body-Bold",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  unlockedSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});

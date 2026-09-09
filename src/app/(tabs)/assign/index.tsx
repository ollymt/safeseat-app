import Button from "@/components/button";
import AssignCard from "@/components/assign-card";
import AssignSeatModal from "@/components/assign-seat-modal";
import { Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useSafeSeatHub } from "@/hooks/safeseat-hub-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Profile = {
  id: string;
  name: string;
  photoURL?: string;
  icon?: string;
  pfp?: string;
  isAccountOwner?: boolean;
  isGuest?: boolean;
  sessionOnly?: boolean;
};

export type SeatState = "empty" | "assigned" | "safe" | "warning" | "emergency" | "unknown";

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";
const IS_LOCKED_IN_KEY = "isLockedIn";
const SEAT_STATUSES_KEY = "seatStatuses";
const HARDWARE_SEAT_KEY = "safeSeatHardwareSeatNo";

const SEATS = [
  { seatNo: 1, seatCode: "driver" },
  { seatNo: 2, seatCode: "front passenger" },
  { seatNo: 3, seatCode: "left rear" },
  { seatNo: 4, seatCode: "center rear" },
  { seatNo: 5, seatCode: "right rear" },
];

export default function Assign() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = 168 + insets.bottom;
  const { connected: hubConnected, telemetryReady, seatState: hubSeatState, refresh: refreshHub } = useSafeSeatHub();

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(1);
  const [assignments, setAssignments] = useState<Record<number, Profile>>({});
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [hardwareSeatNo, setHardwareSeatNo] = useState<number | null>(null);

  const assignedSeatCount = useMemo(
    () => SEATS.filter((seat) => Boolean(assignments[seat.seatNo])).length,
    [assignments],
  );
  const guestSeatCount = useMemo(
    () => SEATS.filter((seat) => Boolean(assignments[seat.seatNo]?.sessionOnly)).length,
    [assignments],
  );
  const hasAssignedSeats = assignedSeatCount > 0;

  const loadState = useCallback(async () => {
    try {
      const [rawAssignments, rawLockedIn, rawHardwareSeat] = await Promise.all([
        AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY),
        AsyncStorage.getItem(IS_LOCKED_IN_KEY),
        AsyncStorage.getItem(HARDWARE_SEAT_KEY),
      ]);

      const parsedAssignments: Record<number, Profile> = rawAssignments ? JSON.parse(rawAssignments) : {};
      const parsedHardwareSeat = rawHardwareSeat ? Number(JSON.parse(rawHardwareSeat)) : null;
      const fallbackHardwareSeat = Number(Object.keys(parsedAssignments)[0]) || null;

      setAssignments(parsedAssignments);
      setIsLockedIn(rawLockedIn ? JSON.parse(rawLockedIn) : false);
      setHardwareSeatNo(parsedHardwareSeat && parsedAssignments[parsedHardwareSeat] ? parsedHardwareSeat : fallbackHardwareSeat);
    } catch (error) {
      console.error("Failed to load seat & lock state:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadState();
    }, [loadState]),
  );

  const getCardState = (seatNo: number): SeatState => {
    const hasProfile = Boolean(assignments[seatNo]);
    if (!hasProfile) return "empty";
    if (!isLockedIn) return "assigned";

    // The current UAT prototype has one physical Main Hub/seat assembly.
    // Only the explicitly linked seat receives authoritative live Fusion state.
    if (seatNo === hardwareSeatNo) {
      return hubConnected && telemetryReady ? hubSeatState : "unknown";
    }

    // Other assigned positions remain pending rather than copying one
    // prototype's state across the whole conceptual five-seat cabin.
    return "unknown";
  };

  const getSeatLabel = (seatNo: number | null) => {
    if (!seatNo) return "Not selected";
    const seat = SEATS.find((item) => item.seatNo === seatNo);
    if (!seat) return `Seat ${seatNo}`;
    return seat.seatCode.replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const persistHardwareSeat = async (seatNo: number | null) => {
    setHardwareSeatNo(seatNo);
    if (seatNo) {
      await AsyncStorage.setItem(HARDWARE_SEAT_KEY, JSON.stringify(seatNo));
    } else {
      await AsyncStorage.removeItem(HARDWARE_SEAT_KEY);
    }
  };

  const chooseHardwareSeat = () => {
    if (isLockedIn) {
      Alert.alert("Monitoring is active", "End the session before changing the monitored seat.");
      return;
    }

    const assigned = SEATS.filter((seat) => Boolean(assignments[seat.seatNo]));
    if (assigned.length === 0) {
      Alert.alert("Assign a seat first", "Choose who is sitting in a seat before linking the SafeSeat hardware.");
      return;
    }

    Alert.alert(
      "Which seat is being monitored?",
      "Choose the seat that has the SafeSeat hardware installed.",
      [
        ...assigned.map((seat) => ({
          text: `${seat.seatNo === hardwareSeatNo ? "✓ " : ""}${getSeatLabel(seat.seatNo)}`,
          onPress: () => {
            void persistHardwareSeat(seat.seatNo);
            void Haptics.selectionAsync();
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  };

  const handleLockIn = async () => {
    if (!hasAssignedSeats) return;

    let linkedSeat = hardwareSeatNo;
    if (!linkedSeat || !assignments[linkedSeat]) {
      linkedSeat = Number(Object.keys(assignments)[0]) || null;
      await persistHardwareSeat(linkedSeat);
    }

    void refreshHub();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const initialStatuses: Record<number, SeatState> = {};
    Object.keys(assignments).forEach((seatStr) => {
      const seatNum = Number(seatStr);
      initialStatuses[seatNum] = "unknown";
    });

    try {
      await Promise.all([
        AsyncStorage.setItem(IS_LOCKED_IN_KEY, JSON.stringify(true)),
        AsyncStorage.setItem(SEAT_STATUSES_KEY, JSON.stringify(initialStatuses)),
      ]);
      setIsLockedIn(true);
      router.replace("/home");
    } catch (error) {
      console.error("Failed to start monitoring:", error);
      Alert.alert("Could not start monitoring", "SafeSeat could not save the current seat setup. Please try again.");
    }
  };

  const handleEndSession = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "End monitoring session?",
      guestSeatCount > 0
        ? `This unlocks the deployment and permanently removes ${guestSeatCount} session-only guest assignment${guestSeatCount === 1 ? "" : "s"}.`
        : "This unlocks the deployment and clears the current safety states. Saved occupant assignments remain available for the next trip.",
      [
        { text: "Keep Monitoring", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: async () => {
            try {
              const persistentAssignments: Record<number, Profile> = {};
              Object.entries(assignments).forEach(([seatNo, profile]) => {
                if (!profile.sessionOnly && !profile.isGuest) {
                  persistentAssignments[Number(seatNo)] = profile;
                }
              });

              await Promise.all([
                AsyncStorage.setItem(IS_LOCKED_IN_KEY, JSON.stringify(false)),
                AsyncStorage.setItem(SEAT_ASSIGNMENTS_KEY, JSON.stringify(persistentAssignments)),
                AsyncStorage.setItem(SEAT_STATUSES_KEY, JSON.stringify({})),
              ]);

              setIsLockedIn(false);
              setAssignments(persistentAssignments);
              if (hardwareSeatNo && !persistentAssignments[hardwareSeatNo]) {
                await persistHardwareSeat(Number(Object.keys(persistentAssignments)[0]) || null);
              }
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Failed to end session:", error);
              Alert.alert("Could not end session", "Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleSeatAssigned = (seatNumber: number, profile: Profile | null) => {
    const updated = { ...assignments };
    if (profile) updated[seatNumber] = profile;
    else delete updated[seatNumber];
    setAssignments(updated);

    if (profile && hardwareSeatNo === null) {
      void persistHardwareSeat(seatNumber);
    } else if (!profile && hardwareSeatNo === seatNumber) {
      const nextSeat = Number(Object.keys(updated)[0]) || null;
      void persistHardwareSeat(nextSeat);
    }
  };

  const handleCardPress = (seatNo: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isLockedIn) {
      Alert.alert(
        "Monitoring is active",
        "End the current session before changing seat assignments.",
      );
      return;
    }

    setSelectedSeat(seatNo);
    setAssignModalVisible(true);
  };

  const getDisplayProfile = (profile?: Profile): Profile | undefined => {
    if (!profile) return undefined;

    const image = profile.icon || profile.pfp || profile.photoURL;
    return {
      ...profile,
      name: profile.sessionOnly || profile.isGuest
        ? "Guest"
        : profile.isAccountOwner
          ? "Me"
          : profile.name,
      icon: image,
    };
  };

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.container}>
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>TRIP SETUP</Text>
            <View style={styles.titleRow}>
              <Text style={styles.pageHeader}>Assign Seats</Text>
              <View style={[styles.sessionPill, isLockedIn && styles.sessionPillLocked]}>
                <Text style={[styles.sessionPillText, isLockedIn && styles.sessionPillTextLocked]}>
                  {isLockedIn ? "MONITORING" : `${assignedSeatCount}/5 ASSIGNED`}
                </Text>
              </View>
            </View>
            <Text style={styles.pageSubhead}>{isLockedIn ? "Monitoring is active. End monitoring before changing seats." : "Choose a seat, then select who is sitting there."}</Text>
          </View>

          <ImageBackground
            source={require("../../../../assets/images/appImgs/car-cropped.png")}
            style={styles.carMap}
            imageStyle={styles.carImage}
          >
            <View style={styles.frontRow}>
              {SEATS.slice(0, 2).map((seat) => (
                <AssignCard
                  key={seat.seatNo}
                  seatNo={seat.seatNo}
                  assignedProfile={getDisplayProfile(assignments[seat.seatNo])}
                  pfp={assignments[seat.seatNo]?.icon || assignments[seat.seatNo]?.pfp || assignments[seat.seatNo]?.photoURL}
                  onPress={() => handleCardPress(seat.seatNo)}
                  state={getCardState(seat.seatNo)}
                  seatCode={seat.seatCode}
                  locked={isLockedIn}
                  hardwareLinked={seat.seatNo === hardwareSeatNo}
                />
              ))}
            </View>

            <View style={styles.backRow}>
              {SEATS.slice(2).map((seat) => (
                <AssignCard
                  key={seat.seatNo}
                  seatNo={seat.seatNo}
                  assignedProfile={getDisplayProfile(assignments[seat.seatNo])}
                  pfp={assignments[seat.seatNo]?.icon || assignments[seat.seatNo]?.pfp || assignments[seat.seatNo]?.photoURL}
                  onPress={() => handleCardPress(seat.seatNo)}
                  state={getCardState(seat.seatNo)}
                  seatCode={seat.seatCode}
                  locked={isLockedIn}
                  hardwareLinked={seat.seatNo === hardwareSeatNo}
                />
              ))}
            </View>
          </ImageBackground>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose the seat linked to the SafeSeat sensor"
            onPress={chooseHardwareSeat}
            style={({ pressed }) => [styles.hardwareLinkCard, pressed && !isLockedIn && styles.hardwareLinkPressed]}
          >
            <View style={styles.sensorMark}>
              <View
                style={[
                  styles.sensorDot,
                  { backgroundColor: hubConnected ? themes.primaryBttn : themes.textMuted },
                ]}
              />
            </View>
            <View style={styles.hardwareLinkCopy}>
              <Text style={styles.hardwareLinkEyebrow}>SAFESEAT SENSOR</Text>
              <Text style={styles.hardwareLinkTitle}>{getSeatLabel(hardwareSeatNo)}</Text>
              <Text style={styles.hardwareLinkText}>
                {hubConnected ? (telemetryReady ? "Connected and ready" : "Connecting to Main Hub") : "Main Hub offline"}
              </Text>
            </View>
            <View style={[styles.changePill, isLockedIn && styles.changePillLocked]}>
              <Text style={[styles.changePillText, isLockedIn && styles.changePillTextLocked]}>
                {isLockedIn ? "LINKED" : "CHANGE"}
              </Text>
            </View>
          </Pressable>

          <AssignSeatModal
            seat={selectedSeat}
            visible={assignModalVisible}
            onClose={() => setAssignModalVisible(false)}
            onSuccess={handleSeatAssigned}
          />
        </View>
      </ScrollView>

      <View style={[styles.stickyActionWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.stickyActionInner}>
          <View style={styles.stickyStatusRow}>
            <View style={[styles.stickyStatusDot, { backgroundColor: isLockedIn ? themes.primaryBttn : hasAssignedSeats ? themes.primaryBttn : themes.textMuted }]} />
            <Text style={styles.stickyActionTitle}>
              {isLockedIn
                ? `${assignedSeatCount} seat${assignedSeatCount === 1 ? "" : "s"} currently monitored`
                : hasAssignedSeats
                  ? `${assignedSeatCount} seat${assignedSeatCount === 1 ? "" : "s"} ready`
                  : "Choose at least one seat above"}
            </Text>
          </View>
          {isLockedIn ? (
            <Button label="End Monitoring" onPress={handleEndSession} variant="secondary" fullWidth style={styles.stickyButton} />
          ) : (
            <Button
              label="Start Monitoring"
              onPress={() => void handleLockIn()}
              variant="primary"
              enabled={hasAssignedSeats}
              fullWidth
              style={styles.stickyButton}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themes.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.one,
  },
  container: {
    flex: 1,
    width: "100%",
    paddingHorizontal: spacing.two,
    gap: spacing.two,
  },
  headerBlock: {
    gap: spacing.half,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.one,
  },
  eyebrow: {
    color: themes.primaryBttn,
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "Body-Bold",
  },
  pageHeader: {
    fontSize: 30,
    fontFamily: "Logo-Font",
    color: themes.text,
  },
  pageSubhead: {
    color: themes.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Body-Regular",
  },
  sessionPill: {
    paddingHorizontal: spacing.one,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  sessionPillLocked: {
    backgroundColor: themes.primarySoft,
    borderColor: themes.primaryBorder,
  },
  sessionPillText: {
    color: themes.textMuted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontFamily: "Body-Bold",
  },
  sessionPillTextLocked: {
    color: themes.primaryBttn,
  },
  hardwareLinkCard: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one + 2,
    paddingHorizontal: spacing.one + 4,
    paddingVertical: spacing.one + 2,
    borderRadius: 20,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  hardwareLinkPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
    borderColor: themes.primaryBorder,
  },
  sensorMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  sensorDot: { width: 11, height: 11, borderRadius: 6 },
  hardwareLinkCopy: { flex: 1, minWidth: 0 },
  hardwareLinkEyebrow: { color: themes.textMuted, fontSize: 8, letterSpacing: 0.9, fontFamily: "Body-Bold" },
  hardwareLinkTitle: { color: themes.text, fontSize: 14, marginTop: 2, fontFamily: "Body-Bold" },
  hardwareLinkText: { color: themes.textSecondary, fontSize: 10, marginTop: 2, fontFamily: "Body-Regular" },
  changePill: {
    paddingHorizontal: spacing.one + 2,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: themes.primarySoft,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
  },
  changePillLocked: { backgroundColor: themes.surfaceSoft, borderColor: themes.divider },
  changePillText: { color: themes.primaryBttn, fontSize: 8.5, letterSpacing: 0.6, fontFamily: "Body-Bold" },
  changePillTextLocked: { color: themes.textMuted },
  carMap: {
    height: 350,
    marginTop: 0,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: "rgba(117,184,255,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  carImage: {
    opacity: 1,
    resizeMode: "cover",
  },
  frontRow: {
    gap: spacing.two,
    flexDirection: "row",
    height: 94,
    marginTop: 66,
    paddingHorizontal: 58,
  },
  backRow: {
    gap: spacing.one,
    flexDirection: "row",
    height: 94,
    paddingHorizontal: 30,
    marginTop: 30,
  },
  stickyActionWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.two,
    paddingTop: 10,
    backgroundColor: "rgba(11,18,32,0.97)",
    borderTopWidth: 1,
    borderTopColor: "rgba(38,54,76,0.75)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  stickyActionInner: {
    gap: 8,
    paddingTop: 2,
  },
  stickyStatusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  stickyStatusDot: { width: 7, height: 7, borderRadius: 4 },
  stickyActionTitle: { color: themes.textSecondary, fontSize: 10.5, fontFamily: "Body-Medium" },
  stickyButton: { minHeight: 50, borderRadius: 16 },
});

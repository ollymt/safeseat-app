import Button from "@/components/button";
import AssignCard from "@/components/assign-card";
import AssignSeatModal from "@/components/assign-seat-modal";
import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useSafeSeatHub } from "@/hooks/safeseat-hub-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
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
  const insets = useSafeAreaInsets();
  const bottomPad = 88 + insets.bottom;
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
      Alert.alert("Deployment is locked", "End the monitoring session before changing the prototype seat link.");
      return;
    }

    const assigned = SEATS.filter((seat) => Boolean(assignments[seat.seatNo]));
    if (assigned.length === 0) {
      Alert.alert("Assign an occupant first", "The physical SafeSeat prototype can only be linked to an assigned seat.");
      return;
    }

    const currentIndex = assigned.findIndex((seat) => seat.seatNo === hardwareSeatNo);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % assigned.length;
    void persistHardwareSeat(assigned[nextIndex].seatNo);
    void Haptics.selectionAsync();
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
    } catch (error) {
      console.error("Failed to lock deployment:", error);
      Alert.alert("Could not start session", "SafeSeat could not save the locked deployment state.");
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
        "Deployment is locked",
        "End the current monitoring session before changing seat assignments.",
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
            <Text style={styles.pageHeader}>Assign</Text>
            <Text style={styles.pageSubhead}>
              Keep the seat map you know: tap a seat, assign an occupant, then lock the deployment for the trip.
            </Text>
          </View>

          <View style={styles.sessionSummary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionSummaryTitle}>
                {isLockedIn ? "Deployment locked" : "Deployment editable"}
              </Text>
              <Text style={styles.sessionSummaryText}>
                {assignedSeatCount}/5 seats assigned
                {guestSeatCount > 0 ? ` · ${guestSeatCount} session-only guest${guestSeatCount === 1 ? "" : "s"}` : ""}
              </Text>
            </View>
            <View style={[styles.sessionPill, isLockedIn && styles.sessionPillLocked]}>
              <Text style={[styles.sessionPillText, isLockedIn && styles.sessionPillTextLocked]}>
                {isLockedIn ? "LOCKED" : "EDIT"}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose the seat linked to the SafeSeat Main Hub"
            onPress={chooseHardwareSeat}
            style={({ pressed }) => [styles.hardwareLinkCard, pressed && !isLockedIn && styles.hardwareLinkPressed]}
          >
            <View
              style={[
                styles.hardwareLinkDot,
                { backgroundColor: hubConnected ? themes.primaryBttn : themes.textMuted },
              ]}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.hardwareLinkTitle}>UAT prototype link</Text>
              <Text style={styles.hardwareLinkText}>
                {getSeatLabel(hardwareSeatNo)} · {hubConnected ? (telemetryReady ? "Main Hub live" : "Hub warming up") : "Hub offline"}
              </Text>
              <Text style={styles.hardwareLinkHint}>
                {isLockedIn
                  ? "End the session to change which physical seat is linked."
                  : "Tap to cycle the physical one-seat prototype through the assigned cabin positions."}
              </Text>
            </View>
            <View style={[styles.hardwareLinkPill, hubConnected && styles.hardwareLinkPillLive]}>
              <Text style={[styles.hardwareLinkPillText, hubConnected && styles.hardwareLinkPillTextLive]}>
                {hubConnected ? "LIVE" : "OFFLINE"}
              </Text>
            </View>
          </Pressable>

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

          {!isLockedIn && (
            <View style={styles.guestNote}>
              <View style={styles.guestNoteDot} />
              <Text style={styles.guestNoteText}>
                Unregistered passengers can use Guest on passenger seats. Guest assignment data is removed automatically when the session ends.
              </Text>
            </View>
          )}

          <View style={styles.actionBlock}>
            {isLockedIn ? (
              <Button
                label="End Session"
                onPress={handleEndSession}
                fullWidth
                variant="secondary"
              />
            ) : (
              <>
                <Button
                  label="Lock Deployment"
                  onPress={() => void handleLockIn()}
                  fullWidth
                  variant="primary"
                  enabled={hasAssignedSeats}
                />
                {!hasAssignedSeats && (
                  <Text style={styles.actionHint}>Assign at least one occupant to start a monitoring session.</Text>
                )}
              </>
            )}
          </View>

          <AssignSeatModal
            seat={selectedSeat}
            visible={assignModalVisible}
            onClose={() => setAssignModalVisible(false)}
            onSuccess={handleSeatAssigned}
          />
        </View>
      </ScrollView>
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
  eyebrow: {
    color: themes.primaryBttn,
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "Body-Bold",
  },
  pageHeader: {
    fontSize: fontsize.pageHeader,
    fontFamily: "Logo-Font",
    color: themes.text,
  },
  pageSubhead: {
    color: themes.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Body-Regular",
  },
  sessionSummary: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
    padding: spacing.one + 4,
    borderRadius: 18,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  sessionSummaryTitle: {
    color: themes.text,
    fontSize: 15,
    fontFamily: "Body-Bold",
  },
  sessionSummaryText: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    marginTop: 3,
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
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
    padding: spacing.one + 4,
    borderRadius: 18,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  hardwareLinkPressed: {
    opacity: 0.76,
    borderColor: themes.primaryBorder,
  },
  hardwareLinkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hardwareLinkTitle: {
    color: themes.text,
    fontSize: 14,
    fontFamily: "Body-Bold",
  },
  hardwareLinkText: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    marginTop: 2,
    fontFamily: "Body-Medium",
  },
  hardwareLinkHint: {
    color: themes.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    fontFamily: "Body-Regular",
  },
  hardwareLinkPill: {
    paddingHorizontal: spacing.one,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  hardwareLinkPillLive: {
    backgroundColor: themes.primarySoft,
    borderColor: themes.primaryBorder,
  },
  hardwareLinkPillText: {
    color: themes.textMuted,
    fontSize: 9,
    fontFamily: "Body-Bold",
    letterSpacing: 0.7,
  },
  hardwareLinkPillTextLive: {
    color: themes.primaryBttn,
  },
  carMap: {
    height: 416,
    marginTop: spacing.half,
  },
  carImage: {
    opacity: 0.9,
  },
  frontRow: {
    gap: spacing.three,
    flexDirection: "row",
    height: 128,
    marginTop: spacing.ten,
    paddingHorizontal: spacing.eight,
  },
  backRow: {
    gap: spacing.one,
    flexDirection: "row",
    height: 128,
    paddingHorizontal: spacing.four,
    marginTop: spacing.two,
  },
  guestNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.one,
    padding: spacing.one + 4,
    borderRadius: 16,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  guestNoteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themes.primaryBttn,
    marginTop: 5,
  },
  guestNoteText: {
    flex: 1,
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 18,
    fontFamily: "Body-Regular",
  },
  actionBlock: {
    gap: spacing.one,
    marginTop: spacing.half,
  },
  actionHint: {
    color: themes.textMuted,
    fontSize: fontsize.caption,
    textAlign: "center",
    fontFamily: "Body-Regular",
  },
});

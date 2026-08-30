import Button from "@/components/button";
import AssignCard from "@/components/assign-card";
import AssignSeatModal from "@/components/assign-seat-modal";
import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useUserPreferences } from "@/hooks/user-preferences-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ImageBackground,
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
  const { consent } = useUserPreferences();

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(1);
  const [assignments, setAssignments] = useState<Record<number, Profile>>({});
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [seatStatuses, setSeatStatuses] = useState<Record<number, SeatState>>({});

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
      const [rawAssignments, rawLockedIn, rawStatuses] = await Promise.all([
        AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY),
        AsyncStorage.getItem(IS_LOCKED_IN_KEY),
        AsyncStorage.getItem(SEAT_STATUSES_KEY),
      ]);

      setAssignments(rawAssignments ? JSON.parse(rawAssignments) : {});
      setIsLockedIn(rawLockedIn ? JSON.parse(rawLockedIn) : false);
      setSeatStatuses(rawStatuses ? JSON.parse(rawStatuses) : {});
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
    if (!consent && seatNo !== 1) return "unknown";
    return seatStatuses[seatNo] ?? "unknown";
  };

  const handleLockIn = async () => {
    if (!hasAssignedSeats) return;

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
      setSeatStatuses(initialStatuses);
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
              setSeatStatuses({});
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
    setAssignments((previous) => {
      const updated = { ...previous };
      if (profile) updated[seatNumber] = profile;
      else delete updated[seatNumber];
      return updated;
    });
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

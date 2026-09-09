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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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

export type SeatState =
  | "empty"
  | "assigned"
  | "safe"
  | "warning"
  | "emergency"
  | "unknown"
  | "consent"
  | "declined"
  | "offline"
  | "ready"
  | "monitoring";

type ConsentState = "confirmed" | "declined";

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";
const IS_LOCKED_IN_KEY = "isLockedIn";
const SEAT_STATUSES_KEY = "seatStatuses";
const HARDWARE_SEAT_KEY = "safeSeatHardwareSeatNo";
const SEAT_CONSENTS_KEY = "seatSessionConsents";

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
  const { height: viewportHeight } = useWindowDimensions();
  const compactViewport = viewportHeight < 760;
  const carMapHeight = compactViewport ? 282 : 318;
  const bottomPad = 138 + insets.bottom;
  const { connected: hubConnected, telemetryReady, seatState: hubSeatState, refresh: refreshHub } = useSafeSeatHub();

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(1);
  const [assignments, setAssignments] = useState<Record<number, Profile>>({});
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [hardwareSeatNo, setHardwareSeatNo] = useState<number | null>(null);
  const [consents, setConsents] = useState<Record<number, ConsentState>>({});
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [consentSeatNo, setConsentSeatNo] = useState<number | null>(null);

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
      const [rawAssignments, rawLockedIn, rawHardwareSeat, rawConsents] = await Promise.all([
        AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY),
        AsyncStorage.getItem(IS_LOCKED_IN_KEY),
        AsyncStorage.getItem(HARDWARE_SEAT_KEY),
        AsyncStorage.getItem(SEAT_CONSENTS_KEY),
      ]);

      const parsedAssignments: Record<number, Profile> = rawAssignments ? JSON.parse(rawAssignments) : {};
      const parsedHardwareSeat = rawHardwareSeat ? Number(JSON.parse(rawHardwareSeat)) : null;
      const fallbackHardwareSeat = Number(Object.keys(parsedAssignments)[0]) || null;

      setAssignments(parsedAssignments);
      setConsents(rawConsents ? JSON.parse(rawConsents) : {});
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

    const consent = consents[seatNo];
    if (consent === "declined") return "declined";
    if (consent !== "confirmed") return "consent";

    // This UAT build has one physical SafeSeat sensor assembly. Assigned
    // conceptual seats that are not linked must never look like they are
    // actively being analyzed.
    if (seatNo !== hardwareSeatNo) return "offline";
    if (!hubConnected || !telemetryReady) return "offline";

    return isLockedIn ? "monitoring" : "ready";
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

  const persistConsents = async (next: Record<number, ConsentState>) => {
    setConsents(next);
    if (Object.keys(next).length > 0) {
      await AsyncStorage.setItem(SEAT_CONSENTS_KEY, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(SEAT_CONSENTS_KEY);
    }
  };

  const openConsentForSeat = (seatNo: number) => {
    if (!assignments[seatNo]) return;
    setConsentSeatNo(seatNo);
    setConsentModalVisible(true);
  };

  const setSeatConsent = async (seatNo: number, value: ConsentState | null) => {
    const next = { ...consents };
    if (value) next[seatNo] = value;
    else delete next[seatNo];
    await persistConsents(next);
    void Haptics.notificationAsync(
      value === "confirmed"
        ? Haptics.NotificationFeedbackType.Success
        : value === "declined"
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
    );
    setConsentModalVisible(false);
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

    if (!linkedSeat) return;

    if (consents[linkedSeat] !== "confirmed") {
      openConsentForSeat(linkedSeat);
      return;
    }

    // Re-check the hub at the exact moment monitoring starts so a stale
    // green UI state cannot accidentally launch an ANALYZING session.
    const liveStatus = await refreshHub();
    if (!liveStatus || !liveStatus.telemetry_ready) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "SafeSeat is offline",
        "SafeSeat must be connected and ready before monitoring can start.",
        [{ text: "OK" }],
      );
      return;
    }

    const initialStatuses: Record<number, SeatState> = {};
    Object.keys(assignments).forEach((seatStr) => {
      const seatNum = Number(seatStr);
      if (consents[seatNum] === "declined") initialStatuses[seatNum] = "declined";
      else if (consents[seatNum] !== "confirmed") initialStatuses[seatNum] = "consent";
      else if (seatNum === linkedSeat) initialStatuses[seatNum] = "unknown";
      else initialStatuses[seatNum] = "offline";
    });

    try {
      await Promise.all([
        AsyncStorage.setItem(IS_LOCKED_IN_KEY, JSON.stringify(true)),
        AsyncStorage.setItem(SEAT_STATUSES_KEY, JSON.stringify(initialStatuses)),
      ]);
      setIsLockedIn(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
                AsyncStorage.removeItem(SEAT_CONSENTS_KEY),
              ]);

              setIsLockedIn(false);
              setAssignments(persistentAssignments);
              setConsents({});
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
    const previousProfile = assignments[seatNumber];
    const updated = { ...assignments };
    if (profile) updated[seatNumber] = profile;
    else delete updated[seatNumber];
    setAssignments(updated);

    if (!profile || previousProfile?.id !== profile.id) {
      const nextConsents = { ...consents };
      delete nextConsents[seatNumber];
      void persistConsents(nextConsents);
    }

    if (profile && hardwareSeatNo === null) {
      void persistHardwareSeat(seatNumber);
    } else if (!profile && hardwareSeatNo === seatNumber) {
      const nextSeat = Number(Object.keys(updated)[0]) || null;
      void persistHardwareSeat(nextSeat);
    }

    if (profile) {
      setConsentSeatNo(seatNumber);
      setTimeout(() => setConsentModalVisible(true), 180);
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

    if (assignments[seatNo]) {
      openConsentForSeat(seatNo);
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

  const linkedSeatConsent = hardwareSeatNo ? consents[hardwareSeatNo] : undefined;
  const startReadiness = !hasAssignedSeats
    ? "empty"
    : !hardwareSeatNo || !assignments[hardwareSeatNo]
      ? "offline"
      : linkedSeatConsent !== "confirmed"
        ? "consent"
        : !hubConnected || !telemetryReady
          ? "offline"
          : "ready";

  const linkedSeatLabel = getSeatLabel(hardwareSeatNo);
  const linkedProfileName = hardwareSeatNo ? getDisplayProfile(assignments[hardwareSeatNo])?.name : undefined;

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
            style={[styles.carMap, { height: carMapHeight }]}
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
                {hubConnected ? (telemetryReady ? "Connected and ready" : "Connecting") : "Offline"}
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

          <Modal
            visible={consentModalVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setConsentModalVisible(false)}
          >
            <View style={styles.consentBackdrop}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setConsentModalVisible(false)}
                accessibilityLabel="Close consent dialog"
              />
              <View style={styles.consentCard}>
                <View style={styles.consentHandle} />
                <Text style={styles.consentEyebrow}>MONITORING CONSENT</Text>
                <Text style={styles.consentTitle}>Has {consentSeatNo ? getDisplayProfile(assignments[consentSeatNo])?.name ?? "this person" : "this person"} agreed?</Text>
                <Text style={styles.consentText}>Confirm whether they agreed to SafeSeat monitoring for this trip.</Text>

                <Button
                  label="Confirm Consent"
                  variant="primary"
                  fullWidth
                  onPress={() => consentSeatNo && void setSeatConsent(consentSeatNo, "confirmed")}
                />
                <Button
                  label="Not Yet"
                  variant="secondary"
                  fullWidth
                  onPress={() => consentSeatNo && void setSeatConsent(consentSeatNo, null)}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => consentSeatNo && void setSeatConsent(consentSeatNo, "declined")}
                  style={({ pressed }) => [styles.declineButton, pressed && styles.consentPressed]}
                >
                  <Text style={styles.declineButtonText}>Declined</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (!consentSeatNo) return;
                    const seatNo = consentSeatNo;
                    setConsentModalVisible(false);
                    setSelectedSeat(seatNo);
                    setTimeout(() => setAssignModalVisible(true), 180);
                  }}
                  style={({ pressed }) => [styles.changePersonButton, pressed && styles.consentPressed]}
                >
                  <Text style={styles.changePersonText}>Change Person</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>

      <View style={[styles.stickyActionWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.stickyActionInner}>
          <View style={styles.stickyStatusRow}>
            <View style={[styles.stickyStatusDot, { backgroundColor: isLockedIn ? themes.primaryBttn : hasAssignedSeats ? themes.primaryBttn : themes.textMuted }]} />
            <Text style={styles.stickyActionTitle}>
              {isLockedIn
                ? `${linkedSeatLabel} is monitoring`
                : startReadiness === "ready"
                  ? `${linkedSeatLabel} is ready`
                  : startReadiness === "consent"
                    ? `${linkedProfileName ?? linkedSeatLabel} needs consent`
                    : startReadiness === "offline"
                      ? "SafeSeat is offline"
                      : "Choose at least one seat above"}
            </Text>
          </View>
          {isLockedIn ? (
            <Button label="End Monitoring" onPress={handleEndSession} variant="secondary" fullWidth style={styles.stickyButton} />
          ) : startReadiness === "consent" ? (
            <Button
              label="Review Consent"
              onPress={() => hardwareSeatNo && openConsentForSeat(hardwareSeatNo)}
              variant="primary"
              enabled={Boolean(hardwareSeatNo)}
              fullWidth
              style={styles.stickyButton}
            />
          ) : (
            <Button
              label={startReadiness === "ready" ? "Start Monitoring" : startReadiness === "offline" ? "Offline" : "Assign a Person"}
              onPress={() => void handleLockIn()}
              variant="primary"
              enabled={startReadiness === "ready"}
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
    gap: spacing.one + 4,
  },
  headerBlock: {
    gap: 3,
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
    fontSize: 27,
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
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one + 2,
    paddingHorizontal: spacing.one + 4,
    paddingVertical: spacing.one,
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
    minHeight: 270,
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
    position: "absolute",
    top: "19%",
    left: 52,
    right: 52,
    gap: spacing.one + 4,
    flexDirection: "row",
    height: "29%",
  },
  backRow: {
    position: "absolute",
    top: "59%",
    left: 26,
    right: 26,
    gap: spacing.one,
    flexDirection: "row",
    height: "28%",
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
  consentBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,7,13,0.72)",
    padding: spacing.two,
  },
  consentCard: {
    borderRadius: 28,
    backgroundColor: "#101D2B",
    borderWidth: 1,
    borderColor: themes.divider,
    padding: spacing.two,
    gap: spacing.one,
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  consentHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: themes.divider,
    marginBottom: 4,
  },
  consentEyebrow: { color: themes.primaryBttn, fontSize: 9.5, letterSpacing: 1.15, fontFamily: "Body-Bold" },
  consentTitle: { color: themes.text, fontSize: 22, lineHeight: 27, fontFamily: "Body-Bold" },
  consentText: { color: themes.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: "Body-Regular", marginBottom: 3 },
  declineButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${themes.warnBttn}88`,
    backgroundColor: `${themes.warnBttn}0F`,
    alignItems: "center",
    justifyContent: "center",
  },
  declineButtonText: { color: themes.warnBttn, fontSize: 13, fontFamily: "Body-Bold" },
  changePersonButton: { alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  changePersonText: { color: themes.textSecondary, fontSize: 12, fontFamily: "Body-Bold" },
  consentPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});

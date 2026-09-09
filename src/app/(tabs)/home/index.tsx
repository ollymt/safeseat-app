import Button from "@/components/button";
import EmergencyModal from "@/components/emergency-modal";
import SeatCard from "@/components/seat-card";
import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useSafeSeatHub } from "@/hooks/safeseat-hub-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, Icon } from "@expo/ui";
import { LinearGradient } from "expo-linear-gradient";

import checkXml from "@expo/material-symbols/check.xml";
import warningXml from "@expo/material-symbols/warning.xml";
import sirenXml from "@expo/material-symbols/siren.xml";
import circleXml from "@expo/material-symbols/circle.xml";
import lockOpenXml from "@expo/material-symbols/lock_open.xml";

export type SeatState = "empty" | "assigned" | "safe" | "warning" | "emergency" | "unknown";

type Profile = {
  id: string;
  name: string;
  photoURL?: string;
  icon?: string;
  isAccountOwner?: boolean;
  isGuest?: boolean;
  sessionOnly?: boolean;
};

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";
const IS_LOCKED_IN_KEY = "isLockedIn";
const HARDWARE_SEAT_KEY = "safeSeatHardwareSeatNo";

const SEAT_ROLES: Record<number, string> = {
  1: "Driver",
  2: "Front Passenger",
  3: "Rear Left",
  4: "Rear Center",
  5: "Rear Right",
};

const SEAT_NUMBERS = [1, 2, 3, 4, 5];

const STATUS_COPY = {
  safe: {
    label: "SAFE",
    headline: "No unusual signs detected",
    detail: "Monitoring continues automatically.",
    color: themes.green,
  },
  warning: {
    label: "WARNING",
    headline: "SafeSeat detected something unusual",
    detail: "Check on the passenger.",
    color: themes.lightOrange,
  },
  emergency: {
    label: "EMERGENCY",
    headline: "Passenger may need immediate help",
    detail: "Check the passenger and follow emergency guidance.",
    color: themes.warnBttn,
  },
  unknown: {
    label: "ANALYZING",
    headline: "SafeSeat is still checking",
    detail: "",
    color: themes.info,
  },
} as const;

type OverallState = keyof typeof STATUS_COPY;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = 88 + insets.bottom;
  const { connected: hubConnected, telemetryReady, seatState: hubSeatState } = useSafeSeatHub();

  const [isLockedIn, setIsLockedIn] = useState(false);
  const [assignments, setAssignments] = useState<Record<number, Profile>>({});
  const [hardwareSeatNo, setHardwareSeatNo] = useState<number | null>(null);
  const [dismissedSeats, setDismissedSeats] = useState<Set<number>>(new Set());

  // Home motion is intentionally subtle: it communicates that monitoring is live
  // without creating distracting movement for a driver.
  const heroEntrance = useRef(new Animated.Value(0)).current;
  const ambientPulse = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(0)).current;
  const passengerEntrance = useRef(SEAT_NUMBERS.map(() => new Animated.Value(0))).current;

  const loadData = useCallback(async () => {
    try {
      const [rawLockedIn, rawAssignments, rawHardwareSeat] = await Promise.all([
        AsyncStorage.getItem(IS_LOCKED_IN_KEY),
        AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY),
        AsyncStorage.getItem(HARDWARE_SEAT_KEY),
      ]);

      const parsedAssignments: Record<number, Profile> = rawAssignments ? JSON.parse(rawAssignments) : {};
      const parsedHardwareSeat = rawHardwareSeat ? Number(JSON.parse(rawHardwareSeat)) : null;
      setIsLockedIn(rawLockedIn ? JSON.parse(rawLockedIn) : false);
      setAssignments(parsedAssignments);
      setHardwareSeatNo(
        parsedHardwareSeat && parsedAssignments[parsedHardwareSeat]
          ? parsedHardwareSeat
          : (Number(Object.keys(parsedAssignments)[0]) || null),
      );
    } catch (error) {
      console.error("Failed to load home state from device:", error);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  useEffect(() => {
    const ambientLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientPulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ambientPulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    ambientLoop.start();
    return () => ambientLoop.stop();
  }, [ambientPulse]);

  useEffect(() => {
    const liveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    if (isLockedIn && hubConnected) liveLoop.start();
    return () => liveLoop.stop();
  }, [hubConnected, isLockedIn, livePulse]);

  useEffect(() => {
    const assigned = SEAT_NUMBERS.filter((seatNo) => Boolean(assignments[seatNo]));
    passengerEntrance.forEach((value) => value.setValue(0));
    if (!isLockedIn || assigned.length === 0) return;

    Animated.stagger(80, assigned.map((seatNo) =>
      Animated.spring(passengerEntrance[seatNo - 1], {
        toValue: 1,
        damping: 18,
        stiffness: 155,
        mass: 0.75,
        useNativeDriver: true,
      })
    )).start();
  }, [assignments, isLockedIn, passengerEntrance]);

  const getSeatState = useCallback((seatNo: number): SeatState => {
    const profile = assignments[seatNo];
    if (!profile) return "empty";
    if (!isLockedIn) return "assigned";

    if (seatNo === hardwareSeatNo) {
      return hubConnected && telemetryReady ? hubSeatState : "unknown";
    }

    // The current UAT prototype represents one physical seat. Do not mirror
    // one Main Hub's Fusion result across conceptual cabin positions.
    return "unknown";
  }, [assignments, hardwareSeatNo, hubConnected, hubSeatState, isLockedIn, telemetryReady]);

  const getDisplayName = (profile?: Profile): string | undefined => {
    if (!profile) return undefined;
    if (profile.isGuest || profile.sessionOnly) return "Guest";
    return profile.isAccountOwner ? "Me" : profile.name;
  };

  const assignedSeatCount = SEAT_NUMBERS.filter((seatNo) => Boolean(assignments[seatNo])).length;

  const overallState = useMemo<OverallState>(() => {
    if (!isLockedIn || assignedSeatCount === 0) return "unknown";
    const activeStates = SEAT_NUMBERS
      .filter((seatNo) => Boolean(assignments[seatNo]))
      .map((seatNo) => getSeatState(seatNo));

    if (activeStates.includes("emergency")) return "emergency";
    if (activeStates.includes("warning")) return "warning";
    if (activeStates.includes("safe")) return "safe";
    return "unknown";
  }, [assignedSeatCount, assignments, getSeatState, isLockedIn]);

  useEffect(() => {
    heroEntrance.setValue(0);
    Animated.spring(heroEntrance, {
      toValue: 1,
      damping: 17,
      stiffness: 145,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [heroEntrance, isLockedIn, overallState]);

  const overallSeatNo = useMemo(() => {
    if (overallState === "safe") return hardwareSeatNo ?? undefined;
    return SEAT_NUMBERS.find((seatNo) => Boolean(assignments[seatNo]) && getSeatState(seatNo) === overallState);
  }, [assignments, getSeatState, hardwareSeatNo, overallState]);

  const copy = STATUS_COPY[overallState];
  const overallIcon = overallState === "safe"
    ? Icon.select({ ios: "checkmark.circle.fill", android: checkXml })
    : overallState === "warning"
      ? Icon.select({ ios: "exclamationmark.triangle.fill", android: warningXml })
      : overallState === "emergency"
        ? Icon.select({ ios: "light.beacon.max.fill", android: sirenXml })
        : Icon.select({ ios: "circle.dotted", android: circleXml });

  const getProfilePhoto = (profile?: Profile): string | undefined =>
    profile?.icon || profile?.photoURL;

  const showSeatDetails = (seatNo: number) => {
    const profile = assignments[seatNo];
    if (!profile) return;

    const state = getSeatState(seatNo);
    const stateCopy = state === "safe" || state === "warning" || state === "emergency" || state === "unknown"
      ? STATUS_COPY[state]
      : STATUS_COPY.unknown;
    const person = getDisplayName(profile);
    const message = [
      person,
      stateCopy.headline,
      stateCopy.detail || undefined,
    ].filter(Boolean).join("\n\n");

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(`${SEAT_ROLES[seatNo]} · ${stateCopy.label}`, message);
  };

  const emergencySeatNo = isLockedIn
    ? SEAT_NUMBERS.find(
        (seatNo) => getSeatState(seatNo) === "emergency" && assignments[seatNo] && !dismissedSeats.has(seatNo),
      )
    : undefined;
  const emergencyProfile = emergencySeatNo !== undefined ? assignments[emergencySeatNo] : undefined;

  useEffect(() => {
    if (!hardwareSeatNo || hubSeatState === "emergency") return;
    setDismissedSeats((previous) => {
      if (!previous.has(hardwareSeatNo)) return previous;
      const next = new Set(previous);
      next.delete(hardwareSeatNo);
      return next;
    });
  }, [hardwareSeatNo, hubSeatState]);

  const heroTranslateY = heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const heroScale = heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
  const auraScale = ambientPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });
  const auraOpacity = ambientPulse.interpolate({ inputRange: [0, 1], outputRange: [0.055, 0.13] });
  const ringScale = ambientPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.16] });
  const ringOpacity = ambientPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.05] });
  const liveRingScale = livePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] });
  const liveRingOpacity = livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundArt}>
        <Animated.View style={[styles.backgroundGlowTop, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]} />
        <View style={styles.backgroundGlowBottom} />
      </View>
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.eyebrow}>{isLockedIn ? "LIVE TRIP" : "SAFESEAT"}</Text>
                <Text style={styles.pageHeader}>Home</Text>
              </View>
              {isLockedIn ? (
                <View style={[styles.liveBadge, !hubConnected && styles.liveBadgeOffline]}>
                  <View style={styles.liveDotWrap}>
                    {hubConnected ? (
                      <Animated.View style={[styles.livePulseRing, { opacity: liveRingOpacity, transform: [{ scale: liveRingScale }] }]} />
                    ) : null}
                    <View style={[styles.liveDot, !hubConnected && styles.liveDotOffline]} />
                  </View>
                  <Text style={[styles.liveText, !hubConnected && styles.liveTextOffline]}>
                    {hubConnected ? (telemetryReady ? "LIVE" : "CONNECTING") : "OFFLINE"}
                  </Text>
                </View>
              ) : null}
            </View>

            {isLockedIn ? (
              <>
                <Animated.View style={{ opacity: heroEntrance, transform: [{ translateY: heroTranslateY }, { scale: heroScale }] }}>
                <LinearGradient
                  colors={["#12283A", "#0F2130", themes.backgroundElement]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.overallCard, { borderColor: `${copy.color}55` }]}
                >
                  <View style={styles.brandEdge} />
                  <Animated.View style={[styles.statusGlow, { backgroundColor: copy.color, opacity: auraOpacity, transform: [{ scale: auraScale }] }]} />
                  <View style={styles.brandGlow} />

                  <View style={styles.heroTopRow}>
                    <View style={styles.heroSignal}>
                      <View style={[styles.heroSignalDot, { backgroundColor: copy.color }]} />
                      <Text style={styles.heroSignalText}>CABIN STATUS</Text>
                    </View>
                    <Text style={styles.heroCount}>
                      {assignedSeatCount} {assignedSeatCount === 1 ? "OCCUPANT" : "OCCUPANTS"}
                    </Text>
                  </View>

                  <View style={styles.heroMainRow}>
                    <View style={[styles.overallIcon, { borderColor: `${copy.color}88`, backgroundColor: `${copy.color}13` }]}>
                      <Animated.View style={[styles.iconPulseRing, { borderColor: copy.color, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
                      <Host matchContents>
                        <Icon name={overallIcon} color={copy.color} size={38} />
                      </Host>
                    </View>
                    <View style={styles.heroCopy}>
                      <Text style={[styles.overallLabel, { color: copy.color }]}>{copy.label}</Text>
                      <Text style={styles.overallHeadline}>{copy.headline}</Text>
                    </View>
                  </View>

                  <View style={styles.heroFooter}>
                    {copy.detail ? <Text style={styles.overallDetail}>{copy.detail}</Text> : <Text style={styles.overallDetail}>Monitoring continues while SafeSeat analyzes the available sensors.</Text>}
                    {overallSeatNo && overallState !== "safe" ? (
                      <View style={[styles.seatFocusPill, { borderColor: `${copy.color}55` }]}>
                        <View style={[styles.seatFocusDot, { backgroundColor: copy.color }]} />
                        <Text style={styles.seatFocusText}>{SEAT_ROLES[overallSeatNo]}</Text>
                      </View>
                    ) : null}
                  </View>
                </LinearGradient>
                </Animated.View>

                <View style={styles.section}>
                  <View style={styles.sectionHeadingRow}>
                    <View>
                      <Text style={styles.sectionHeader}>Passengers</Text>
                      <Text style={styles.sectionSubhead}>Tap a passenger for details</Text>
                    </View>
                    <View style={styles.sectionCountPill}>
                      <Text style={styles.sectionCountText}>{assignedSeatCount}</Text>
                    </View>
                  </View>

                  {SEAT_NUMBERS.filter((seatNo) => Boolean(assignments[seatNo])).map((seatNo) => {
                    const entry = passengerEntrance[seatNo - 1];
                    const entryY = entry.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
                    return (
                      <Animated.View key={seatNo} style={{ opacity: entry, transform: [{ translateY: entryY }] }}>
                        <SeatCard
                          seatNo={seatNo}
                          role={SEAT_ROLES[seatNo]}
                          name={getDisplayName(assignments[seatNo])}
                          photo={getProfilePhoto(assignments[seatNo])}
                          state={getSeatState(seatNo)}
                          onPress={() => showSeatDetails(seatNo)}
                        />
                      </Animated.View>
                    );
                  })}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View seats and passengers"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/assign");
                  }}
                  style={({ pressed }) => [styles.manageSeatsCard, pressed && styles.manageSeatsPressed]}
                >
                  <View style={styles.manageSeatsIcon}>
                    <Host matchContents>
                      <Icon name={Icon.select({ ios: "carseat.right.fill", android: lockOpenXml })} size={25} color={themes.primaryBttn} />
                    </Host>
                  </View>
                  <View style={styles.manageSeatsCopy}>
                    <Text style={styles.manageSeatsTitle}>Seats & passengers</Text>
                    <Text style={styles.manageSeatsText}>View the cabin setup or end monitoring</Text>
                  </View>
                  <Text style={styles.manageSeatsChevron}>›</Text>
                </Pressable>
              </>
            ) : (
              <Animated.View style={{ opacity: heroEntrance, transform: [{ translateY: heroTranslateY }, { scale: heroScale }] }}>
              <LinearGradient
                colors={["rgba(52,209,127,0.18)", "#102638", themes.backgroundElement]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.setupHero}
              >
                <Animated.View style={[styles.setupGlow, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]} />
                <View style={styles.setupIconWrap}>
                  <Host matchContents>
                    <Icon name={Icon.select({ ios: "carseat.right.fill", android: lockOpenXml })} size={58} color={themes.primaryBttn} />
                  </Host>
                </View>
                <Text style={styles.setupEyebrow}>READY FOR A TRIP?</Text>
                <Text style={styles.setupTitle}>Set up who is riding</Text>
                <Text style={styles.setupSubtitle}>Choose the occupied seats, then start SafeSeat monitoring.</Text>

                <View style={styles.cabinDots} accessibilityElementsHidden>
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <View key={dot} style={[styles.cabinDot, dot <= 2 && styles.cabinDotFront]} />
                  ))}
                </View>

                <View style={styles.setupAction}>
                  <Button label="Set Up Seats" onPress={() => router.push("/assign")} fullWidth />
                </View>
              </LinearGradient>
              </Animated.View>
            )}
          </View>
        </ScrollView>

        {emergencySeatNo !== undefined && emergencyProfile ? (
          <EmergencyModal
            seat={emergencySeatNo}
            visible
            onClose={() => setDismissedSeats((prev) => new Set(prev).add(emergencySeatNo))}
            id={emergencyProfile.id}
            name={emergencyProfile.isAccountOwner ? "You" : emergencyProfile.name}
            icon={emergencyProfile.photoURL ?? emergencyProfile.icon}
            isAccountOwner={emergencyProfile.isAccountOwner}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: themes.background, position: "relative", overflow: "hidden" },
  backgroundArt: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  backgroundGlowTop: { position: "absolute", width: 330, height: 330, borderRadius: 165, backgroundColor: themes.primaryBttn, top: -190, right: -150 },
  backgroundGlowBottom: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "#163A4C", opacity: 0.12, bottom: 40, left: -180 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { flexGrow: 1, paddingTop: spacing.one },
  container: { flex: 1, width: "100%", paddingHorizontal: spacing.two, gap: spacing.two },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: themes.primaryBttn, fontSize: 10, letterSpacing: 1.4, fontFamily: "Body-Bold" },
  pageHeader: { fontSize: fontsize.pageHeader, fontFamily: "Logo-Font", color: themes.text, marginTop: 1 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.half,
    paddingHorizontal: spacing.one + 3,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: themes.primarySoft,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
    shadowColor: themes.primaryBttn,
    shadowOpacity: 0.13,
    shadowRadius: 8,
  },
  liveBadgeOffline: { backgroundColor: themes.surfaceSoft, borderColor: themes.divider, shadowOpacity: 0 },
  liveDotWrap: { width: 10, height: 10, alignItems: "center", justifyContent: "center" },
  livePulseRing: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: themes.primaryBttn },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: themes.primaryBttn },
  liveDotOffline: { backgroundColor: themes.textMuted },
  liveText: { color: themes.primaryBttn, fontSize: 9, letterSpacing: 0.7, fontFamily: "Body-Bold" },
  liveTextOffline: { color: themes.textMuted },

  overallCard: {
    position: "relative",
    overflow: "hidden",
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.two,
    borderRadius: 28,
    borderWidth: 1.2,
    shadowColor: themes.primaryBttn,
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  brandEdge: { position: "absolute", left: 0, top: 30, bottom: 30, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: themes.primaryBttn, opacity: 0.9 },
  brandGlow: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: themes.primaryBttn, opacity: 0.045, bottom: -115, left: -45 },
  statusGlow: { position: "absolute", width: 250, height: 250, borderRadius: 125, top: -155, right: -72 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.two },
  heroSignal: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroSignalDot: { width: 7, height: 7, borderRadius: 4 },
  heroSignalText: { color: themes.textSecondary, fontSize: 8.5, letterSpacing: 1, fontFamily: "Body-Bold" },
  heroCount: { color: themes.textMuted, fontSize: 8.5, letterSpacing: 0.75, fontFamily: "Body-Bold" },
  heroMainRow: { flexDirection: "row", alignItems: "center", gap: spacing.one + 4 },
  overallIcon: { width: 68, height: 68, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1.2, position: "relative", shadowColor: themes.primaryBttn, shadowOpacity: 0.1, shadowRadius: 12 },
  iconPulseRing: { position: "absolute", width: 58, height: 58, borderRadius: 21, borderWidth: 1.2 },
  heroCopy: { flex: 1, minWidth: 0 },
  overallLabel: { fontSize: 28, lineHeight: 31, letterSpacing: 1.4, fontFamily: "Body-Bold" },
  overallHeadline: { color: themes.text, fontSize: 16.5, lineHeight: 21, fontFamily: "Body-Bold", marginTop: 4 },
  heroFooter: { marginTop: spacing.two, paddingTop: spacing.one + 2, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", gap: spacing.one },
  overallDetail: { color: themes.textSecondary, fontSize: 11.5, lineHeight: 17, fontFamily: "Body-Regular" },
  seatFocusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.one + 3,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
  },
  seatFocusDot: { width: 6, height: 6, borderRadius: 3 },
  seatFocusText: { color: themes.text, fontSize: 9.5, letterSpacing: 0.35, fontFamily: "Body-Bold" },

  section: { gap: spacing.one },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  sectionHeader: { fontSize: 20, fontFamily: "Heading-Font", color: themes.text },
  sectionSubhead: { color: themes.textMuted, fontSize: 9.5, marginTop: 2, fontFamily: "Body-Regular" },
  sectionCountPill: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  sectionCountText: { color: themes.textSecondary, fontSize: 11, fontFamily: "Body-Bold" },

  manageSeatsCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one + 2,
    paddingHorizontal: spacing.one + 4,
    paddingVertical: spacing.one + 2,
    borderRadius: 20,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  manageSeatsPressed: { opacity: 0.78, transform: [{ scale: 0.99 }], borderColor: themes.primaryBorder },
  manageSeatsIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: themes.primarySoft, borderWidth: 1, borderColor: themes.primaryBorder },
  manageSeatsCopy: { flex: 1, minWidth: 0 },
  manageSeatsTitle: { color: themes.text, fontSize: 13.5, fontFamily: "Body-Bold" },
  manageSeatsText: { color: themes.textSecondary, fontSize: 9.5, marginTop: 3, fontFamily: "Body-Regular" },
  manageSeatsChevron: { color: themes.primaryBttn, fontSize: 28, lineHeight: 28, fontFamily: "Body-Regular" },

  setupHero: {
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    marginTop: spacing.one,
    paddingHorizontal: spacing.three,
    paddingTop: spacing.four,
    paddingBottom: spacing.three,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
    minHeight: 430,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  setupGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: themes.primaryBttn, top: -175, right: -88 },
  setupIconWrap: { width: 96, height: 96, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: themes.primarySoft, borderWidth: 1, borderColor: themes.primaryBorder, marginBottom: spacing.two },
  setupEyebrow: { color: themes.primaryBttn, fontSize: 9, letterSpacing: 1.25, fontFamily: "Body-Bold" },
  setupTitle: { color: themes.text, fontSize: 28, lineHeight: 33, fontFamily: "Body-Bold", textAlign: "center", marginTop: spacing.half },
  setupSubtitle: { color: themes.textSecondary, fontSize: 13.5, lineHeight: 20, fontFamily: "Body-Regular", textAlign: "center", maxWidth: 310, marginTop: spacing.one },
  cabinDots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: spacing.three },
  cabinDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: themes.divider, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  cabinDotFront: { backgroundColor: themes.primarySoft, borderColor: themes.primaryBorder },
  setupAction: { width: "100%", marginTop: spacing.three },
});

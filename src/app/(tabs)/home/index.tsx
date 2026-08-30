import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useUserPreferences } from "@/hooks/user-preferences-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Host, Icon } from "@expo/ui";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import lockOpenXml from "@expo/material-symbols/lock_open.xml";
import shieldXml from "@expo/material-symbols/shield.xml";

import Button from "@/components/button";
import EmergencyModal from "@/components/emergency-modal";
import SeatCard from "@/components/seat-card";

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
const SEAT_STATUSES_KEY = "seatStatuses";

const SEAT_ROLES: Record<number, string> = {
  1: "driver",
  2: "front passenger",
  3: "left rear",
  4: "center rear",
  5: "right rear",
};

const DRIVER_SEAT_NO = 1;
const SEAT_NUMBERS = [1, 2, 3, 4, 5];

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = 88 + insets.bottom;

  const { consent, eventCameraVerification } = useUserPreferences();

  const [isLockedIn, setIsLockedIn] = useState(false);
  const [assignments, setAssignments] = useState<Record<number, Profile>>({});
  const [seatStatuses, setSeatStatuses] = useState<Record<number, SeatState>>({});
  const [dismissedSeats, setDismissedSeats] = useState<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [rawLockedIn, rawAssignments, rawStatuses] = await Promise.all([
        AsyncStorage.getItem(IS_LOCKED_IN_KEY),
        AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY),
        AsyncStorage.getItem(SEAT_STATUSES_KEY),
      ]);

      setIsLockedIn(rawLockedIn ? JSON.parse(rawLockedIn) : false);
      setAssignments(rawAssignments ? JSON.parse(rawAssignments) : {});
      setSeatStatuses(rawStatuses ? JSON.parse(rawStatuses) : {});
    } catch (error) {
      console.error("Failed to load home state from device:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const getSeatState = (seatNo: number): SeatState => {
    const profile = assignments[seatNo];
    if (!profile) return "empty";

    if (!consent && seatNo !== DRIVER_SEAT_NO) {
      return "unknown";
    }

    return seatStatuses[seatNo] ?? "unknown";
  };

  const getDisplayName = (profile?: Profile): string | undefined => {
    if (!profile) return undefined;
    if (profile.isGuest || profile.sessionOnly) return "Guest";
    return profile.isAccountOwner ? "Me" : profile.name;
  };

  const assignedSeatCount = SEAT_NUMBERS.filter((seatNo) => Boolean(assignments[seatNo])).length;

  const stateSummary = useMemo(() => {
    const summary = { safe: 0, warning: 0, emergency: 0, unknown: 0 };
    if (!isLockedIn) return summary;

    SEAT_NUMBERS.forEach((seatNo) => {
      if (!assignments[seatNo]) return;
      const state = getSeatState(seatNo);
      if (state === "safe") summary.safe += 1;
      else if (state === "warning") summary.warning += 1;
      else if (state === "emergency") summary.emergency += 1;
      else summary.unknown += 1;
    });

    return summary;
  }, [assignments, consent, isLockedIn, seatStatuses]);

  const emergencySeatNo = isLockedIn
    ? SEAT_NUMBERS.find(
        (seatNo) =>
          getSeatState(seatNo) === "emergency" &&
          assignments[seatNo] &&
          !dismissedSeats.has(seatNo),
      )
    : undefined;

  const emergencyProfile =
    emergencySeatNo !== undefined ? assignments[emergencySeatNo] : undefined;

  const hasKnownState = stateSummary.safe + stateSummary.warning + stateSummary.emergency > 0;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <View style={styles.container}>
            {isLockedIn ? (
              <>
                <View style={styles.headerBlock}>
                  <Text style={styles.eyebrow}>LIVE CABIN</Text>
                  <Text style={styles.pageHeader}>Home</Text>
                  <Text style={styles.pageSubhead}>
                    A simple, non-diagnostic view of each occupied seat. Raw sensor values stay out of the driver interface.
                  </Text>
                </View>

                <View style={styles.monitoringCard}>
                  <View style={styles.monitoringIcon}>
                    <Host matchContents>
                      <Icon
                        name={Icon.select({
                          ios: "checkmark.shield.fill",
                          android: shieldXml,
                        })}
                        size={spacing.four}
                        color={themes.primaryBttn}
                      />
                    </Host>
                  </View>
                  <View style={styles.monitoringCopy}>
                    <Text style={styles.monitoringTitle}>Deployment locked</Text>
                    <Text style={styles.monitoringSubtitle}>
                      {assignedSeatCount} {assignedSeatCount === 1 ? "occupant" : "occupants"} in this session
                    </Text>
                    <Text style={styles.monitoringHint}>
                      {hasKnownState
                        ? "Safety states update when the monitoring source reports them."
                        : "Waiting for authoritative SafeSeat status."}
                    </Text>
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LOCKED</Text>
                  </View>
                </View>

                <View style={styles.statusStrip}>
                  <View style={styles.statusMetric}>
                    <Text style={[styles.statusMetricValue, { color: themes.green }]}>{stateSummary.safe}</Text>
                    <Text style={styles.statusMetricLabel}>Safe</Text>
                  </View>
                  <View style={styles.statusDivider} />
                  <View style={styles.statusMetric}>
                    <Text style={[styles.statusMetricValue, { color: themes.lightOrange }]}>{stateSummary.warning}</Text>
                    <Text style={styles.statusMetricLabel}>Warning</Text>
                  </View>
                  <View style={styles.statusDivider} />
                  <View style={styles.statusMetric}>
                    <Text style={[styles.statusMetricValue, { color: themes.warnBttn }]}>{stateSummary.emergency}</Text>
                    <Text style={styles.statusMetricLabel}>Emergency</Text>
                  </View>
                  <View style={styles.statusDivider} />
                  <View style={styles.statusMetric}>
                    <Text style={[styles.statusMetricValue, { color: themes.textSecondary }]}>{stateSummary.unknown}</Text>
                    <Text style={styles.statusMetricLabel}>Pending</Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeadingRow}>
                    <Text style={styles.sectionHeader}>Occupant Status</Text>
                    <Text style={styles.sectionMeta}>{assignedSeatCount}/5 assigned</Text>
                  </View>
                  {SEAT_NUMBERS.map((seatNo) => {
                    const profile = assignments[seatNo];
                    return (
                      <SeatCard
                        key={seatNo}
                        seatNo={seatNo}
                        role={SEAT_ROLES[seatNo]}
                        name={getDisplayName(profile)}
                        state={getSeatState(seatNo)}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      />
                    );
                  })}
                </View>

                <View style={styles.privacyCard}>
                  <View style={styles.privacyTopRow}>
                    <View style={styles.privacyDot} />
                    <Text style={styles.privacyTitle}>Privacy by default</Text>
                  </View>
                  <Text style={styles.privacyText}>
                    {eventCameraVerification
                      ? "Camera verification is enabled, but remains event-triggered and should stay inactive during normal monitoring."
                      : "Camera verification is disabled. Primary seat monitoring preferences remain unchanged."}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.unlockedContainer}>
                <View style={styles.unlockedIconWrap}>
                  <Host matchContents>
                    <Icon
                      name={Icon.select({
                        ios: "lock.open.fill",
                        android: lockOpenXml,
                      })}
                      size={96}
                      color={themes.primaryBttn}
                    />
                  </Host>
                </View>

                <Text style={styles.eyebrow}>SAFESEAT</Text>
                <Text style={styles.unlockedTitle}>Ready when your cabin is</Text>
                <Text style={styles.unlockedSubtitle}>
                  Build the session first. SafeSeat starts showing safety states only after the deployment is locked.
                </Text>

                <View style={styles.stepsCard}>
                  {[
                    ["1", "Assign occupants", "Choose a saved profile or a session-only guest."],
                    ["2", "Lock Deployment", "Freeze seat assignments for the current trip."],
                    ["3", "Monitor", "Home shows only Safe, Warning, Emergency, or Pending."],
                  ].map(([number, title, detail], index) => (
                    <View key={number} style={[styles.stepRow, index === 2 && styles.lastStep]}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{number}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>{title}</Text>
                        <Text style={styles.stepDetail}>{detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.unlockedAction}>
                  <Button
                    label="Set Up Trip"
                    onPress={() => router.push("/assign")}
                    fullWidth
                  />
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {emergencySeatNo !== undefined && emergencyProfile && (
          <EmergencyModal
            seat={emergencySeatNo}
            visible
            onClose={() =>
              setDismissedSeats((prev) => new Set(prev).add(emergencySeatNo))
            }
            id={emergencyProfile.id}
            name={emergencyProfile.isAccountOwner ? "You" : emergencyProfile.name}
            icon={emergencyProfile.photoURL ?? emergencyProfile.icon}
            isAccountOwner={emergencyProfile.isAccountOwner}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themes.background,
  },
  safeArea: {
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
    marginBottom: spacing.half,
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
  monitoringCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one + 4,
    padding: spacing.two,
    borderRadius: 20,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  monitoringIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: themes.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  monitoringCopy: {
    flex: 1,
    gap: 2,
  },
  monitoringTitle: {
    color: themes.text,
    fontSize: 16,
    fontFamily: "Body-Bold",
  },
  monitoringSubtitle: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    fontFamily: "Body-Medium",
  },
  monitoringHint: {
    color: themes.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    fontFamily: "Body-Regular",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.half,
    paddingHorizontal: spacing.one,
    paddingVertical: spacing.half,
    borderRadius: 999,
    backgroundColor: themes.primarySoft,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: themes.primaryBttn,
  },
  liveText: {
    color: themes.primaryBttn,
    fontSize: 9,
    letterSpacing: 0.7,
    fontFamily: "Body-Bold",
  },
  statusStrip: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.one,
    borderRadius: 18,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  statusMetric: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusMetricValue: {
    fontSize: 20,
    fontFamily: "Body-Bold",
  },
  statusMetricLabel: {
    color: themes.textSecondary,
    fontSize: 9,
    marginTop: 2,
    fontFamily: "Body-Medium",
  },
  statusDivider: {
    width: 1,
    height: 28,
    backgroundColor: themes.divider,
  },
  section: {
    gap: spacing.one,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeader: {
    fontSize: 19,
    fontFamily: "Heading-Font",
    color: themes.text,
  },
  sectionMeta: {
    color: themes.textMuted,
    fontSize: fontsize.caption,
    fontFamily: "Body-Medium",
  },
  privacyCard: {
    padding: spacing.two,
    borderRadius: 18,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  privacyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.half,
  },
  privacyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themes.primaryBttn,
  },
  privacyTitle: {
    color: themes.text,
    fontSize: 13,
    fontFamily: "Body-Bold",
  },
  privacyText: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 18,
    marginTop: spacing.half,
    fontFamily: "Body-Regular",
  },
  unlockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.half,
    paddingVertical: spacing.four,
  },
  unlockedIconWrap: {
    marginBottom: spacing.two,
    opacity: 0.95,
  },
  unlockedTitle: {
    color: themes.text,
    fontSize: 27,
    lineHeight: 32,
    fontFamily: "Body-Bold",
    textAlign: "center",
    marginTop: spacing.half,
  },
  unlockedSubtitle: {
    color: themes.textSecondary,
    fontSize: 14,
    fontFamily: "Body-Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 420,
    marginTop: spacing.one,
  },
  stepsCard: {
    width: "100%",
    marginTop: spacing.three,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  stepRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
    padding: spacing.one + 4,
    borderBottomWidth: 1,
    borderBottomColor: themes.divider,
  },
  lastStep: {
    borderBottomWidth: 0,
  },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themes.primarySoft,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
  },
  stepNumberText: {
    color: themes.primaryBttn,
    fontSize: 13,
    fontFamily: "Body-Bold",
  },
  stepTitle: {
    color: themes.text,
    fontSize: 14,
    fontFamily: "Body-Bold",
  },
  stepDetail: {
    color: themes.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
    fontFamily: "Body-Regular",
  },
  unlockedAction: {
    width: "100%",
    marginTop: spacing.two,
  },
});

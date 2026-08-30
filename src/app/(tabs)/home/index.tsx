import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, Icon } from "@expo/ui";

import Button from "@/components/button";
import EmergencyModal from "@/components/emergency-modal";
import SeatCard from "@/components/seat-card";
import { useUserPreferences } from "@/hooks/user-preferences-context";

import lockOpenXml from "@expo/material-symbols/lock_open.xml";
import shieldXml from "@expo/material-symbols/shield.xml";

export type SeatState = "empty" | "assigned" | "safe" | "warning" | "emergency" | "unknown";

type Profile = {
  id: string;
  name: string;
  photoURL?: string;
  icon?: string;
  isAccountOwner?: boolean;
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

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = 88 + insets.bottom;

  const { consent } = useUserPreferences();

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
      loadData();
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
    return profile.isAccountOwner ? "Me" : profile.name;
  };

  const assignedSeatCount = [1, 2, 3, 4, 5].filter((seatNo) => Boolean(assignments[seatNo])).length;

  const emergencySeatNo = isLockedIn
    ? [1, 2, 3, 4, 5].find(
        (seatNo) =>
          getSeatState(seatNo) === "emergency" &&
          assignments[seatNo] &&
          !dismissedSeats.has(seatNo),
      )
    : undefined;

  const emergencyProfile =
    emergencySeatNo !== undefined ? assignments[emergencySeatNo] : undefined;

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
                <Text style={styles.pageHeader}>Home</Text>

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
                    <Text style={styles.monitoringTitle}>Monitoring active</Text>
                    <Text style={styles.monitoringSubtitle}>
                      {assignedSeatCount} {assignedSeatCount === 1 ? "occupant" : "occupants"} assigned
                    </Text>
                    {!consent && (
                      <Text style={styles.privacyNotice}>Passenger status sharing is limited.</Text>
                    )}
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>ON</Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Occupant Status</Text>
                  {[1, 2, 3, 4, 5].map((seatNo) => {
                    const profile = assignments[seatNo];
                    return (
                      <SeatCard
                        key={seatNo}
                        seatNo={seatNo}
                        role={SEAT_ROLES[seatNo]}
                        name={getDisplayName(profile)}
                        state={getSeatState(seatNo)}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      />
                    );
                  })}
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
                      size={156}
                      color={themes.primaryBttn}
                    />
                  </Host>
                </View>

                <Text style={styles.unlockedTitle}>Monitoring is off</Text>
                <Text style={styles.unlockedSubtitle}>
                  Assign occupants to their seats, then tap Buckle on the Assign page to begin a trip.
                </Text>

                <View style={styles.unlockedAction}>
                  <Button
                    label="Go to Assign"
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
    gap: spacing.three,
  },
  pageHeader: {
    fontSize: fontsize.pageHeader,
    fontFamily: "Logo-Font",
    color: themes.text,
  },
  monitoringCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.two,
    padding: spacing.two,
    borderRadius: 20,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  monitoringIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: themes.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  monitoringCopy: {
    flex: 1,
    gap: spacing.quarter,
  },
  monitoringTitle: {
    color: themes.text,
    fontSize: fontsize.body,
    fontFamily: "Body-Bold",
  },
  monitoringSubtitle: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    fontFamily: "Body-Regular",
  },
  privacyNotice: {
    color: themes.lightOrange,
    fontSize: fontsize.caption,
    fontFamily: "Body-Medium",
    marginTop: spacing.quarter,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.half,
    paddingHorizontal: spacing.one,
    paddingVertical: spacing.half,
    borderRadius: 999,
    backgroundColor: themes.primarySoft,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: themes.primaryBttn,
  },
  liveText: {
    color: themes.primaryBttn,
    fontSize: 11,
    fontFamily: "Body-Bold",
  },
  section: {
    gap: spacing.one,
  },
  sectionHeader: {
    fontSize: fontsize.header,
    fontFamily: "Heading-Font",
    color: themes.text,
  },
  unlockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.six,
  },
  unlockedIconWrap: {
    marginBottom: spacing.three,
    opacity: 0.9,
  },
  unlockedTitle: {
    color: themes.text,
    fontSize: fontsize.header,
    fontFamily: "Body-Bold",
    textAlign: "center",
    marginBottom: spacing.one,
  },
  unlockedSubtitle: {
    color: themes.textSecondary,
    fontSize: fontsize.body,
    fontFamily: "Body-Regular",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 420,
  },
  unlockedAction: {
    width: "100%",
    marginTop: spacing.three,
  },
});

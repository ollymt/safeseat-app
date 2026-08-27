import Button from "@/components/button";
import EmergencyModal from "@/components/emergency-modal";
import SeatCard, { type SafeSeatCardState } from "@/components/seat-card";
import { Themes } from "@/constants/theme";
import { useSafeSeatHardware } from "@/hooks/use-safeseat-hardware";
import { useSafeSeatSession } from "@/hooks/use-safeseat-session";
import {
  SAFESEAT_SEATS,
  getSafeSeatLabel,
  type SafeSeatSeatNo,
} from "@/types/safeseat-session";
import { Host, Icon } from "@expo/ui";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const colorScheme = useColorScheme();
  const currentTheme = Themes[colorScheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const { ready, session } = useSafeSeatSession();

  const { assignments, isLockedIn, monitoredSeatNo } = session;

  const monitoredSeatAssigned = Boolean(assignments[monitoredSeatNo]);
  const hardware = useSafeSeatHardware({
    enabled: ready && isLockedIn && monitoredSeatAssigned,
  });

  const [dismissedSeats, setDismissedSeats] = useState<Set<number>>(new Set());

  const getSeatState = (seatNo: SafeSeatSeatNo): SafeSeatCardState => {
    const profile = assignments[seatNo];
    if (!profile) return "empty";
    if (seatNo !== monitoredSeatNo) return "unmonitored";
    if (!hardware.isOnline || !hardware.telemetry) return "unavailable";
    if (hardware.telemetry.system.fusion_state === "WATCH") return "monitoring";
    return hardware.fusionSeatState ?? "monitoring";
  };

  const monitoredState = getSeatState(monitoredSeatNo);

  // Dismiss applies only to the current emergency episode. Once Fusion leaves
  // EMERGENCY, allow a later emergency on this seat to surface again.
  useEffect(() => {
    if (monitoredState === "emergency") return;
    setDismissedSeats((previous) => {
      if (!previous.has(monitoredSeatNo)) return previous;
      const next = new Set(previous);
      next.delete(monitoredSeatNo);
      return next;
    });
  }, [monitoredSeatNo, monitoredState]);

  const emergencySeatNo =
    isLockedIn &&
    monitoredState === "emergency" &&
    assignments[monitoredSeatNo] &&
    !dismissedSeats.has(monitoredSeatNo)
      ? monitoredSeatNo
      : undefined;

  const emergencyProfile =
    emergencySeatNo !== undefined ? assignments[emergencySeatNo] : undefined;

  const monitoringPresentation = useMemo(() => {
    if (hardware.isOnline) {
      return {
        title: "SafeSeat Monitoring Active",
        detail: `${getSafeSeatLabel(monitoredSeatNo)} is receiving live Main Hub Fusion status.`,
        color: currentTheme.primaryBttn,
      };
    }

    if (hardware.isReachable) {
      return {
        title: "SafeSeat Monitoring Initializing",
        detail: "The Main Hub is reachable, but live telemetry is still becoming ready.",
        color: currentTheme.yellow,
      };
    }

    return {
      title: "SafeSeat Monitoring Unavailable",
      detail:
        "Keep this phone connected to the SafeSeat Wi-Fi. Monitoring resumes automatically when the Main Hub is reachable.",
      color: currentTheme.warnBttn,
    };
  }, [
    currentTheme.primaryBttn,
    currentTheme.warnBttn,
    currentTheme.yellow,
    hardware.isOnline,
    hardware.isReachable,
    monitoredSeatNo,
  ]);

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
      <View style={[styles.container, { marginTop: 40 }]}>
        {isLockedIn ? (
          <>
            <Text style={[styles.pageHeader, { color: currentTheme.text }]}>Home</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={[styles.monitoringCard, { backgroundColor: currentTheme.element }]}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: monitoringPresentation.color },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.monitoringTitle, { color: currentTheme.text }]}>
                    {monitoringPresentation.title}
                  </Text>
                  <Text
                    style={[
                      styles.monitoringDetail,
                      { color: currentTheme.textSecondary },
                    ]}
                  >
                    {monitoringPresentation.detail}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                {SAFESEAT_SEATS.map((seat) => (
                  <SeatCard
                    key={seat.seatNo}
                    seatNo={seat.seatNo}
                    role={`${seat.label}${seat.seatNo === monitoredSeatNo ? " • prototype" : ""}`}
                    name={assignments[seat.seatNo]?.name}
                    state={getSeatState(seat.seatNo)}
                  />
                ))}
              </View>

              <View style={[styles.infoCard, { backgroundColor: currentTheme.element }]}>
                <Text style={[styles.infoTitle, { color: currentTheme.text }]}>Participant View</Text>
                <Text style={[styles.infoText, { color: currentTheme.textSecondary }]}>
                  SafeSeat shows the system safety state here. Raw HR, RR, temperature,
                  pressure, motion, model scores, and camera confidence remain on the
                  evaluator-only monitor.
                </Text>
              </View>
            </ScrollView>
          </>
        ) : (
          <View style={styles.unlockedContainer}>
            <View style={{ marginVertical: 20 }}>
              <Host matchContents>
                <Icon
                  name={Icon.select({
                    ios: "lock.slash.fill",
                    android: import("@expo/material-symbols/lock_open.xml"),
                  })}
                  size={180}
                  color={currentTheme.secondaryBttn}
                />
              </Host>
            </View>
            <Text style={[styles.unlockedTitle, { color: currentTheme.text }]}>
              Deployment Not Locked
            </Text>
            <Text
              style={[
                styles.unlockedSubtitle,
                { color: currentTheme.textSecondary },
              ]}
            >
              Choose the physical prototype position, assign an occupant, and use Lock
              Deployment on the Assign page to start monitoring.
            </Text>
            <View style={{ width: "100%", marginTop: 24 }}>
              <Button
                label="Go to Assign"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/assign");
                }}
                fullWidth
                glass={false}
              />
            </View>
          </View>
        )}

        {emergencySeatNo !== undefined && emergencyProfile ? (
          <EmergencyModal
            seat={emergencySeatNo}
            visible
            onClose={() =>
              setDismissedSeats((previous) => new Set(previous).add(emergencySeatNo))
            }
            id={emergencyProfile.id}
            name={emergencyProfile.name}
            icon={emergencyProfile.photoURL ?? emergencyProfile.icon ?? undefined}
            isAccountOwner={emergencyProfile.isAccountOwner}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    padding: 20,
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
  scrollContent: {
    paddingBottom: 40,
    gap: 12,
  },
  monitoringCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  monitoringTitle: {
    fontSize: 17,
    fontFamily: "Body-Bold",
  },
  monitoringDetail: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  infoCard: {
    borderRadius: 12,
    padding: 14,
    marginTop: 2,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: "Body-Bold",
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  unlockedContainer: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 140,
    alignItems: "center",
    paddingHorizontal: 20,
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

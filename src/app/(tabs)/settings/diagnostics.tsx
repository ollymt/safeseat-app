import Button from "@/components/button";
import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { auth, db } from "@/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type CheckState = "idle" | "checking" | "ready" | "attention";

type AppCheck = {
  label: string;
  value: string;
  state: "ready" | "attention";
};

const MODULES = [
  { id: "M1", label: "Headrest", detail: "C1001 + MLX90614" },
  { id: "M2", label: "Backrest", detail: "FSR pressure array" },
  { id: "M3", label: "Cushion", detail: "FSR pressure array" },
  { id: "M4", label: "Seat Frame", detail: "MPU6050 motion context" },
  { id: "CAM", label: "Camera", detail: "Event-triggered posture verification" },
];

export default function Diagnostics() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<CheckState>("idle");
  const [checks, setChecks] = useState<AppCheck[]>([]);
  const [summary, setSummary] = useState("Run the diagnostic to verify the app layer before hardware integration.");

  const runDiagnostic = async () => {
    if (state === "checking") return;

    setState("checking");
    setChecks([]);
    setSummary("Checking SafeSeat app readiness…");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextChecks: AppCheck[] = [];

    const currentUser = auth.currentUser;
    nextChecks.push({
      label: "Signed-in session",
      value: currentUser ? "Available" : "Sign in required",
      state: currentUser ? "ready" : "attention",
    });

    try {
      await AsyncStorage.getItem("seatAssignments");
      nextChecks.push({
        label: "Session storage",
        value: "Available",
        state: "ready",
      });
    } catch {
      nextChecks.push({
        label: "Session storage",
        value: "Needs attention",
        state: "attention",
      });
    }

    try {
      await SecureStore.getItemAsync("is_logged_in");
      nextChecks.push({
        label: "Protected session storage",
        value: "Available",
        state: "ready",
      });
    } catch {
      nextChecks.push({
        label: "Protected session storage",
        value: "Needs attention",
        state: "attention",
      });
    }

    if (currentUser) {
      try {
        await getDoc(doc(db, "users", currentUser.uid));
        nextChecks.push({
          label: "Firebase account sync",
          value: "Reachable",
          state: "ready",
        });
      } catch {
        nextChecks.push({
          label: "Firebase account sync",
          value: "Offline or unavailable",
          state: "attention",
        });
      }
    } else {
      nextChecks.push({
        label: "Firebase account sync",
        value: "Skipped",
        state: "attention",
      });
    }

    const hasAttention = nextChecks.some((check) => check.state === "attention");
    setChecks(nextChecks);
    setState(hasAttention ? "attention" : "ready");
    setSummary(
      hasAttention
        ? "The app loaded, but one or more app services need attention. Hardware checks remain intentionally pending until Main Hub integration."
        : "The app layer is ready. Hardware module status will become live after Main Hub integration is connected.",
    );

    void Haptics.notificationAsync(
      hasAttention
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success,
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 84 + insets.bottom }]}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>SYSTEM CHECK</Text>
          <Text style={styles.pageHeader}>Self-Diagnostic</Text>
          <Text style={styles.intro}>
            This screen verifies what is available now without inventing sensor results. Module health becomes authoritative only after the SafeSeat Main Hub is integrated.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryDot,
              {
                backgroundColor:
                  state === "ready"
                    ? themes.primaryBttn
                    : state === "attention"
                      ? themes.lightOrange
                      : themes.info,
              },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>
              {state === "checking"
                ? "Running checks"
                : state === "ready"
                  ? "App layer ready"
                  : state === "attention"
                    ? "App layer needs attention"
                    : "Ready to check"}
            </Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        </View>

        <Button
          label={state === "checking" ? "Running Diagnostic…" : "Run System Self-Diagnostic"}
          onPress={runDiagnostic}
          loading={state === "checking"}
          fullWidth
        />

        {checks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP CHECKS</Text>
            <View style={styles.listCard}>
              {checks.map((check, index) => (
                <View
                  key={check.label}
                  style={[styles.row, index === checks.length - 1 && styles.lastRow]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          check.state === "ready" ? themes.primaryBttn : themes.lightOrange,
                      },
                    ]}
                  />
                  <Text style={styles.rowLabel}>{check.label}</Text>
                  <Text
                    style={[
                      styles.rowValue,
                      {
                        color:
                          check.state === "ready" ? themes.primaryBttn : themes.lightOrange,
                      },
                    ]}
                  >
                    {check.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>HARDWARE MODULES</Text>
            <View style={styles.pendingPill}>
              <Text style={styles.pendingPillText}>INTEGRATION PENDING</Text>
            </View>
          </View>

          <View style={styles.moduleStack}>
            {MODULES.map((module) => (
              <View key={module.id} style={styles.moduleCard}>
                <View style={styles.moduleId}>
                  <Text style={styles.moduleIdText}>{module.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moduleTitle}>{module.label}</Text>
                  <Text style={styles.moduleDetail}>{module.detail}</Text>
                </View>
                <Text style={styles.modulePending}>Awaiting Hub</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Why these are not marked Operational yet</Text>
          <Text style={styles.noticeText}>
            SafeSeat should never show a green hardware result until the phone receives a real module-health response from the Main Hub. This keeps the pre-integration app honest and makes the later UAT diagnostic defensible.
          </Text>
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
  content: {
    paddingHorizontal: spacing.two,
    paddingTop: spacing.six,
    gap: spacing.two,
  },
  headerBlock: {
    gap: spacing.half,
    marginBottom: spacing.one,
  },
  eyebrow: {
    color: themes.primaryBttn,
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: "Body-Bold",
  },
  pageHeader: {
    color: themes.text,
    fontSize: fontsize.pageHeader,
    fontFamily: "Logo-Font",
  },
  intro: {
    color: themes.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Body-Regular",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.one,
    padding: spacing.two,
    borderRadius: 18,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  summaryDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: 5,
  },
  summaryTitle: {
    color: themes.text,
    fontSize: fontsize.body,
    fontFamily: "Body-Bold",
  },
  summaryText: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 18,
    marginTop: spacing.half,
    fontFamily: "Body-Regular",
  },
  section: {
    gap: spacing.one,
    marginTop: spacing.one,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.one,
  },
  sectionTitle: {
    color: themes.textMuted,
    fontSize: 11,
    fontFamily: "Body-Bold",
    letterSpacing: 1.2,
  },
  listCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: themes.divider,
    backgroundColor: themes.backgroundElement,
  },
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
    paddingHorizontal: spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: themes.divider,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowLabel: {
    flex: 1,
    color: themes.text,
    fontSize: 14,
    fontFamily: "Body-Medium",
  },
  rowValue: {
    maxWidth: "44%",
    textAlign: "right",
    fontSize: fontsize.caption,
    fontFamily: "Body-Bold",
  },
  pendingPill: {
    paddingHorizontal: spacing.one,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  pendingPillText: {
    color: themes.textMuted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontFamily: "Body-Bold",
  },
  moduleStack: {
    gap: spacing.one,
  },
  moduleCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
    padding: spacing.one + 4,
    borderRadius: 16,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  moduleId: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  moduleIdText: {
    color: themes.textSecondary,
    fontSize: 11,
    fontFamily: "Body-Bold",
  },
  moduleTitle: {
    color: themes.text,
    fontSize: 14,
    fontFamily: "Body-Bold",
  },
  moduleDetail: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    marginTop: 2,
    fontFamily: "Body-Regular",
  },
  modulePending: {
    color: themes.textMuted,
    fontSize: 10,
    fontFamily: "Body-Bold",
  },
  noticeCard: {
    padding: spacing.two,
    borderRadius: 18,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  noticeTitle: {
    color: themes.text,
    fontSize: 14,
    fontFamily: "Body-Bold",
  },
  noticeText: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 18,
    marginTop: spacing.half,
    fontFamily: "Body-Regular",
  },
});

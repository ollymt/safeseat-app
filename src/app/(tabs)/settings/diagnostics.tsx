import Button from "@/components/button";
import ModuleStatusCard from "@/components/module-status-card";
import { Themes } from "@/constants/theme";
import { useSafeSeatHardware } from "@/hooks/use-safeseat-hardware";
import { probeSafeSeatHub } from "@/services/safeseat-hardware";
import { deriveSafeSeatModuleStatuses } from "@/services/safeseat-module-status";
import type { SafeSeatHardwareStatus } from "@/types/safeseat-hardware";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DIAGNOSTIC_SAMPLES = 4;
const SAMPLE_DELAY_MS = 750;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Diagnostics() {
  const colorScheme = useColorScheme();
  const currentTheme = Themes[colorScheme === "dark" ? "dark" : "light"];
  const hardware = useSafeSeatHardware({ enabled: true });

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [diagnosticTelemetry, setDiagnosticTelemetry] =
    useState<SafeSeatHardwareStatus | null>(null);
  const [diagnosticSummary, setDiagnosticSummary] = useState<string | null>(null);

  const visibleTelemetry = diagnosticTelemetry ?? hardware.telemetry;
  const moduleStatuses = useMemo(
    () => deriveSafeSeatModuleStatuses(visibleTelemetry, hardware.isReachable),
    [hardware.isReachable, visibleTelemetry],
  );

  const runDiagnostic = async () => {
    if (running) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(true);
    setProgress(0);
    setDiagnosticSummary(null);

    let reachableSamples = 0;
    let telemetrySamples = 0;
    let lastTelemetry: SafeSeatHardwareStatus | null = null;

    for (let sample = 1; sample <= DIAGNOSTIC_SAMPLES; sample += 1) {
      try {
        const result = await probeSafeSeatHub();
        reachableSamples += 1;
        if (result.telemetry) {
          telemetrySamples += 1;
          lastTelemetry = result.telemetry;
        }
      } catch {
        // The final summary below is intentionally user-facing. Detailed raw
        // telemetry/debug information is reserved for the evaluator monitor.
      }

      setProgress(sample);
      if (sample < DIAGNOSTIC_SAMPLES) await delay(SAMPLE_DELAY_MS);
    }

    setDiagnosticTelemetry(lastTelemetry);

    if (telemetrySamples === DIAGNOSTIC_SAMPLES) {
      setDiagnosticSummary("All monitored SafeSeat modules responded normally.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (reachableSamples > 0) {
      setDiagnosticSummary(
        "SafeSeat is connected, but one or more monitoring modules are still initializing or need attention.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      setDiagnosticSummary(
        "SafeSeat could not connect to the monitoring system. Reconnect this phone to the SafeSeat network and try again.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    await hardware.refresh();
    setRunning(false);
  };

  const connectionColor = hardware.isOnline
    ? currentTheme.primaryBttn
    : hardware.isReachable
      ? currentTheme.yellow
      : currentTheme.warnBttn;

  const connectionLabel = hardware.isOnline
    ? "CONNECTED"
    : hardware.isReachable
      ? "INITIALIZING"
      : "NOT CONNECTED";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: currentTheme.background }}
      edges={Platform.OS === "android" ? ["left", "right", "top"] : ["left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.pageHeader, { color: currentTheme.text }]}>System Diagnostic</Text>
        <Text style={[styles.intro, { color: currentTheme.textSecondary }]}>
          Check SafeSeat connectivity and module readiness before starting a monitoring session.
        </Text>

        <View style={[styles.overviewCard, { backgroundColor: currentTheme.element }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: connectionColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: currentTheme.text }]}>
                Monitoring System {connectionLabel}
              </Text>
              <Text style={[styles.smallText, { color: currentTheme.textSecondary }]}>
                Raw sensor values are not shown in the participant interface.
              </Text>
            </View>
          </View>

          <Button
            label={
              running
                ? `Running Diagnostic ${progress}/${DIAGNOSTIC_SAMPLES}`
                : "Run System Self-Diagnostic"
            }
            onPress={runDiagnostic}
            enabled={!running}
            fullWidth
            glass={false}
          />
        </View>

        {diagnosticSummary ? (
          <View style={[styles.resultCard, { backgroundColor: currentTheme.element }]}>
            <Text style={[styles.resultText, { color: currentTheme.text }]}>
              {diagnosticSummary}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Module Status</Text>
        <View style={{ gap: 8 }}>
          {moduleStatuses.map((module) => (
            <ModuleStatusCard key={module.id} module={module} />
          ))}
        </View>

        <Text style={[styles.disclaimer, { color: currentTheme.textSecondary }]}>
          SafeSeat is a non-diagnostic safety-monitoring research prototype. Individual sensor readings are interpreted by the system before a safety state is shown to the user.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 54,
    paddingBottom: 56,
    gap: 12,
  },
  pageHeader: {
    fontSize: 36,
    fontFamily: "Logo-Font",
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
  },
  overviewCard: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  statusTitle: {
    fontSize: 17,
    fontFamily: "Body-Bold",
  },
  smallText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  resultCard: {
    borderRadius: 12,
    padding: 14,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Body-Medium",
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: "Body-Bold",
    marginTop: 4,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
});

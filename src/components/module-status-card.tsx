import { Themes } from "@/constants/theme";
import type { SafeSeatModuleSummary } from "@/types/safeseat-hardware";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

type Props = {
  module: SafeSeatModuleSummary;
  compact?: boolean;
};

const STATE_LABELS = {
  operational: "OPERATIONAL",
  degraded: "DEGRADED SIGNAL",
  not_detected: "NOT DETECTED",
} as const;

export default function ModuleStatusCard({ module, compact = false }: Props) {
  const colorScheme = useColorScheme();
  const currentTheme = Themes[colorScheme === "dark" ? "dark" : "light"];

  const statusColor =
    module.state === "operational"
      ? currentTheme.primaryBttn
      : module.state === "degraded"
        ? currentTheme.yellow
        : currentTheme.warnBttn;

  return (
    <View style={[styles.card, compact && styles.cardCompact, { backgroundColor: currentTheme.element }]}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.moduleName, { color: currentTheme.text }]}>
            {module.id} • {module.label}
          </Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {STATE_LABELS[module.state]}
          </Text>
        </View>
      </View>
      {!compact && (
        <>
          <Text style={[styles.detail, { color: currentTheme.textSecondary }]}>{module.detail}</Text>
          {module.action ? (
            <Text style={[styles.action, { color: currentTheme.text }]}>{module.action}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  cardCompact: {
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moduleName: {
    fontFamily: "Body-Bold",
    fontSize: 15,
  },
  status: {
    fontFamily: "Condensed-Bold",
    fontSize: 12,
    marginTop: 1,
  },
  detail: {
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    fontFamily: "Body-Medium",
    fontSize: 12,
    lineHeight: 17,
  },
});

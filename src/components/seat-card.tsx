import { Themes } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

export type SafeSeatCardState =
  | "safe"
  | "warning"
  | "monitoring"
  | "emergency"
  | "empty"
  | "unmonitored"
  | "unavailable";

type SeatCardProps = {
  seatNo: number;
  name?: string;
  state?: SafeSeatCardState;
  role?: string;
  onPress?: () => void;
};

const LABELS: Record<SafeSeatCardState, string> = {
  safe: "SAFE",
  warning: "WARNING",
  monitoring: "MONITORING",
  emergency: "EMERGENCY",
  empty: "EMPTY",
  unmonitored: "NOT MONITORED",
  unavailable: "UNAVAILABLE",
};

export default function SeatCard({
  seatNo,
  name = "empty",
  state = "empty",
  role,
  onPress,
}: SeatCardProps) {
  const colorScheme = useColorScheme();
  const currentTheme = Themes[colorScheme === "dark" ? "dark" : "light"];

  const statusColor =
    state === "safe"
      ? currentTheme.primaryBttn
      : state === "warning"
        ? currentTheme.yellow
        : state === "monitoring"
          ? currentTheme.secondaryBttn
          : state === "emergency"
          ? currentTheme.warnBttn
          : state === "unavailable"
            ? currentTheme.warnBttn
            : currentTheme.textSecondary;

  const iconName =
    state === "safe"
      ? Icon.select({
          ios: "checkmark.circle.fill",
          android: import("@expo/material-symbols/check.xml"),
        })
      : state === "warning"
        ? Icon.select({
            ios: "exclamationmark.triangle.fill",
            android: import("@expo/material-symbols/warning.xml"),
          })
        : state === "monitoring"
          ? null
          : state === "emergency"
          ? Icon.select({
              ios: "light.beacon.max.fill",
              android: import("@expo/material-symbols/siren.xml"),
            })
          : state === "unavailable"
            ? Icon.select({
                ios: "wifi.slash",
                android: import("@expo/material-symbols/wifi_off.xml"),
              })
            : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.baseCard,
        state === "empty" && styles.emptySeat,
        { backgroundColor: currentTheme.element },
      ]}
    >
      <View style={[styles.seatNoCont, { backgroundColor: statusColor }]}>
        <Text style={[styles.seatNo, { color: currentTheme.background }]}>
          {seatNo}
        </Text>
      </View>

      <View style={styles.mainInfo}>
        {role ? (
          <Text style={[styles.role, { color: currentTheme.textSecondary }]}>
            {role.toUpperCase()}
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          style={[styles.name, { color: currentTheme.text }]}
        >
          {name}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        {iconName ? (
          <Host matchContents>
            <Icon name={iconName} color={statusColor} />
          </Host>
        ) : null}
        <Text style={[styles.stateName, { color: statusColor }]}>
          {LABELS[state]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseCard: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    alignItems: "center",
    overflow: "hidden",
    minHeight: 86,
  },
  emptySeat: {
    opacity: 0.5,
  },
  seatNoCont: {
    width: 56,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  seatNo: {
    fontSize: 24,
    fontFamily: "Logo-Font",
  },
  mainInfo: {
    paddingVertical: 16,
    flex: 1,
  },
  role: {
    fontFamily: "Condensed-Bold",
    fontSize: 12,
    marginBottom: 2,
  },
  name: {
    fontSize: 17,
    fontFamily: "Body-Bold",
    textTransform: "capitalize",
  },
  statusContainer: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 14,
    maxWidth: 145,
  },
  stateName: {
    fontFamily: "Condensed-Bold",
    fontSize: 12,
    textAlign: "right",
  },
});

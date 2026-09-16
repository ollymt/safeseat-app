import { type ThemePalette } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export type MonitorSeatState =
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

export type MonitorVitals = {
  trusted: boolean;
  heartRateBpm: number | null;
  respirationRateBpm: number | null;
  statusLabel: "LIVE" | "REACQUIRING" | "UNAVAILABLE";
};

type Props = {
  seatNo: number;
  role: string;
  name?: string;
  photo?: string;
  state: MonitorSeatState;
  isHardwareSeat?: boolean;
  vitals?: MonitorVitals;
  onPress?: () => void;
};

type StateMeta = {
  label: string;
  hint?: string;
  symbol: string;
  color: string;
};

const stateMeta = (
  themes: ThemePalette,
  state: MonitorSeatState,
  isHardwareSeat: boolean,
): StateMeta => {
  if (state === "offline" && !isHardwareSeat) {
    return { label: "NOT MONITORED", hint: "No sensor linked", symbol: "—", color: themes.textMuted };
  }

  switch (state) {
    case "safe":
      return { label: "SAFE", symbol: "✓", color: themes.green };
    case "warning":
      return { label: "WARNING", hint: "Check passenger", symbol: "!", color: themes.lightOrange };
    case "emergency":
      return { label: "EMERGENCY", hint: "Check passenger now", symbol: "!!", color: themes.warnBttn };
    case "unknown":
      return { label: "ANALYZING", hint: "Checking sensors", symbol: "…", color: themes.info };
    case "consent":
      return { label: "CONSENT", hint: "Action needed", symbol: "?", color: themes.lightOrange };
    case "declined":
      return { label: "DECLINED", hint: "Not monitored", symbol: "×", color: themes.warnBttn };
    case "offline":
      return { label: "OFFLINE", hint: "Check connection", symbol: "—", color: themes.textMuted };
    case "ready":
      return { label: "READY", symbol: "✓", color: themes.primaryBttn };
    case "monitoring":
      return { label: "MONITORING", symbol: "●", color: themes.primaryBttn };
    case "assigned":
      return { label: "ASSIGNED", symbol: "✓", color: themes.primaryBttn };
    default:
      return { label: "EMPTY", hint: "Tap to assign", symbol: "+", color: themes.textMuted };
  }
};

export default function HomeMonitorRow({
  seatNo,
  role,
  name,
  photo,
  state,
  isHardwareSeat = false,
  vitals,
  onPress,
}: Props) {
  const themes = useTheme();
  const styles = createStyles(themes);
  const meta = stateMeta(themes, state, isHardwareSeat);
  const displayName = name || "No person assigned";
  const showVitals = isHardwareSeat && (state === "warning" || state === "emergency");
  const showLinkedBadge = isHardwareSeat && state !== "empty" && state !== "consent" && state !== "declined";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${role}, ${displayName}, ${meta.label}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: `${meta.color}42` },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={[styles.accentRail, { backgroundColor: meta.color }]} />
      <View pointerEvents="none" style={[styles.stateWash, { backgroundColor: meta.color }]} />

      <View style={styles.identityZone}>
        <View style={styles.identityTopLine}>
          <Text style={styles.role} numberOfLines={1}>{role.toUpperCase()}</Text>
          {showLinkedBadge ? (
            <View style={[styles.linkedBadge, { borderColor: `${themes.primaryBttn}55`, backgroundColor: themes.primarySoft }]}>
              <View style={[styles.linkedDot, { backgroundColor: themes.primaryBttn }]} />
              <Text style={[styles.linkedText, { color: themes.primaryBttn }]}>LINKED</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.personLine}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { borderColor: `${meta.color}42` }]}>
              <Text style={styles.avatarInitial}>{name ? name.charAt(0).toUpperCase() : String(seatNo)}</Text>
            </View>
          )}
          <Text
            style={[styles.name, state === "empty" && styles.emptyName]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {displayName}
          </Text>
        </View>
      </View>

      <View style={styles.statusZone}>
        <View style={[styles.symbolBox, { borderColor: `${meta.color}5C`, backgroundColor: `${meta.color}12` }]}>
          <Text style={[styles.symbol, { color: meta.color }]}>{meta.symbol}</Text>
        </View>

        <View style={styles.statusCopy}>
          <Text
            style={[styles.stateLabel, { color: meta.color }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.68}
          >
            {meta.label}
          </Text>

          {showVitals ? (
            vitals?.trusted ? (
              <View style={styles.vitalsRow}>
                <View style={styles.vitalChip}>
                  <Text style={styles.vitalLabel}>HR</Text>
                  <Text style={styles.vitalValue}>{vitals.heartRateBpm ?? "—"}</Text>
                </View>
                <View style={styles.vitalChip}>
                  <Text style={styles.vitalLabel}>RR</Text>
                  <Text style={styles.vitalValue}>{vitals.respirationRateBpm ?? "—"}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.hint} numberOfLines={1}>
                {vitals?.statusLabel === "UNAVAILABLE" ? "Vitals unavailable" : "Vitals reacquiring"}
              </Text>
            )
          ) : meta.hint ? (
            <Text style={styles.hint} numberOfLines={1}>{meta.hint}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (themes: ThemePalette) => StyleSheet.create({
  row: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: themes.backgroundElement,
    shadowColor: themes.shadow,
    shadowOpacity: themes.mode === "dark" ? 0.12 : 0.055,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.994 }] },
  accentRail: { width: 5, alignSelf: "stretch" },
  stateWash: {
    position: "absolute",
    width: 155,
    height: 155,
    borderRadius: 78,
    right: -52,
    top: -58,
    opacity: 0.045,
  },

  identityZone: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 12,
    paddingRight: 8,
    justifyContent: "center",
    gap: 6,
  },
  identityTopLine: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  role: {
    flex: 1,
    minWidth: 0,
    color: themes.textSecondary,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.65,
    fontFamily: "Body-Bold",
  },
  linkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    flexShrink: 0,
  },
  linkedDot: { width: 5, height: 5, borderRadius: 3 },
  linkedText: { fontSize: 7.5, lineHeight: 9, letterSpacing: 0.45, fontFamily: "Body-Bold" },
  personLine: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  avatar: { width: 34, height: 34, borderRadius: 11, resizeMode: "cover" },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themes.surfaceSoft,
  },
  avatarInitial: { color: themes.text, fontSize: 13, fontFamily: "Body-Bold" },
  name: { flex: 1, minWidth: 0, color: themes.text, fontSize: 17, lineHeight: 20, fontFamily: "Body-Bold" },
  emptyName: { color: themes.textMuted, fontSize: 14 },

  statusZone: {
    flex: 1.02,
    minWidth: 0,
    paddingRight: 12,
    paddingLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 9,
  },
  symbolBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1.3,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  symbol: { fontSize: 20, lineHeight: 23, fontFamily: "Body-Bold" },
  statusCopy: { flex: 1, minWidth: 0, alignItems: "flex-start", justifyContent: "center" },
  stateLabel: {
    width: "100%",
    fontSize: 22,
    lineHeight: 25,
    letterSpacing: 0.2,
    fontFamily: "Body-Bold",
  },
  hint: { width: "100%", color: themes.textSecondary, fontSize: 10.5, lineHeight: 13, marginTop: 2, fontFamily: "Body-Medium" },
  vitalsRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  vitalChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themes.divider,
    backgroundColor: themes.surfaceSoft,
  },
  vitalLabel: { color: themes.textMuted, fontSize: 8, fontFamily: "Body-Bold" },
  vitalValue: { color: themes.text, fontSize: 12, lineHeight: 14, fontFamily: "Body-Bold" },
});

import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type WindowValue = 20 | 25 | 30;

type Props = {
  value: WindowValue;
  enabled?: boolean;
  onValueChange: (value: WindowValue) => void;
};

const VALUES: WindowValue[] = [20, 25, 30];

export default function EscalationWindowControl({ value, enabled = true, onValueChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(1);
  const selectedIndex = VALUES.indexOf(value);
  const thumbPercent = selectedIndex <= 0 ? 0 : selectedIndex === 1 ? 50 : 100;

  const select = (next: WindowValue) => {
    if (!enabled || next === value) return;
    void Haptics.selectionAsync();
    onValueChange(next);
  };

  const handleTrackPress = (x: number) => {
    if (!enabled) return;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    if (ratio < 0.25) select(20);
    else if (ratio < 0.75) select(25);
    else select(30);
  };

  const adjust = (direction: "increment" | "decrement") => {
    const index = VALUES.indexOf(value);
    const nextIndex = direction === "increment"
      ? Math.min(VALUES.length - 1, index + 1)
      : Math.max(0, index - 1);
    select(VALUES[nextIndex]);
  };

  return (
    <View style={[styles.card, !enabled && styles.disabled]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Escalation Window</Text>
          <Text style={styles.subtitle}>Time available to cancel a confirmed emergency before SMS escalation.</Text>
        </View>
        <View style={styles.valueBadge}>
          <Text style={styles.valueText}>{value}s</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Emergency escalation window"
        accessibilityValue={{ min: 20, max: 30, now: value, text: `${value} seconds` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName;
          if (name === "increment" || name === "decrement") adjust(name);
        }}
        disabled={!enabled}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onPress={(event) => handleTrackPress(event.nativeEvent.locationX)}
        style={styles.trackTouch}
      >
        <View style={styles.track}>
          <View style={[styles.trackActive, { width: `${thumbPercent}%` }]} />
          {[0, 50, 100].map((percent) => (
            <View key={percent} style={[styles.stop, { left: `${percent}%` }]} />
          ))}
          <View style={[styles.thumb, { left: `${thumbPercent}%` }]} />
        </View>
      </Pressable>

      <View style={styles.labels}>
        {VALUES.map((item) => (
          <Pressable key={item} onPress={() => select(item)} disabled={!enabled} hitSlop={8}>
            <Text style={[styles.label, item === value && styles.labelSelected]}>{item}s</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: themes.backgroundElement,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: themes.divider,
    padding: spacing.two,
    gap: spacing.two,
  },
  disabled: {
    opacity: 0.45,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
  },
  title: {
    color: themes.text,
    fontSize: fontsize.body,
    fontFamily: "Body-Bold",
  },
  subtitle: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 17,
    marginTop: 3,
    fontFamily: "Body-Regular",
  },
  valueBadge: {
    minWidth: 54,
    paddingHorizontal: spacing.one,
    paddingVertical: spacing.half,
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: themes.primarySoft,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
  },
  valueText: {
    color: themes.primaryBttn,
    fontSize: fontsize.body,
    fontFamily: "Body-Bold",
  },
  trackTouch: {
    paddingVertical: spacing.one,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: themes.secondaryBttn,
    position: "relative",
  },
  trackActive: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: themes.primaryBttn,
  },
  stop: {
    position: "absolute",
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -2,
    borderRadius: 5,
    backgroundColor: themes.backgroundElevated,
    borderWidth: 2,
    borderColor: themes.textSecondary,
  },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    marginLeft: -11,
    marginTop: -8,
    borderRadius: 11,
    backgroundColor: themes.primaryBttn,
    borderWidth: 3,
    borderColor: themes.text,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: themes.textMuted,
    fontSize: fontsize.caption,
    fontFamily: "Body-Medium",
  },
  labelSelected: {
    color: themes.primaryBttn,
    fontFamily: "Body-Bold",
  },
});

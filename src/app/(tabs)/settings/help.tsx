import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const STEPS = [
  ["1", "Choose seats", "Assign the driver and passengers to their actual seats."],
  ["2", "Confirm passenger consent", "Passengers must agree before monitoring. The account owner in Driver is ready automatically."],
  ["3", "Check SafeSeat", "The monitored seat must show Ready and the SafeSeat connection must be online."],
  ["4", "Start Monitoring", "Use the fixed action at the bottom of Seats to begin the trip."],
];

const STATES = [
  ["SAFE", "No unusual signs detected", themes.green],
  ["WARNING", "Check the passenger", themes.lightOrange],
  ["EMERGENCY", "Immediate attention may be needed", themes.warnBttn],
  ["ANALYZING", "SafeSeat is still checking", themes.info],
  ["OFFLINE", "Monitoring data is not available", themes.textMuted],
];

export default function QuickHelp() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>QUICK HELP</Text>
          <Text style={styles.title}>Using SafeSeat</Text>
        </View>

        <Text style={styles.sectionLabel}>START A TRIP</Text>
        <View style={styles.card}>
          {STEPS.map(([number, title, detail], index) => (
            <View key={number} style={[styles.stepRow, index < STEPS.length - 1 && styles.divider]}>
              <View style={styles.number}><Text style={styles.numberText}>{number}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepDetail}>{detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>STATUS GUIDE</Text>
        <View style={styles.card}>
          {STATES.map(([label, detail, color], index) => (
            <View key={String(label)} style={[styles.stateRow, index < STATES.length - 1 && styles.divider]}>
              <View style={[styles.dot, { backgroundColor: String(color) }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stateLabel, { color: String(color) }]}>{label}</Text>
                <Text style={styles.stepDetail}>{detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>DURING AN ALERT</Text>
        <View style={styles.cardCompact}>
          <Text style={styles.alertText}>Check which seat is affected, review the available heart-rate and breathing-rate indicators, and respond to the passenger’s condition.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: themes.background },
  content: { paddingHorizontal: spacing.two, paddingTop: 58, gap: spacing.one + 4 },
  header: { marginBottom: spacing.one },
  eyebrow: { color: themes.primaryBttn, fontSize: 10, letterSpacing: 1.3, fontFamily: "Body-Bold" },
  title: { color: themes.text, fontSize: fontsize.pageHeader, fontFamily: "Logo-Font", marginTop: 3 },
  sectionLabel: { color: themes.textMuted, fontSize: 10, letterSpacing: 1.15, fontFamily: "Body-Bold", marginTop: spacing.one },
  card: { borderRadius: 18, backgroundColor: themes.backgroundElement, borderWidth: 1, borderColor: themes.divider, overflow: "hidden" },
  cardCompact: { borderRadius: 18, backgroundColor: themes.backgroundElement, borderWidth: 1, borderColor: themes.divider, padding: spacing.two },
  stepRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.one + 4, padding: spacing.one + 4 },
  stateRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.one + 4, paddingHorizontal: spacing.two, paddingVertical: spacing.one },
  divider: { borderBottomWidth: 1, borderBottomColor: themes.divider },
  number: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: themes.primarySoft, borderWidth: 1, borderColor: themes.primaryBorder },
  numberText: { color: themes.primaryBttn, fontSize: 13, fontFamily: "Body-Bold" },
  stepTitle: { color: themes.text, fontSize: 14, fontFamily: "Body-Bold" },
  stepDetail: { color: themes.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: "Body-Regular" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stateLabel: { fontSize: 11, letterSpacing: 0.7, fontFamily: "Body-Bold" },
  alertText: { color: themes.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: "Body-Regular" },
});

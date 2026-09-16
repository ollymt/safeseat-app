import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { DRIVER_GUIDE_STEPS, useDriverGuide } from "@/hooks/driver-guide-context";
import * as Haptics from "expo-haptics";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUS_ITEMS = [
  { label: "SAFE", detail: "No unusual signs detected", color: themes.green },
  { label: "WARNING", detail: "Check the passenger", color: themes.lightOrange },
  { label: "EMERGENCY", detail: "Immediate attention may be needed", color: themes.warnBttn },
  { label: "ANALYZING", detail: "SafeSeat is still checking", color: themes.info },
];

function DemoPanel({ stepId }: { stepId: string }) {
  if (stepId === "dashboard") {
    return (
      <View style={styles.demoPanel}>
        <Text style={styles.demoEyebrow}>HOME EXAMPLE</Text>
        <View style={styles.demoMiniRows}>
          <View style={styles.demoMiniRow}><Text style={styles.demoMiniSeat}>Driver</Text><Text style={[styles.demoMiniState, { color: themes.green }]}>SAFE</Text></View>
          <View style={styles.demoMiniRow}><Text style={styles.demoMiniSeat}>Front Passenger</Text><Text style={[styles.demoMiniState, { color: themes.info }]}>ANALYZING</Text></View>
          <View style={styles.demoMiniRow}><Text style={styles.demoMiniSeat}>Rear Left</Text><Text style={styles.demoMiniEmpty}>EMPTY</Text></View>
          <View style={styles.demoMiniRow}><Text style={styles.demoMiniSeat}>Rear Center</Text><Text style={styles.demoMiniEmpty}>EMPTY</Text></View>
          <View style={styles.demoMiniRow}><Text style={styles.demoMiniSeat}>Rear Right</Text><Text style={styles.demoMiniEmpty}>EMPTY</Text></View>
        </View>
      </View>
    );
  }

  if (stepId === "seats") {
    return (
      <View style={styles.demoPanel}>
        <Text style={styles.demoEyebrow}>SEATS EXAMPLE</Text>
        <View style={styles.demoSeatRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.demoSeatTitle}>Front Passenger</Text>
            <Text style={styles.demoSeatSub}>Choose the person sitting here</Text>
          </View>
          <View style={styles.demoActionPill}><Text style={styles.demoActionText}>ASSIGN PERSON</Text></View>
        </View>
      </View>
    );
  }

  if (stepId === "consent") {
    return (
      <View style={styles.demoPanel}>
        <Text style={styles.demoEyebrow}>PASSENGER EXAMPLE</Text>
        <View style={styles.demoSeatRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.demoSeatTitle}>Front Passenger · Maria</Text>
            <Text style={[styles.demoStatusText, { color: themes.lightOrange }]}>CONSENT NEEDED</Text>
          </View>
        </View>
        <View style={styles.demoConsentButton}>
          <Text style={styles.demoConsentButtonText}>Confirm Consent</Text>
        </View>
        <Text style={styles.demoHint}>This is a demonstration only. The tutorial never changes real consent.</Text>
      </View>
    );
  }

  if (stepId === "sensor") {
    return (
      <View style={styles.demoPanel}>
        <Text style={styles.demoEyebrow}>SAFESEAT SENSOR</Text>
        <View style={styles.demoSensorRow}>
          <View style={[styles.demoDot, { backgroundColor: themes.primaryBttn }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.demoSeatTitle}>Front Passenger</Text>
            <Text style={styles.demoReadyText}>Connected and ready</Text>
          </View>
          <View style={styles.demoReadyPill}><Text style={styles.demoReadyPillText}>READY</Text></View>
        </View>
        <View style={[styles.demoSensorRow, styles.demoOfflineRow]}>
          <View style={[styles.demoDot, { backgroundColor: themes.textMuted }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.demoSeatTitle}>If connection is lost</Text>
            <Text style={styles.demoReadyText}>Monitoring cannot begin</Text>
          </View>
          <Text style={styles.demoOfflineText}>OFFLINE</Text>
        </View>
      </View>
    );
  }

  if (stepId === "start") {
    return (
      <View style={styles.demoPanel}>
        <Text style={styles.demoEyebrow}>READY TO BEGIN</Text>
        <View style={styles.demoStartButton}><Text style={styles.demoStartButtonText}>Start Monitoring</Text></View>
        <Text style={styles.demoHint}>In normal use, this action stays visible at the bottom of Seats.</Text>
      </View>
    );
  }

  return null;
}

export default function DriverGuideOverlay() {
  const { active, step, stepIndex, nextStep, previousStep, skipGuide, finishGuide } = useDriverGuide();
  const first = stepIndex === 0;
  const last = stepIndex === DRIVER_GUIDE_STEPS.length - 1;

  const onNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (last) void finishGuide();
    else nextStep();
  };

  return (
    <Modal
      visible={active && !!step}
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType="fade"
      onRequestClose={() => void skipGuide()}
    >
      <View style={styles.fullOverlay}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
          {step ? (
            <View style={styles.card}>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.progressRow}>
                  <Text style={styles.eyebrow}>{step.eyebrow}</Text>
                  <Text style={styles.progress}>{stepIndex + 1}/{DRIVER_GUIDE_STEPS.length}</Text>
                </View>

                <Text style={styles.title}>{step.title}</Text>
                <Text style={styles.body}>{step.body}</Text>

                <DemoPanel stepId={step.id} />

                {step.id === "alerts" ? (
                  <View style={styles.statusGrid}>
                    {STATUS_ITEMS.map((item) => (
                      <View key={item.label} style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.statusLabel, { color: item.color }]}>{item.label}</Text>
                          <Text style={styles.statusDetail}>{item.detail}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={first ? "Skip SafeSeat guide" : "Exit SafeSeat guide"}
                  onPress={() => void skipGuide()}
                  style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
                >
                  <Text style={styles.skipText}>{first ? "Skip" : "Exit Guide"}</Text>
                </Pressable>

                <View style={styles.rightActions}>
                  {!first ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Previous guide step"
                      onPress={() => {
                        void Haptics.selectionAsync();
                        previousStep();
                      }}
                      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.backText}>Back</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={first ? "Start guide" : last ? "Finish guide" : "Next guide step"}
                    onPress={onNext}
                    style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.nextText}>{first ? "Start Guide" : last ? "Finish" : "Next"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 9, 18, 0.78)",
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.two,
  },
  card: {
    width: "100%",
    maxHeight: "88%",
    minHeight: 360,
    borderRadius: 24,
    backgroundColor: "#101B2C",
    borderWidth: 1,
    borderColor: themes.primaryBorder,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 24,
    overflow: "hidden",
  },
  scroll: { flexShrink: 1 },
  scrollContent: {
    padding: spacing.two,
    gap: spacing.one,
  },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.one },
  eyebrow: { color: themes.primaryBttn, fontSize: 10, letterSpacing: 1.2, fontFamily: "Body-Bold" },
  progress: { color: themes.textMuted, fontSize: 10, fontFamily: "Body-Bold" },
  title: { color: themes.text, fontSize: 22, lineHeight: 27, fontFamily: "Body-Bold" },
  body: { color: themes.textSecondary, fontSize: 13.5, lineHeight: 20, fontFamily: "Body-Regular" },
  demoPanel: {
    marginTop: 2,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    gap: 9,
  },
  demoEyebrow: { color: themes.textMuted, fontSize: 9, letterSpacing: 0.9, fontFamily: "Body-Bold" },
  demoSeatRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  demoSeatTitle: { color: themes.text, fontSize: 13, fontFamily: "Body-Bold" },
  demoSeatSub: { color: themes.textSecondary, fontSize: 11, marginTop: 2, fontFamily: "Body-Regular" },
  demoStatusText: { fontSize: 10, marginTop: 3, letterSpacing: 0.7, fontFamily: "Body-Bold" },
  demoActionPill: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "rgba(31,210,149,0.12)", borderWidth: 1, borderColor: themes.primaryBorder },
  demoActionText: { color: themes.primaryBttn, fontSize: 9.5, letterSpacing: 0.8, fontFamily: "Body-Bold" },
  demoConsentButton: { alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: themes.primaryBttn },
  demoConsentButtonText: { color: themes.primaryBttnText, fontSize: 12, fontFamily: "Body-Bold" },
  demoHint: { color: themes.textMuted, fontSize: 10.5, lineHeight: 15, fontFamily: "Body-Regular" },
  demoSensorRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  demoOfflineRow: { marginTop: 2, paddingTop: 9, borderTopWidth: 1, borderTopColor: themes.divider },
  demoDot: { width: 9, height: 9, borderRadius: 5 },
  demoReadyText: { color: themes.textSecondary, fontSize: 11, marginTop: 2, fontFamily: "Body-Regular" },
  demoReadyPill: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 9, backgroundColor: "rgba(31,210,149,0.1)" },
  demoReadyPillText: { color: themes.primaryBttn, fontSize: 9, letterSpacing: 0.7, fontFamily: "Body-Bold" },
  demoOfflineText: { color: themes.textMuted, fontSize: 9, letterSpacing: 0.7, fontFamily: "Body-Bold" },
  demoStartButton: { alignItems: "center", paddingVertical: 11, borderRadius: 12, backgroundColor: themes.primaryBttn },
  demoStartButtonText: { color: themes.primaryBttnText, fontSize: 12.5, fontFamily: "Body-Bold" },
  demoMiniRows: { gap: 6 },
  demoMiniRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  demoMiniSeat: { color: themes.text, fontSize: 11.5, fontFamily: "Body-Bold" },
  demoMiniState: { fontSize: 9.5, letterSpacing: 0.7, fontFamily: "Body-Bold" },
  demoMiniEmpty: { color: themes.textMuted, fontSize: 9.5, letterSpacing: 0.7, fontFamily: "Body-Bold" },
  statusGrid: { gap: 7, marginTop: spacing.half },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 5 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusLabel: { fontSize: 10, letterSpacing: 0.8, fontFamily: "Body-Bold" },
  statusDetail: { color: themes.textSecondary, fontSize: 11.5, marginTop: 1, fontFamily: "Body-Regular" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.one + 2,
    borderTopWidth: 1,
    borderTopColor: themes.divider,
    backgroundColor: "#101B2C",
  },
  rightActions: { flexDirection: "row", alignItems: "center", gap: spacing.one },
  skipButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  skipText: { color: themes.textMuted, fontSize: fontsize.caption, fontFamily: "Body-Bold" },
  backButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 15, borderRadius: 12, backgroundColor: themes.secondaryBttn },
  backText: { color: themes.secondaryBttnText, fontSize: fontsize.caption, fontFamily: "Body-Bold" },
  nextButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 20, borderRadius: 13, backgroundColor: themes.primaryBttn },
  nextText: { color: themes.primaryBttnText, fontSize: 13, fontFamily: "Body-Bold" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});

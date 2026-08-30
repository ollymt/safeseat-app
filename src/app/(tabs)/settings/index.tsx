import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useUserPreferences } from "@/hooks/user-preferences-context";
import { useSafeSeatHub } from "@/hooks/safeseat-hub-context";
import { clearSession } from "@/utils/securitySession";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "@expo/ui";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import alternateEmailXml from "@expo/material-symbols/alternate_email.xml";
import asteriskXml from "@expo/material-symbols/asterisk.xml";
import callXml from "@expo/material-symbols/call.xml";
import deleteXml from "@expo/material-symbols/delete.xml";
import emergencyXml from "@expo/material-symbols/emergency.xml";
import favoriteXml from "@expo/material-symbols/favorite.xml";
import groupsXml from "@expo/material-symbols/groups.xml";
import powerSettingsNewXml from "@expo/material-symbols/power_settings_new.xml";
import rulerXml from "@expo/material-symbols/straighten.xml";
import settingsXml from "@expo/material-symbols/settings.xml";
import shieldXml from "@expo/material-symbols/shield.xml";
import visibilityXml from "@expo/material-symbols/visibility.xml";

import ChangeEmailModal from "@/components/change-email-modal";
import ChangePasswordModal from "@/components/change-password-modal";
import ChangePhoneModal from "@/components/change-phone-modal";
import EscalationWindowControl from "@/components/escalation-window-control";
import MiniTab from "@/components/mini-tab";
import SettingPageItem from "@/components/setting-page-item";
import SettingSwitch from "@/components/setting-switch";
import { auth, db } from "../../../firebase";

const IS_LOCKED_IN_KEY = "isLockedIn";
const SEAT_ASSIGNMENTS_KEY = "seatAssignments";
const SEAT_STATUSES_KEY = "seatStatuses";
const HARDWARE_SEAT_KEY = "safeSeatHardwareSeatNo";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = 88 + insets.bottom;
  const { connected: hubConnected, telemetryReady } = useSafeSeatHub();

  const [currentTab, setCurrentTab] = useState(0);
  const [userEmail, setUserEmail] = useState("Not set");
  const [userPhone, setUserPhone] = useState("Not set");
  const [isLockedIn, setIsLockedIn] = useState(false);

  const [changeEmailVisible, setChangeEmailVisible] = useState(false);
  const [changePhoneVisible, setChangePhoneVisible] = useState(false);
  const [changePassVisible, setChangePassVisible] = useState(false);

  const {
    consent,
    setConsent,
    behavioralMonitoring,
    setBehavioralMonitoring,
    physiologicalMonitoring,
    setPhysiologicalMonitoring,
    eventCameraVerification,
    setEventCameraVerification,
    gpsSharing,
    setGpsSharing,
    emergencyEscalation,
    setEmergencyEscalation,
    escalationWindowSeconds,
    setEscalationWindowSeconds,
    useMetric,
    setUseMetric,
  } = useUserPreferences();

  const loadAllUserData = useCallback(async () => {
    try {
      const rawLockedIn = await AsyncStorage.getItem(IS_LOCKED_IN_KEY);
      setIsLockedIn(rawLockedIn ? JSON.parse(rawLockedIn) : false);

      const currentUser = auth.currentUser;
      if (!currentUser) return;

      if (currentUser.email) setUserEmail(currentUser.email);

      const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.email) setUserEmail(userData.email);
        if (userData.phone) setUserPhone(userData.phone);
      }
    } catch (error) {
      console.error("Failed to load Settings data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAllUserData();
    }, [loadAllUserData]),
  );

  const clearSeatAssignments = () => {
    if (isLockedIn) return;

    Alert.alert(
      "Clear seat assignments?",
      "This removes saved assignments and seat states for the current session. Saved profiles and emergency contacts stay intact.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                SEAT_ASSIGNMENTS_KEY,
                SEAT_STATUSES_KEY,
                IS_LOCKED_IN_KEY,
                HARDWARE_SEAT_KEY,
              ]);
              setIsLockedIn(false);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Cleared", "Seat assignments were reset.");
            } catch (error) {
              console.error("Failed to clear seat assignments:", error);
              Alert.alert("Could not clear", "Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    if (isLockedIn) return;

    Alert.alert(
      "Log out?",
      "Local trip data on this device will be cleared before returning to the login screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              await clearSession();
              await AsyncStorage.multiRemove([
                SEAT_ASSIGNMENTS_KEY,
                SEAT_STATUSES_KEY,
                IS_LOCKED_IN_KEY,
                HARDWARE_SEAT_KEY,
                "app_emergency_contacts",
                "userPreferences",
              ]);
              await Promise.all([
                SecureStore.deleteItemAsync("user_health_profile"),
                SecureStore.deleteItemAsync("user_privacy_prefs"),
                SecureStore.deleteItemAsync("user_local_app_prefs"),
                SecureStore.deleteItemAsync("is_logged_in"),
              ]);
              router.replace("/(auth)/login");
            } catch (error) {
              console.error("Failed to log out:", error);
              Alert.alert("Log out failed", "Please try again.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.container}>
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>PREFERENCES</Text>
            <Text style={styles.pageHeader}>Settings</Text>
            <Text style={styles.pageSubhead}>
              Control monitoring, privacy, and emergency behavior without exposing raw sensor data.
            </Text>
          </View>

          <MiniTab
            values={["Account", "Safety", "App"]}
            selectedIndex={currentTab}
            onChange={(index) => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
              setCurrentTab(index);
            }}
          />

          {currentTab === 0 && (
            <View style={styles.group}>
              <Text style={styles.sectionTitle}>ACCOUNT</Text>
              <View style={styles.settingGroup}>
                <SettingPageItem
                  name="Email"
                  iconName={Icon.select({ ios: "at", android: alternateEmailXml })}
                  value={userEmail}
                  onPress={() => setChangeEmailVisible(true)}
                  showChevron
                />
                <SettingPageItem
                  name="Phone"
                  iconName={Icon.select({ ios: "phone.fill", android: callXml })}
                  value={userPhone}
                  onPress={() => setChangePhoneVisible(true)}
                  showChevron
                />
                <SettingPageItem
                  name="Password"
                  iconName={Icon.select({ ios: "asterisk", android: asteriskXml })}
                  onPress={() => setChangePassVisible(true)}
                  showChevron
                  isLast
                />
              </View>
              <Text style={styles.caption}>
                Account details are separate from session-only occupant monitoring.
              </Text>
            </View>
          )}

          {currentTab === 1 && (
            <View style={styles.group}>
              <View style={styles.featureCard}>
                <View style={styles.featureDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>Privacy-first monitoring</Text>
                  <Text style={styles.featureCopy}>
                    The event camera is a verification layer, not continuous surveillance. Alert controls remain advisory and non-diagnostic.
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>MONITORING</Text>
              <View style={styles.settingGroup}>
                <SettingSwitch
                  name="Behavioral Monitoring"
                  iconName={Icon.select({ ios: "shield.fill", android: shieldXml })}
                  value={behavioralMonitoring}
                  onValueChange={(value) => void setBehavioralMonitoring(value)}
                />
                <SettingSwitch
                  name="Physiological Monitoring"
                  iconName={Icon.select({ ios: "waveform.path.ecg", android: favoriteXml })}
                  value={physiologicalMonitoring}
                  onValueChange={(value) => void setPhysiologicalMonitoring(value)}
                />
                <SettingSwitch
                  name="Event Camera Verification"
                  iconName={Icon.select({ ios: "camera.fill", android: visibilityXml })}
                  value={eventCameraVerification}
                  onValueChange={(value) => void setEventCameraVerification(value)}
                  isLast
                />
              </View>
              <Text style={styles.caption}>
                These preferences are saved in the app. The deployed Main Hub telemetry API is currently read-only, so the runtime remains the authority until a deliberate hardware-control channel is added.
              </Text>

              <Text style={styles.sectionTitle}>SHARING & ESCALATION</Text>
              <View style={styles.settingGroup}>
                <SettingSwitch
                  name="Share Occupant Status"
                  iconName={Icon.select({ ios: "person.2.fill", android: groupsXml })}
                  value={consent}
                  onValueChange={(value) => void setConsent(value)}
                />
                <SettingSwitch
                  name="GPS Sharing During Emergency"
                  iconName={Icon.select({ ios: "location.fill", android: shieldXml })}
                  value={gpsSharing}
                  onValueChange={(value) => void setGpsSharing(value)}
                />
                <SettingSwitch
                  name="Automated SMS Escalation"
                  iconName={Icon.select({ ios: "message.fill", android: emergencyXml })}
                  value={emergencyEscalation}
                  onValueChange={(value) => void setEmergencyEscalation(value)}
                />
                <SettingPageItem
                  name="Context-Aware Escalation"
                  iconName={Icon.select({ ios: "person.2.badge.gearshape.fill", android: shieldXml })}
                  value="Automatic"
                  isLast
                />
              </View>

              <View style={styles.smsNote}>
                <Text style={styles.smsTitle}>SMS only</Text>
                <Text style={styles.smsCopy}>
                  SafeSeat will not place an automated voice call. The planned automated escalation is an SMS to the driver&apos;s primary emergency contact only for a confirmed driver-alone emergency. Passenger occupancy is evaluated automatically so a passenger alert stays driver-first.
                </Text>
              </View>

              <EscalationWindowControl
                value={escalationWindowSeconds}
                enabled={emergencyEscalation}
                onValueChange={(value) => void setEscalationWindowSeconds(value)}
              />

              <View style={styles.settingGroup}>
                <SettingPageItem
                  name="Profiles & Emergency Contacts"
                  iconName={Icon.select({ ios: "person.2.fill", android: groupsXml })}
                  onPress={() => router.push("/(tabs)/everyone" as any)}
                  showChevron
                  isLast
                />
              </View>
            </View>
          )}

          {currentTab === 2 && (
            <View style={styles.group}>
              <Text style={styles.sectionTitle}>SYSTEM</Text>
              <View style={styles.settingGroup}>
                <SettingPageItem
                  name="System Self-Diagnostic"
                  iconName={Icon.select({ ios: "waveform.path.ecg", android: settingsXml })}
                  value={hubConnected ? (telemetryReady ? "Live" : "Warming") : "Offline"}
                  onPress={() => router.push("/(tabs)/settings/diagnostics" as any)}
                  showChevron
                />
                <SettingPageItem
                  name="System Status"
                  iconName={Icon.select({ ios: "checkmark.shield.fill", android: shieldXml })}
                  value={hubConnected ? (telemetryReady ? "Main Hub live" : "Hub warming") : "App ready"}
                  isLast
                />
              </View>
              <Text style={styles.caption}>
                Self-Diagnostic now reads live Main Hub and module-health telemetry whenever this phone is connected to the SafeSeat local network.
              </Text>

              <Text style={styles.sectionTitle}>APP</Text>
              <View style={styles.settingGroup}>
                <SettingSwitch
                  name="Use Metric Units"
                  iconName={Icon.select({ ios: "ruler.fill", android: rulerXml })}
                  value={useMetric}
                  onValueChange={(value) => void setUseMetric(value)}
                  isLast
                />
              </View>

              <Text style={styles.sectionTitle}>SESSION</Text>
              <View style={styles.settingGroup}>
                <SettingPageItem
                  name="Clear Seat Assignments"
                  iconName={Icon.select({ ios: "trash", android: deleteXml })}
                  enabled={!isLockedIn}
                  onPress={clearSeatAssignments}
                />
                <SettingPageItem
                  name="Log out"
                  iconName={Icon.select({ ios: "rectangle.portrait.and.arrow.right", android: powerSettingsNewXml })}
                  enabled={!isLockedIn}
                  destructive
                  onPress={handleLogout}
                  isLast
                />
              </View>

              {isLockedIn && (
                <Text style={styles.caption}>
                  End the active monitoring session before clearing assignments or logging out.
                </Text>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerBrand}>SafeSeat</Text>
            <Text style={styles.captionCenter}>Non-diagnostic occupant safety monitoring • v1.2</Text>
          </View>

          <ChangeEmailModal
            visible={changeEmailVisible}
            onClose={() => setChangeEmailVisible(false)}
            onSuccess={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setChangeEmailVisible(false);
              void loadAllUserData();
            }}
          />
          <ChangePhoneModal
            visible={changePhoneVisible}
            onClose={() => setChangePhoneVisible(false)}
            onSuccess={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setChangePhoneVisible(false);
              void loadAllUserData();
            }}
          />
          <ChangePasswordModal
            visible={changePassVisible}
            onClose={() => setChangePassVisible(false)}
            onSuccess={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setChangePassVisible(false);
              void loadAllUserData();
            }}
          />
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
  headerBlock: {
    gap: spacing.half,
  },
  eyebrow: {
    color: themes.primaryBttn,
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "Body-Bold",
  },
  pageHeader: {
    fontSize: fontsize.pageHeader,
    fontFamily: "Logo-Font",
    color: themes.text,
  },
  pageSubhead: {
    color: themes.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Body-Regular",
    maxWidth: 520,
  },
  group: {
    gap: spacing.one,
  },
  sectionTitle: {
    color: themes.textMuted,
    fontFamily: "Body-Bold",
    fontSize: 11,
    letterSpacing: 1.25,
    marginLeft: spacing.half,
    marginTop: spacing.one,
  },
  settingGroup: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: themes.divider,
  },
  caption: {
    fontFamily: "Body-Regular",
    fontSize: fontsize.caption,
    lineHeight: 17,
    color: themes.textSecondary,
    paddingHorizontal: spacing.half,
  },
  captionCenter: {
    fontFamily: "Body-Regular",
    fontSize: fontsize.caption,
    lineHeight: 17,
    color: themes.textSecondary,
    textAlign: "center",
  },
  featureCard: {
    flexDirection: "row",
    gap: spacing.one,
    padding: spacing.two,
    borderRadius: 18,
    backgroundColor: themes.primarySoft,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
  },
  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: themes.primaryBttn,
    marginTop: 5,
  },
  featureTitle: {
    color: themes.text,
    fontSize: fontsize.body,
    fontFamily: "Body-Bold",
  },
  featureCopy: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 18,
    marginTop: spacing.half,
    fontFamily: "Body-Regular",
  },
  smsNote: {
    padding: spacing.two,
    borderRadius: 16,
    backgroundColor: themes.surfaceSoft,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  smsTitle: {
    color: themes.primaryBttn,
    fontSize: fontsize.caption,
    fontFamily: "Body-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  smsCopy: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    lineHeight: 18,
    marginTop: spacing.half,
    fontFamily: "Body-Regular",
  },
  footer: {
    alignItems: "center",
    marginTop: spacing.two,
    gap: spacing.half,
    paddingVertical: spacing.three,
  },
  footerBrand: {
    color: themes.text,
    fontFamily: "Logo-Font",
    fontSize: fontsize.header,
  },
});

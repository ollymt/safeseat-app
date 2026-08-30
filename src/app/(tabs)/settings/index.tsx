import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { useUserPreferences } from "@/hooks/user-preferences-context";
import { clearSession } from "@/utils/securitySession";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "@expo/ui";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
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

import ChangeEmailModal from "@/components/change-email-modal";
import ChangePasswordModal from "@/components/change-password-modal";
import ChangePhoneModal from "@/components/change-phone-modal";
import MiniTab from "@/components/mini-tab";
import SettingPageItem from "@/components/setting-page-item";
import SettingSwitch from "@/components/setting-switch";
import { auth, db } from "../../../firebase";

const IS_LOCKED_IN_KEY = "isLockedIn";
const SEAT_ASSIGNMENTS_KEY = "seatAssignments";
const SEAT_STATUSES_KEY = "seatStatuses";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = 88 + insets.bottom;

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
    emergencyEscalation,
    setEmergencyEscalation,
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
      "This removes the saved people and seat states for the current trip. Your profiles and emergency contacts will not be deleted.",
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
      "Local trip data on this device will be cleared before you return to the login screen.",
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themes.background }}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, marginTop: spacing.one, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator
        bounces
      >
        <View style={styles.container}>
          <Text style={styles.pageHeader}>Settings</Text>

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
                Keep these details current so your SafeSeat account can be recovered and contacted correctly.
              </Text>
            </View>
          )}

          {currentTab === 1 && (
            <View style={styles.group}>
              <Text style={styles.sectionTitle}>MONITORING & EMERGENCY</Text>

              <View style={styles.settingGroup}>
                <SettingSwitch
                  name="Share Occupant Status"
                  iconName={Icon.select({ ios: "heart.fill", android: favoriteXml })}
                  value={consent}
                  onValueChange={(value) => void setConsent(value)}
                />
                <SettingSwitch
                  name="Emergency Escalation"
                  iconName={Icon.select({ ios: "cross.case.fill", android: emergencyXml })}
                  value={emergencyEscalation}
                  onValueChange={(value) => void setEmergencyEscalation(value)}
                  isLast
                />
              </View>

              <Text style={styles.caption}>
                Occupant Status controls whether non-driver status is shown in the app. Emergency Escalation stores whether configured alert escalation should be used when an emergency is confirmed.
              </Text>

              <View style={styles.settingGroup}>
                <SettingPageItem
                  name="Manage People & Contacts"
                  iconName={Icon.select({ ios: "person.2.fill", android: groupsXml })}
                  onPress={() => router.push("/(tabs)/everyone")}
                  showChevron
                  isLast
                />
              </View>
            </View>
          )}

          {currentTab === 2 && (
            <View style={styles.group}>
              <Text style={styles.sectionTitle}>APP PREFERENCES</Text>

              <View style={styles.settingGroup}>
                <SettingSwitch
                  name="Use Metric Units"
                  iconName={Icon.select({ ios: "ruler.fill", android: rulerXml })}
                  value={useMetric}
                  onValueChange={(value) => void setUseMetric(value)}
                  isLast
                />
              </View>

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
                  Unbuckle the current trip before clearing assignments or logging out.
                </Text>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerBrand}>SafeSeat</Text>
            <Text style={styles.caption}>Final redesign • v1.0.0</Text>
            <Text
              style={styles.footerLink}
              onPress={() => void Linking.openURL("https://github.com/ollymt/safeseat-app")}
            >
              Project repository
            </Text>
            <Text style={styles.footerHeart}>made with 💚 by the SafeSeat team</Text>
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
  container: {
    flex: 1,
    width: "100%",
    paddingHorizontal: spacing.two,
    gap: spacing.three,
  },
  pageHeader: {
    fontSize: fontsize.pageHeader,
    fontFamily: "Logo-Font",
    color: themes.text,
  },
  group: {
    gap: spacing.one,
  },
  sectionTitle: {
    color: themes.primaryBttn,
    fontFamily: "Body-Bold",
    fontSize: fontsize.caption,
    letterSpacing: 1.1,
    marginLeft: spacing.half,
  },
  settingGroup: {
    borderRadius: spacing.edge,
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
  footer: {
    alignItems: "center",
    marginTop: spacing.two,
    gap: spacing.half,
    paddingVertical: spacing.two,
  },
  footerBrand: {
    color: themes.text,
    fontFamily: "Logo-Font",
    fontSize: fontsize.header,
  },
  footerLink: {
    color: themes.primaryBttn,
    fontFamily: "Body-Medium",
    fontSize: fontsize.caption,
    textDecorationLine: "underline",
  },
  footerHeart: {
    color: themes.textSecondary,
    fontFamily: "Body-Regular",
    fontSize: fontsize.caption,
  },
});

import { Themes } from "@/constants/theme";
import { useRouter } from "expo-router";
import {
	Alert,
	Dimensions,
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@expo/ui";
import { useEffect, useState } from "react";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

import SettingDatePickerItem from "@/components/setting-date-picker";
import SettingPageItem from "@/components/setting-page-item";
import SettingPicker from "@/components/setting-picker";
import SettingSwitch from "@/components/setting-switch";

import PasswordVerifyModal from "@/components/PasswordVerifyModal";
import { isSessionValid } from "@/utils/securitySession";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

export default function Settings() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const router = useRouter();

  // 1. Core Account States
  const [userName, setUserName] = useState<string>("Guest");
  const [userEmail, setUserEmail] = useState<string>("Not Set");
  const [userPhone, setUserPhone] = useState<string>("Not Set");

  // 2. Health Metrics States
  const [birthday, setBirthday] = useState<string>("Jan 01, 2000");
  const [height, setHeight] = useState<string>("Not Set");
  const [weight, setWeight] = useState<string>("Not Set");
  const [bloodType, setBloodType] = useState<string>("Not Set");
  const [allergies, setAllergies] = useState<string>("None Stored");

  // 3. Privacy Preferences States
  const [consent, setConsent] = useState<boolean>(false);
  const [emergencyEscalation, setEmergencyEscalation] = useState<boolean>(true);

  const [heightIsExpanded, setHeightIsExpanded] = useState(false);

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // 🌟 4. State flag controlling the full-page picker visibility
  const [bloodPickerVisible, setBloodPickerVisible] = useState(false);

  // Fetch everything from Firestore when the component mounts
  useEffect(() => {
    async function loadAllUserData() {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // Core account fields
            if (userData.name) setUserName(userData.name);
            if (userData.email) setUserEmail(userData.email);
            if (userData.phone) setUserPhone(userData.phone);

            // Health fields
            if (userData.birthday) setBirthday(userData.birthday);
            if (userData.height) setHeight(userData.height);
            if (userData.weight) setWeight(userData.weight);
            if (userData.bloodType) setBloodType(userData.bloodType);
            if (userData.allergies) setAllergies(userData.allergies);

            // Privacy fields
            if (userData.consent !== undefined) setConsent(userData.consent);
            if (userData.emergencyEscalation !== undefined)
              setEmergencyEscalation(userData.emergencyEscalation);
          }
        }
      } catch (error) {
        console.error("Failed to load user profile data:", error);
      }
    }

    loadAllUserData();
  }, []);

  // Helper to persist a single field to the current user's Firestore document
  const saveUserField = async (key: string, val: string | boolean) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { [key]: val }, { merge: true });
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  };

  // Dynamic execution router wrapped around security layer
  const executeSecureAction = async (action: () => void) => {
    console.log("execute secure action triggered");
    const authenticated = await isSessionValid();

    if (authenticated) {
      action();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPendingAction(() => () => action());
      setAuthModalVisible(true);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentTheme.background,
      }}
      edges={["left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={[styles.container, { marginTop: -40 }]}>
          <Text style={[styles.pageHeader, { color: currentTheme.text }]}>
            Settings
          </Text>
          <View
            style={{
              gap: 20,
              marginTop: 10,
              width: "100%",
              borderWidth: 0,
              borderColor: currentTheme.secondaryBttn,
              borderRadius: 10,
            }}
          >
            <View>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                ACCOUNT
              </Text>
              <View style={{ borderRadius: 12, overflow: "hidden" }}>
                <SettingPageItem
                  name="Name"
                  iconName={Icon.select({
                    ios: "person.fill",
                    android: import("@expo/material-symbols/person.xml"),
                  })}
                  value={userName}
                />

                <SettingPageItem
                  name="Email"
                  iconName={Icon.select({
                    ios: "at",
                    android:
                      import("@expo/material-symbols/alternate_email.xml"),
                  })}
                  value={userEmail}
                  onPress={() => {
                    console.log("change email pressed");
                    executeSecureAction(() => {
                      console.log("Opening email editor freely...");
                      router.push("/(tabs)/settings/changeemail");
                    });
                  }}
                />

                <SettingPageItem
                  name="Phone Number"
                  iconName={Icon.select({
                    ios: "phone.fill",
                    android: import("@expo/material-symbols/phone_enabled.xml"),
                  })}
                  value={userPhone}
                  onPress={() => {
                    console.log("change phone pressed");
                    executeSecureAction(() => {
                      console.log("Opening phone editor freely...");
                    });
                  }}
                />

                <SettingPageItem
                  name="Password"
                  iconName={Icon.select({
                    ios: "asterisk",
                    android: import("@expo/material-symbols/asterisk.xml"),
                  })}
                  showChevron={true}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/(tabs)/settings/changepass");
                  }}
                />

                <SettingPageItem
                  name="Emergency Contacts"
                  iconName={Icon.select({
                    ios: "person.crop.circle.fill",
                    android:
                      import("@expo/material-symbols/account_circle.xml"),
                  })}
                  isLast={true}
                  showChevron={true}
                  onPress={() => {
                    console.log("change econ pressed");
                    executeSecureAction(() => {
                      console.log("Opening econ editor freely...");
                    });
                  }}
                />
              </View>
            </View>

            <View>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                HEALTH
              </Text>
              <View style={{ borderRadius: 12, overflow: "hidden" }}>
                <SettingDatePickerItem
                  name="Birthday"
                  iconName={Icon.select({
                    ios: "birthday.cake.fill",
                    android: import("@expo/material-symbols/cake.xml"),
                  })}
                  value={birthday}
                  onValueChange={(dateStr) => {
                    console.log("birthday changed");
                    setBirthday(dateStr);
                    saveUserField("birthday", dateStr);
                  }}
                />

                <SettingPageItem
                  name="Height"
                  iconName={Icon.select({
                    ios: "lines.measurement.vertical",
                    android: import("@expo/material-symbols/height.xml"),
                  })}
                  value={height}
                />

                <SettingPageItem
                  name="Weight"
                  iconName={Icon.select({
                    ios: "scalemass.fill",
                    android: import("@expo/material-symbols/scale.xml"),
                  })}
                  value={weight}
                />

                {/* 🛠️ Wired up with lifted visibility states & secure authentication gate */}
                <SettingPicker
                  name="Blood Type"
                  iconName={Icon.select({
                    ios: "drop.fill",
                    android: import("@expo/material-symbols/opacity.xml"),
                  })}
                  isLast={false}
                  value={bloodType}
                  isOpen={bloodPickerVisible}
                  onClose={() => setBloodPickerVisible(false)}
                  onValueChange={(type) => {
                    setBloodType(type);
                    saveUserField("bloodType", type);
                  }}
                  onPress={() => {
                    executeSecureAction(() => {
                      // Secure action clears completely before shifting view state
                      setBloodPickerVisible(true);
                    });
                  }}
                />

                <SettingPageItem
                  name="Allergies"
                  iconName={Icon.select({
                    ios: "nosign",
                    android: import("@expo/material-symbols/block.xml"),
                  })}
                  value={allergies}
                  showChevron={true}
                  isLast={true}
                  onPress={() => {
                    console.log("change allergies pressed");
                    executeSecureAction(() => {
                      console.log("Opening allergies editor freely...");
                    });
                  }}
                />
              </View>
            </View>

            <View>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                PRIVACY
              </Text>
              <View style={{ gap: 20 }}>
                <View style={{ gap: 6 }}>
                  <View style={{ borderRadius: 12, overflow: "hidden" }}>
                    <SettingSwitch
                      name="Data Sharing Consent"
                      iconName={Icon.select({
                        ios: "hand.raised.fill",
                        android:
                          import("@expo/material-symbols/front_hand.xml"),
                      })}
                      isLast={true}
                      value={consent}
                      onValueChange={(val) => {
                        setConsent(val);
                        saveUserField("consent", val);
                      }}
                    />
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 0 }}>
                    <Text
                      style={[
                        styles.caption,
                        { color: currentTheme.textSecondary },
                      ]}
                    >
                      Authorize real-time synchronization with secure cloud
                      nodes.
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <View style={{ borderRadius: 12, overflow: "hidden" }}>
                    <SettingSwitch
                      name="Emergency Escalation"
                      iconName={Icon.select({
                        ios: "exclamationmark.triangle.fill",
                        android:
                          import("@expo/material-symbols/front_hand.xml"),
                      })}
                      isLast={true}
                      value={emergencyEscalation}
                      onValueChange={(val) => {
                        setEmergencyEscalation(val);
                        saveUserField("emergencyEscalation", val);
                      }}
                    />
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 0 }}>
                    <Text
                      style={[
                        styles.caption,
                        { color: currentTheme.textSecondary },
                      ]}
                    >
                      Automatic alert routing to nearest response center if
                      unresponsive.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                APP
              </Text>
              <View style={{ gap: 20 }}>
                <View style={{ gap: 6 }}>
                  <View style={{ borderRadius: 12, overflow: "hidden" }}>
                    <SettingPageItem
                      name="Dark Theme"
                      iconName={Icon.select({
                        ios: "moon.fill",
                        android: import("@expo/material-symbols/dark_mode.xml"),
                      })}
                      enabled={false}
                      isLast={true}
                    />
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 0 }}>
                    <Text
                      style={[
                        styles.caption,
                        { color: currentTheme.textSecondary },
                      ]}
                    >
                      You can change your theme in the Settings app.
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <View style={{ borderRadius: 12, overflow: "hidden" }}>
                    <SettingPageItem
                      name="Sign-out"
                      iconName={Icon.select({
                        ios: "power",
                        android:
                          import("@expo/material-symbols/power_settings_new.xml"),
                      })}
                      isLast={false}
                      onPress={() => {
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Warning,
                        );
                        Alert.alert(
                          "Are you sure you want to sign out?",
                          "You will have to sign in again next time.",
                          [
                            {
                              text: "No",
                              style: "cancel",
                            },
                            {
                              text: "Yes",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  await SecureStore.deleteItemAsync(
                                    "is_logged_in",
                                  );
                                  await SecureStore.deleteItemAsync(
                                    "security_session_token",
                                  );
                                  Haptics.notificationAsync(
                                    Haptics.NotificationFeedbackType.Success,
                                  );
                                  router.replace("/(auth)/login");
                                } catch (error) {
                                  Alert.alert(
                                    "Error",
                                    "Could not complete sign out process safely.",
                                  );
                                  console.error(error);
                                }
                              },
                            },
                          ],
                        );
                      }}
                    />
                    <SettingPageItem
                      name="Delete Account"
                      iconName={Icon.select({
                        ios: "trash.fill",
                        android: import("@expo/material-symbols/delete.xml"),
                      })}
                      isLast={true}
                      destructive={true}
                    />
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 0 }}>
                    <Text
                      style={[
                        styles.caption,
                        { color: currentTheme.textSecondary },
                      ]}
                    >
                      Permanently delete your account. This action cannot be
                      undone.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <PasswordVerifyModal
            visible={authModalVisible}
            onClose={() => {
              setAuthModalVisible(false);
              setPendingAction(null);
            }}
            onSuccess={() => {
              setAuthModalVisible(false);
              if (pendingAction) {
                pendingAction();
                setPendingAction(null);
              }
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
    padding: 20,
    borderWidth: 0,
    borderColor: "#fff",
  },
  logoSection: {
    height: "35%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  formSection: {
    width: "100%",
    flex: 1,
  },
  loginlogo: {
    fontSize: 60,
    fontFamily: "Logo-Font",
    textAlign: "center",
  },
  pageHeader: {
    fontSize: 40,
    fontFamily: "Logo-Font",
  },
  infoLabel: {
    fontFamily: "Condensed-Bold",
    fontSize: 14,
    margin: 0,
    marginBottom: 8,
  },
  caption: {
    fontFeatureSettings: "Body-Medium",
    opacity: 0.8,
    fontSize: 13,
  },
});

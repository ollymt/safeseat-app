import { Themes } from "@/constants/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
	Dimensions,
	Image,
	Keyboard,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Host, Picker, Row, TextInput } from "@expo/ui";
import {
	buttonBorderShape,
	buttonStyle,
	controlSize,
	keyboardType,
} from "@expo/ui/swift-ui/modifiers";

import TextBlock from "@/components/text-block";
import { useCallback, useEffect, useState } from "react";

import PasswordVerifyModal from "@/components/PasswordVerifyModal";
import { isSessionValid } from "@/utils/securitySession";
import * as SecureStore from "expo-secure-store";

import * as Haptics from "expo-haptics";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { DatePicker } from "@expo/ui/swift-ui";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

const BLOOD_TYPE_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Profile() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const router = useRouter();

  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const isSubProfile = !!profileId;
  const cacheKey = isSubProfile
    ? `profile_${profileId}`
    : "user_health_profile";

  // 1. Core Account States
  const [userName, setUserName] = useState<string>("Guest");
  const [userIcon, setUserIcon] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("Not Set");
  const [userPhone, setUserPhone] = useState<string>("Not Set");

  // 2. Health Metrics States (Stored as pure numeric strings in metric/cm/kg internally)
  const [height, setHeight] = useState<string>("Not Set");
  const [weight, setWeight] = useState<string>("Not Set");
  const [bloodType, setBloodType] = useState<string>("Not Set");
  const [allergies, setAllergies] = useState<string>("None Stored");
  const [birthday, setBirthday] = useState<string>("Not Set");

  // 3. Unit Preference State
  const [isMetric, setIsMetric] = useState<boolean>(true);

  // 4. UI Interaction State
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const loadAllUserData = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const savedPrivacyString =
        await SecureStore.getItemAsync("user_privacy_prefs");
      if (savedPrivacyString) {
        const savedPrivacy = JSON.parse(savedPrivacyString);
        if (savedPrivacy.useMetric !== undefined)
          setIsMetric(savedPrivacy.useMetric);
      }

      const cachedHealth = await SecureStore.getItemAsync(cacheKey);
      if (cachedHealth) {
        const localData = JSON.parse(cachedHealth);
        setUserName(localData.name || "Guest");
        setUserIcon(localData.icon || localData.pfp || "Not Set");
        setUserEmail(localData.email || "Not Set");
        setUserPhone(localData.phone || "Not Set");
        setBirthday(localData.birthday || "Not Set");
        setHeight(localData.height || "Not Set");
        setWeight(localData.weight || "Not Set");
        setBloodType(localData.bloodType || "Not Set");
        setAllergies(localData.allergies || "None Stored");
      }

      const settingsDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "settings",
        "preferences",
      );
      const settingsDocSnap = await getDoc(settingsDocRef);
      if (settingsDocSnap.exists()) {
        const settingsData = settingsDocSnap.data();
        if (settingsData.useMetric !== undefined) {
          setIsMetric(settingsData.useMetric);
          await SecureStore.setItemAsync(
            "user_privacy_prefs",
            JSON.stringify({ useMetric: settingsData.useMetric }),
          );
        }
      }

      let cloudData: any = null;
      if (isSubProfile) {
        const profileDocRef = doc(
          db,
          "users",
          currentUser.uid,
          "profiles",
          profileId as string,
        );
        const profileDocSnap = await getDoc(profileDocRef);
        if (profileDocSnap.exists()) {
          cloudData = profileDocSnap.data();
        }
      } else {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          cloudData = userDocSnap.data();
        }
      }

      if (cloudData) {
        const nameVal = cloudData.name || "Guest";
        const iconVal = cloudData.icon || "Not Set";
        const emailVal = cloudData.email || "Not Set";
        const phoneVal = cloudData.phone || "Not Set";
        const bdayVal = cloudData.birthday || "Not Set";

        const heightVal =
          cloudData.heightCm !== undefined
            ? `${cloudData.heightCm}`
            : cloudData.height || "Not Set";
        const weightVal =
          cloudData.weightKg !== undefined
            ? `${cloudData.weightKg}`
            : cloudData.weight || "Not Set";
        const bloodVal = cloudData.bloodType || "Not Set";
        const allergyVal = cloudData.allergies || "None Stored";

        setUserName(nameVal);
        setUserIcon(iconVal);
        setUserEmail(emailVal);
        setUserPhone(phoneVal);
        setBirthday(bdayVal);
        setHeight(heightVal);
        setWeight(weightVal);
        setBloodType(bloodVal);
        setAllergies(allergyVal);

        const combinedProfile = {
          name: nameVal,
          icon: iconVal,
          email: emailVal,
          phone: phoneVal,
          birthday: bdayVal,
          height: heightVal,
          weight: weightVal,
          bloodType: bloodVal,
          allergies: allergyVal,
        };
        await SecureStore.setItemAsync(
          cacheKey,
          JSON.stringify(combinedProfile),
        );
      }
    } catch (error) {
      console.error("Error syncing cache with Firestore:", error);
    }
  }, [profileId, cacheKey, isSubProfile]);

  useFocusEffect(
    useCallback(() => {
      loadAllUserData();
    }, [loadAllUserData]),
  );

  const handleSaveChanges = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const updatedProfile = {
        name: userName,
        icon: userIcon,
        email: userEmail,
        phone: userPhone,
        birthday: birthday,
        height: height,
        weight: weight,
        bloodType: bloodType,
        allergies: allergies,
      };

      await SecureStore.setItemAsync(cacheKey, JSON.stringify(updatedProfile));

      const cleanHeightNum =
        height !== "Not Set"
          ? parseFloat(height.replace(/[^0-9.]/g, ""))
          : null;
      const cleanWeightNum =
        weight !== "Not Set"
          ? parseFloat(weight.replace(/[^0-9.]/g, ""))
          : null;

      const firestorePayload: any = {
        name: userName,
        email: userEmail,
        phone: userPhone,
        birthday: birthday,
        bloodType: bloodType,
        allergies: allergies,
      };

      if (cleanHeightNum !== null && !isNaN(cleanHeightNum)) {
        firestorePayload.heightCm = cleanHeightNum;
        firestorePayload.height = String(cleanHeightNum);
      }
      if (cleanWeightNum !== null && !isNaN(cleanWeightNum)) {
        firestorePayload.weightKg = cleanWeightNum;
        firestorePayload.weight = String(cleanWeightNum);
      }

      const profileDocRef = isSubProfile
        ? doc(db, "users", currentUser.uid, "profiles", profileId as string)
        : doc(db, "users", currentUser.uid);

      await updateDoc(profileDocRef, firestorePayload);
      setEditMode(false);
    } catch (error) {
      console.error("Failed to save changes:", error);
    }
  };

  const getDisplayHeight = () => {
    if (!height || height === "Not Set") return "Not Set";
    const cmValue = parseFloat(height.replace(/[^0-9.]/g, ""));
    if (isNaN(cmValue)) return height;

    if (isMetric) {
      return `${cmValue} cm`;
    } else {
      const totalInches = cmValue / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}' ${inches}"`;
    }
  };

  const getDisplayWeight = () => {
    if (!weight || weight === "Not Set") return "Not Set";
    const kgValue = parseFloat(weight.replace(/[^0-9.]/g, ""));
    if (isNaN(kgValue)) return weight;

    if (isMetric) {
      return `${kgValue} kg`;
    } else {
      const lbsValue = Math.round(kgValue * 2.20462);
      return `${lbsValue} lbs`;
    }
  };

  const getFormattedDate = () => {
    if (!birthday || birthday === "Not Set") return "Not Set";
    const parsedDate = new Date(birthday);
    if (isNaN(parsedDate.getTime())) return birthday;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(parsedDate);
  };

  const getAge = () => {
    if (!birthday || birthday === "Not Set") return "Not Set";
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return "Not Set";

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age.toString();
  };

  const getZodiacSign = () => {
    if (!birthday || birthday === "Not Set") return "Not Set";
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return "Not Set";

    const month = birthDate.getMonth() + 1;
    const day = birthDate.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
      return "Aries";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
      return "Taurus";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
      return "Gemini";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
      return "Cancer";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
      return "Virgo";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
      return "Libra";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
      return "Scorpio";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
      return "Sagittarius";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
      return "Capricorn";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
      return "Aquarius";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
      return "Pisces";

    return "Not Set";
  };

  const executeSecureAction = async (action: () => void) => {
    const authenticated = await isSessionValid();
    if (authenticated) {
      action();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPendingAction(() => () => action());
      setAuthModalVisible(true);
    }
  };

  const bloodTypeIndex = BLOOD_TYPE_OPTIONS.indexOf(bloodType.toUpperCase());

  // inside your component:
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: currentTheme.background }}
      edges={["left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[styles.container, { marginTop: -20, paddingBottom: 100 }]}
        >
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 0,
            }}
          >
            <Image
              source={
                userIcon === "Not Set" || userIcon === "" || userIcon === null
                  ? { uri: "https://pbs.twimg.com/media/C8SFjSYWAAA6452.jpg" }
                  : { uri: userIcon }
              }
              style={{ width: 150, height: 150, borderRadius: 75 }}
            />
            <Text
              style={[styles.pageHeader, { color: currentTheme.text, flex: 1 }]}
            >
              {userName.split(" ")[0]}
            </Text>
            <Host matchContents>
              {editMode ? (
                <Row spacing={8}>
                  <Button
                    label="Cancel"
                    variant="outlined"
                    modifiers={[
                      controlSize("small"),
                      buttonStyle("glass"),
                      buttonBorderShape("capsule"),
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      loadAllUserData(); // Reset to current db state
                      setEditMode(false);
                    }}
                  />
                  <Button
                    label="Save"
                    variant="filled"
                    modifiers={[
                      controlSize("small"),
                      buttonStyle("borderedProminent"),
                      buttonBorderShape("capsule"),
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleSaveChanges(); // Actually triggers save to Firestore!
                    }}
                  />
                </Row>
              ) : (
                <Button
                  label="Edit Profile"
                  variant="outlined"
                  modifiers={[
                    controlSize("small"),
                    buttonStyle("glass"),
                    buttonBorderShape("capsule"),
                  ]}
                  onPress={() => {
                    executeSecureAction(() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setEditMode(true);
                    });
                  }}
                />
              )}
            </Host>
          </View>
          <View
            style={{
              borderColor: currentTheme.textSecondary,
              borderWidth: 1,
              opacity: 0.5,
              marginVertical: 20,
            }}
          />
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontFamily: "Condensed-Bold",
                color: currentTheme.text,
                fontSize: 24,
                marginTop: 10,
              }}
            >
              PERSONAL INFORMATION
            </Text>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                NAME
              </Text>
              {editMode ? (
                <View
                  style={[
                    styles.textInput,
                    { backgroundColor: currentTheme.element },
                  ]}
                >
                  <Host matchContents>
                    <TextInput
                      // @ts-ignore
                      value={userName}
                      onChangeText={setUserName}
                      placeholder="Name"
                    />
                  </Host>
                </View>
              ) : (
                <TextBlock text={userName} />
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                EMAIL
              </Text>
              {editMode ? (
                <View
                  style={[
                    styles.textInput,
                    { backgroundColor: currentTheme.element },
                  ]}
                >
                  <Host matchContents>
                    <TextInput
                      // @ts-ignore
                      value={userEmail}
                      onChangeText={setUserEmail}
                      placeholder="Email"
                      modifiers={[keyboardType("email-address")]}
                    />
                  </Host>
                </View>
              ) : (
                <TextBlock text={userEmail} />
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                PHONE NUMBER
              </Text>
              {editMode ? (
                <View
                  style={[
                    styles.textInput,
                    { backgroundColor: currentTheme.element },
                  ]}
                >
                  <Host matchContents>
                    <TextInput
                      // @ts-ignore
                      value={userPhone}
                      onChangeText={setUserPhone}
                      placeholder="Phone Number"
                      modifiers={[keyboardType("phone-pad")]}
                    />
                  </Host>
                </View>
              ) : (
                <TextBlock text={userPhone} />
              )}
            </View>

            <View
              style={{
                borderColor: currentTheme.textSecondary,
                borderWidth: 1,
                opacity: 0.5,
                marginVertical: 10,
              }}
            />

            <Text
              style={{
                fontFamily: "Condensed-Bold",
                color: currentTheme.text,
                fontSize: 24,
                marginBottom: 10,
              }}
            >
              HEALTH INFORMATION
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                borderColor: "#000",
                borderWidth: 0,
              }}
            >
              <View style={[styles.fieldContainer, { flex: 2 }]}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  BIRTHDAY
                </Text>
                {editMode ? (
                  <View
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: currentTheme.element,
                        justifyContent: "center",
                      },
                    ]}
                  >
                    {Platform.OS === "ios" ? (
                      <Host matchContents>
                        <DatePicker
                          selection={
                            birthday && birthday !== "Not Set"
                              ? new Date(birthday)
                              : new Date()
                          }
                          onDateChange={(date) =>
                            setBirthday(date.toISOString())
                          }
                          displayedComponents={["date"]}
                        />
                      </Host>
                    ) : (
                      <>
                        <Pressable onPress={() => setShowBirthdayPicker(true)}>
                          <Text
                            style={{ color: currentTheme.text, fontSize: 16 }}
                          >
                            {birthday && birthday !== "Not Set"
                              ? getFormattedDate()
                              : "Select date"}
                          </Text>
                        </Pressable>
                        {showBirthdayPicker && (
                          <DateTimePicker
                            value={
                              birthday && birthday !== "Not Set"
                                ? new Date(birthday)
                                : new Date()
                            }
                            mode="date"
                            display="default"
                            onChange={(event, date) => {
                              setShowBirthdayPicker(false);
                              if (date) {
                                setBirthday(date.toISOString());
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </View>
                ) : (
                  <TextBlock text={getFormattedDate()} />
                )}
              </View>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  AGE
                </Text>
                <TextBlock text={getAge()} />
              </View>
              <View style={[styles.fieldContainer, { flex: 2 }]}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  ZODIAC SIGN
                </Text>
                <TextBlock text={getZodiacSign()} />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                borderColor: "#000",
                borderWidth: 0,
              }}
            >
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  HEIGHT {isMetric ? "(CM)" : "(IN)"}
                </Text>
                {editMode ? (
                  <View
                    style={[
                      styles.textInput,
                      { backgroundColor: currentTheme.element },
                    ]}
                  >
                    <Host matchContents>
                      <TextInput
                        // @ts-ignore
                        value={height === "Not Set" ? "" : height}
                        onChangeText={setHeight}
                        placeholder={isMetric ? "e.g. 175" : "e.g. 68"}
                        modifiers={[keyboardType("decimal-pad")]}
                      />
                    </Host>
                  </View>
                ) : (
                  <TextBlock text={getDisplayHeight()} />
                )}
              </View>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  WEIGHT {isMetric ? "(KG)" : "(LB)"}
                </Text>
                {editMode ? (
                  <View
                    style={[
                      styles.textInput,
                      { backgroundColor: currentTheme.element },
                    ]}
                  >
                    <Host matchContents>
                      <TextInput
                        // @ts-ignore
                        value={weight === "Not Set" ? "" : weight}
                        onChangeText={setWeight}
                        placeholder={isMetric ? "e.g. 70" : "e.g. 154"}
                        modifiers={[keyboardType("decimal-pad")]}
                      />
                    </Host>
                  </View>
                ) : (
                  <TextBlock text={getDisplayWeight()} />
                )}
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                BLOOD TYPE
              </Text>
              {editMode ? (
                <View
                  style={[
                    styles.textInput,
                    { backgroundColor: currentTheme.element },
                  ]}
                >
                  <Host matchContents>
                    <Picker
                      // @ts-ignore
                      options={BLOOD_TYPE_OPTIONS}
                      selectedIndex={bloodTypeIndex === -1 ? 0 : bloodTypeIndex}
                      onOptionSelected={({
                        nativeEvent: { index },
                      }: {
                        nativeEvent: { index: number };
                      }) => setBloodType(BLOOD_TYPE_OPTIONS[index])}
                      variant="segmented"
                    />
                  </Host>
                </View>
              ) : (
                <TextBlock text={bloodType.toUpperCase()} />
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: currentTheme.textSecondary },
                ]}
              >
                ALLERGIES
              </Text>
              {editMode ? (
                <View
                  style={[
                    styles.textInput,
                    { backgroundColor: currentTheme.element },
                  ]}
                >
                  <Host matchContents>
                    <TextInput
                      // @ts-ignore
                      value={allergies === "None Stored" ? "" : allergies}
                      onChangeText={setAllergies}
                      placeholder="e.g. Peanuts, Penicillin"
                    />
                  </Host>
                </View>
              ) : (
                <TextBlock
                  text={allergies === "" ? "None Stored" : allergies}
                />
              )}
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
  },
  fieldContainer: {
    gap: 4,
    width: "100%",
  },
  pageHeader: {
    fontSize: 40,
    fontFamily: "Logo-Font",
  },
  infoLabel: {
    fontFamily: "Condensed-Bold",
    fontSize: 14,
    margin: 0,
  },
  caption: {
    fontFeatureSettings: "Body-Medium",
    opacity: 0.8,
    fontSize: 13,
  },
  textInput: {
    width: "100%", // Force the wrapper to take up the full horizontal space
    minHeight: 46, // Give it a solid native tap target height
    justifyContent: "center", // Vertically center the internal Host and TextInput
    paddingHorizontal: 12, // Left & right space inside the input block
    borderRadius: 8,
  },
});

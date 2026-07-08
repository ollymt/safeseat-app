import { Themes } from "@/constants/theme";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TextBlock from "@/components/text-block";
import { useCallback, useState } from "react";

import ContactCard from "@/components/contact-card";
import * as SecureStore from "expo-secure-store";

import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

const { width: screenWidth } = Dimensions.get("window");

export default function Me() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const router = useRouter();

  // 1. Core Account States
  const [userName, setUserName] = useState<string>("Guest");
  const [userEmail, setUserEmail] = useState<string>("Not Set");
  const [userPhone, setUserPhone] = useState<string>("Not Set");

  // 2. Health Metrics States
  const [height, setHeight] = useState<string>("Not Set");
  const [weight, setWeight] = useState<string>("Not Set");
  const [bloodType, setBloodType] = useState<string>("Not Set");
  const [allergies, setAllergies] = useState<string>("None Stored");
  const [birthday, setBirthday] = useState<string>("");

  // 🛠️ 3. Settings Preference State
  const [useMetric, setUseMetric] = useState<boolean>(true);

  // 4. UI Interaction State
  const [refreshing, setRefreshing] = useState(false);

  // Isolated data loader function
  const loadAllUserData = useCallback(async () => {
    try {
      // 🛠️ 1. LOAD INSTANTLY FROM CACHE (Phone Storage)
      const cachedHealth = await SecureStore.getItemAsync("user_health_profile");
      if (cachedHealth) {
        const localData = JSON.parse(cachedHealth);
        if (localData.name) setUserName(localData.name);
        if (localData.email) setUserEmail(localData.email);
        if (localData.phone) setUserPhone(localData.phone);
        if (localData.birthday) setBirthday(localData.birthday);
        if (localData.height) setHeight(localData.height);
        if (localData.weight) setWeight(localData.weight);
        if (localData.bloodType) setBloodType(localData.bloodType);
        if (localData.allergies) setAllergies(localData.allergies);
      }

      const cachedPrivacy = await SecureStore.getItemAsync("user_privacy_prefs");
      if (cachedPrivacy) {
        const privacyData = JSON.parse(cachedPrivacy);
        if (privacyData.useMetric !== undefined) setUseMetric(privacyData.useMetric);
      }

      // 🛠️ 2. FETCH FRESH DATA FROM FIREBASE IN THE BACKGROUND
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const cloudData = userDocSnap.data();

          // 🛠️ 3. UPDATE THE UI STATES WITH FRESH DATA
          if (cloudData.name) setUserName(cloudData.name);
          if (cloudData.email) setUserEmail(cloudData.email);
          if (cloudData.phone) setUserPhone(cloudData.phone);
          if (cloudData.birthday) setBirthday(cloudData.birthday);
          if (cloudData.height) setHeight(cloudData.height);
          if (cloudData.weight) setWeight(cloudData.weight);
          if (cloudData.bloodType) setBloodType(cloudData.bloodType);
          if (cloudData.allergies) setAllergies(cloudData.allergies);

          // Fetch metric flag from cloud node safely
          if (cloudData.useMetric !== undefined) setUseMetric(cloudData.useMetric);

          // 🛠️ 4. DOWNLOAD/SAVE THE NEW CLOUD DATA BACK INTO THE CACHE FOR NEXT TIME
          const combinedProfile = {
            name: cloudData.name || "",
            email: cloudData.email || "",
            phone: cloudData.phone || "",
            birthday: cloudData.birthday || "",
            height: cloudData.height || "",
            weight: cloudData.weight || "",
            bloodType: cloudData.bloodType || "",
            allergies: cloudData.allergies || "",
          };

          await SecureStore.setItemAsync("user_health_profile", JSON.stringify(combinedProfile));

          const combinedPrivacy = {
            useMetric: cloudData.useMetric ?? true,
            consent: cloudData.consent ?? true,
            emergencyEscalation: cloudData.emergencyEscalation ?? true,
          };
          await SecureStore.setItemAsync("user_privacy_prefs", JSON.stringify(combinedPrivacy));
        }
      }
    } catch (error) {
      console.error("Error syncing cache with Firestore:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllUserData();
    }, [loadAllUserData]),
  );

  // 🛠️ Safe Height Display Conversion (Handles numbers and strings)
  const getDisplayHeight = () => {
    if (height === undefined || height === null || height === "Not Set") return "Not Set";

    // Safely cast to string first, then extract the numeric float value
    const cmValue = parseFloat(String(height).replace(/[^0-9.]/g, ""));
    if (isNaN(cmValue)) return String(height);

    if (useMetric) {
      return `${cmValue} cm`;
    } else {
      const totalInches = cmValue / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}' ${inches}"`;
    }
  };

  // 🛠️ Safe Weight Display Conversion (Handles numbers and strings)
  const getDisplayWeight = () => {
    if (weight === undefined || weight === null || weight === "Not Set") return "Not Set";

    // Safely cast to string first, then extract the numeric float value
    const kgValue = parseFloat(String(weight).replace(/[^0-9.]/g, ""));
    if (isNaN(kgValue)) return String(weight);

    if (useMetric) {
      return `${kgValue} kg`;
    } else {
      const lbsValue = Math.round(kgValue * 2.20462);
      return `${lbsValue} lbs`;
    }
  };

  // 🛠️ Date Parser Wrapper
  const parseAndroidSafeDate = (dateStr: string) => {
    if (!dateStr) return null;
    const isoParts = dateStr.match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})$/);
    if (isoParts) {
      const [, year, month, day] = isoParts;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3 && parts[2].length === 4) {
      const [month, day, year] = parts;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  const getFormattedDate = () => {
    if (!birthday) return "Not Set";
    const parsedDate = parseAndroidSafeDate(birthday);
    if (!parsedDate || isNaN(parsedDate.getTime())) return birthday;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(parsedDate);
  };

  const getAge = () => {
    if (!birthday) return "Not Set";
    const birthDate = parseAndroidSafeDate(birthday);
    if (!birthDate || isNaN(birthDate.getTime())) return "Not Set";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const getZodiacSign = () => {
    if (!birthday) return "Not Set";
    const birthDate = parseAndroidSafeDate(birthday);
    if (!birthDate || isNaN(birthDate.getTime())) return "Not Set";
    const month = birthDate.getMonth() + 1;
    const day = birthDate.getDate();
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
    return "Not Set";
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: currentTheme.background }}
      edges={["left", "right"]}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={true} bounces={true}>
        <View style={[styles.container, { marginTop: 40 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.pageHeader, { color: currentTheme.text, flex: 1 }]}>Me</Text>
          </View>
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: "Condensed-Bold", color: currentTheme.text, fontSize: 24, marginTop: 10 }}>
              PERSONAL INFORMATION
            </Text>

            <View style={styles.fieldContainer}>
              <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>NAME</Text>
              <TextBlock text={userName} />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>EMAIL</Text>
              <TextBlock text={userEmail} copyable={true} label="Email" />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>PHONE NUMBER</Text>
              <TextBlock text={userPhone} copyable={true} label="Phone Number" />
            </View>

            <View style={{ borderColor: currentTheme.textSecondary, borderWidth: 1, opacity: 0.5, marginVertical: 10 }} />

            <Text style={{ fontFamily: "Condensed-Bold", color: currentTheme.text, fontSize: 24, marginBottom: 10 }}>
              HEALTH INFORMATION
            </Text>

            <View style={{ flexDirection: "row", gap: 10, borderColor: "#000", borderWidth: 0 }}>
              <View style={[styles.fieldContainer, { flex: 2 }]}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>BIRTHDAY</Text>
                <TextBlock text={getFormattedDate()} />
              </View>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>AGE</Text>
                <TextBlock text={getAge()} />
              </View>
              <View style={[styles.fieldContainer, { flex: 2 }]}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ZODIAC SIGN</Text>
                <TextBlock text={getZodiacSign()} />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, borderColor: "#000", borderWidth: 0 }}>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>HEIGHT</Text>
                {/* 🛠️ Swapped to dynamic helper */}
                <TextBlock text={getDisplayHeight()} />
              </View>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>WEIGHT</Text>
                {/* 🛠️ Swapped to dynamic helper */}
                <TextBlock text={getDisplayWeight()} />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>BLOOD TYPE</Text>
              <TextBlock text={bloodType.toUpperCase()} />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ALLERGIES</Text>
              <TextBlock text={allergies} />
            </View>
          </View>

          <View style={{ borderColor: currentTheme.textSecondary, borderWidth: 1, opacity: 0.5, marginVertical: 20 }} />
          <Text style={{ fontFamily: "Condensed-Bold", color: currentTheme.text, fontSize: 24, marginBottom: 10 }}>
            EMERGENCY CONTACTS
          </Text>
          <View style={{ gap: 8 }}>
            <ContactCard name="John Doe" phone="09123456789" order="primary" />
            <ContactCard name="Jane Doe" phone="09123456790" order="secondary" />
          </View>
          <Text style={[styles.caption, { color: currentTheme.textSecondary, marginTop: 20 }]}>
            You can edit information presented here in the Settings tab.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", padding: 20 },
  fieldContainer: { gap: 4, width: "100%" },
  pageHeader: { fontSize: 40, fontFamily: "Logo-Font" },
  infoLabel: { fontFamily: "Condensed-Bold", fontSize: 14, margin: 0 },
  caption: { fontFeatureSettings: "Body-Medium", opacity: 0.8, fontSize: 13 },
});
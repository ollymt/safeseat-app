import { Themes } from "@/constants/theme";
import { useRouter } from "expo-router";
import {
    Dimensions,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AssignCard from "@/components/assign-card";
import { Column, Host, Text as UIText } from "@expo/ui";
import TextBlock from "@/components/text-block";
import { useState, useEffect } from "react";

import * as SecureStore from "expo-secure-store";

const { width: screenWidth } = Dimensions.get("window");

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const router = useRouter();

  const [userName, setUserName] = useState<string>("Guest");
  const [userEmail, setUserEmail] = useState<string>("null");

  // 2. Fetch the data when the component mounts
  useEffect(() => {
    async function getUserData() {
      try {
        const savedUserDataString = await SecureStore.getItemAsync("user_account");
        
        if (savedUserDataString) {
          // Parse the JSON string back into an object
          const savedUser = JSON.parse(savedUserDataString);
          
          // Pull the 'name' field out and update state
          if (savedUser.name) {
            setUserName(savedUser.name);
          }

          if (savedUser.email) {
            setUserEmail(savedUser.email);
          }
        }
      } catch (error) {
        console.error("Failed to load user profile data:", error);
      }
    }

    getUserData();
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentTheme.background,
      }}
    >
      <View style={[styles.container, { marginTop: 40 }]}>
        <Text style={[styles.pageHeader, { color: currentTheme.text }]}>
          Me
        </Text>
        <View
          style={{
            gap: 10,
          }}
        >
          <View
            style={{
              gap: 4,
              marginTop: 10,
              width: "100%",
              borderWidth: 0,
              borderColor: currentTheme.secondaryBttn,

              borderRadius: 10,
            }}
          >
            <Text
              style={[styles.infoLabel, { color: currentTheme.textSecondary }]}
            >
              FULL NAME
            </Text>
            <TextBlock text={userName} />
          </View>
          <View
            style={{
              gap: 4,
              marginTop: 10,
              width: "100%",
              borderWidth: 0,
              borderColor: currentTheme.secondaryBttn,

              borderRadius: 10,
            }}
          >
            <Text
              style={[styles.infoLabel, { color: currentTheme.textSecondary }]}
            >
              EMAIL ADDRESS
            </Text>
            <TextBlock text={userEmail} />
          </View>
        </View>
      </View>
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
    height: "35%", // Reduced slightly to give more room for keyboard space
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
  }
});

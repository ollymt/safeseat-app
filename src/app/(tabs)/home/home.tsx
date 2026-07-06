import { Themes } from "@/constants/theme";
import {
  StyleSheet,
  useColorScheme,
  Text,
  View,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Column, Host } from "@expo/ui";

import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

import * as Haptics from "expo-haptics"
import SeatCard from "@/components/seat-card";

const { width: screenWidth } = Dimensions.get("window");

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const router = useRouter();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentTheme.background,
      }}
      edges={['left', 'right']}
    >
      <View style={[styles.container, { marginTop: 40 }]}>
        <Text style={[styles.pageHeader, { color: currentTheme.text }]}>
          Home
        </Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          <SeatCard seatNo={1} name="Spruce" state="safe" onPress={() => {}} />
          <SeatCard seatNo={2} name="Jack" state="warning" onPress={() => {}} />
          <SeatCard seatNo={3} name="Maverick" state="emergency" onPress={() => {}} />
          <SeatCard seatNo={4} state="empty" onPress={() => {}} />
          <SeatCard seatNo={5} state="empty" onPress={() => {}} />
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
    borderColor: "#fff"
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
  }
});

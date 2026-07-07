import { Themes } from "@/constants/theme";
import {
  StyleSheet,
  useColorScheme,
  Text,
  View,
  Dimensions,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Column, Host } from "@expo/ui";

import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

import * as Haptics from "expo-haptics"
import SeatCard from "@/components/seat-card";
import AssignCard from "@/components/assign-card";

const { width: screenWidth } = Dimensions.get("window");

export default function Assignn() {
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
          Assign
        </Text>
        <View
          style={{
            gap: 10,
            marginTop: 10,
            width: "100%",
            borderWidth: 0,
            borderColor: currentTheme.secondaryBttn,
            
            borderRadius: 10,
          }}
        >
          <View style={{ gap: 10, flexDirection: "row", height: 230 }}>
            <AssignCard seatNo={1} onPress={() => {}} seatCode="driver" />
            <AssignCard seatNo={2} onPress={() => {}} seatCode="passenger" />
          </View>
          <View style={{ gap: 10, flexDirection: "row", height: 230 }}>
            <AssignCard seatNo={3} onPress={() => {}} seatCode="l backseat" />
            <AssignCard seatNo={4} onPress={() => {}} seatCode="c backseat" />
            <AssignCard seatNo={5} onPress={() => {}} seatCode="r backseat" />
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

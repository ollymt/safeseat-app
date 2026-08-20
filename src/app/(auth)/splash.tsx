import Button from "@/components/button";
import { BrassRivet, EngravedTitle, Stitching } from "@/components/skeuo";
import { Materials } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SplashScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={["#54331C", "#3B2415", "#1E1207"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.emblemArea}>
            {/* Brass nameplate, like a stamped badge on a leather dashboard */}
            <View style={styles.plateOuter}>
              <LinearGradient
                colors={["#F3E3A8", "#D8B84A", "#A9821F", "#7A5C12"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.plate}
              >
                <BrassRivet size={7} style={{ position: "absolute", top: 10, left: 10 }} />
                <BrassRivet size={7} style={{ position: "absolute", top: 10, right: 10 }} />
                <BrassRivet size={7} style={{ position: "absolute", bottom: 10, left: 10 }} />
                <BrassRivet size={7} style={{ position: "absolute", bottom: 10, right: 10 }} />
                <Ionicons name="car-sport" size={54} color="#3B2415" />
                <Text style={styles.loginlogo}>SafeSeat</Text>
                <Text style={styles.tagline}>Every Seat, Watched Over</Text>
              </LinearGradient>
            </View>
          </View>

          <View style={{ width: "100%", gap: 10 }}>
            <Stitching color={Materials.stitch} style={{ borderWidth: 0, borderTopWidth: 1, marginBottom: 14 }} />
            <View style={{ width: "100%", flexDirection: "row", gap: 10 }}>
              <Button
                label="Sign-up"
                onPress={() => router.push("/(auth)/signup")}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                label="Log-in"
                onPress={() => router.push("/(auth)/login")}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    padding: 24,
    justifyContent: "flex-end",
  },
  emblemArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  plateOuter: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  plate: {
    width: 260,
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#5E4A1C",
    alignItems: "center",
    gap: 6,
  },
  loginlogo: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#2C1B0F",
    marginTop: 6,
  },
  tagline: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5E4A1C",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
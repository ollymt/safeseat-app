import Button from "@/components/button";
import { useRouter } from "expo-router";
import {
    Dimensions,
    ImageBackground,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: screenWidth } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";

  return (
    <ImageBackground
      source={{
        uri: "https://hips.hearstapps.com/hmg-prod/images/remaining-debris-of-cars-involved-in-a-car-crash-on-royalty-free-image-1590010853.jpg",
      }}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: activeScheme == "dark" ? "#000000CC" : "#00000080",
        }}
      >
        <View style={styles.container}>
          <View
            style={{
              flex: 9,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0,
              borderColor: "#0000ff",
            }}
          >
            <Text style={styles.loginlogo}>SafeSeat</Text>
          </View>

          <View
            style={{
              width: "100%",
              flex: 1,
              borderColor: "#ff0000",
              borderWidth: 0,
            }}
          >
            <View style={{ width: "100%", flexDirection: "row", gap: 5 }}>
              <Button
                label="Sign-up"
                onPress={() => {
                  router.push("/(auth)/signup");
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                label="Log-in"
                onPress={() => {
                  router.push("/(auth)/login");
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    borderColor: "#000",
    borderWidth: 0,
    padding: 20,
  },
  loginlogo: {
    fontSize: 60,
    fontFamily: "Logo-Font",
    textAlign: "center",
    color: "#ffffff",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  glassView: {
    position: "absolute",
    top: 100,
    left: 50,
    width: 200,
    height: 100,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tintedGlassView: {
    position: "absolute",
    top: 250,
    left: 50,
    width: 200,
    height: 100,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  fullWidthHost: {
    width: screenWidth,
    height: 50,
    borderColor: "#000",
    borderWidth: 3,
  },
});

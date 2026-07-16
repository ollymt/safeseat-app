import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Stack screenOptions={{
      headerShown: true, // Keep the header system alive...
      headerTransparent: true, // ...but make it completely invisible!
      headerTitle: "", // Erase the text title completely
      headerTintColor: "#000000", // The color of your floating back arrow (e.g., black)
      headerShadowVisible: false, // Removes any potential bottom border lines
      animation: "slide_from_right",
    }}
    >
      {/* Points to the index folder */}
      <Stack.Screen name="index" options={{ title: "Settings" }} />
    </Stack>
  );
}

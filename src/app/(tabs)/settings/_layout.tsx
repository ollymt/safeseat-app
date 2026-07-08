import { Stack } from "expo-router";

export default function TabsLayout() {
  return (
    <Stack screenOptions={{
      headerShown: true, // Keep the header system alive...
      headerTransparent: true, // ...but make it completely invisible!
      title: "", // Erase the text title completely
      headerTintColor: "#000000", // The color of your floating back arrow (e.g., black)
      headerShadowVisible: false, // Removes any potential bottom border lines
    }}
    >
      {/* Points to the index folder */}
      <Stack.Screen name="index" options={{ title: "Settings" }} />
    </Stack>
  );
}

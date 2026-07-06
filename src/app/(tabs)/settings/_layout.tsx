import { Stack } from "expo-router";

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Points to the index folder */}
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

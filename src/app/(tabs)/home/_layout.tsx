import { Stack } from "expo-router";

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Points to the index folder */}
      <Stack.Screen name="index" options={{ title: "Home" }} />
    </Stack>
  );
}

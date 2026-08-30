import { Stack } from "expo-router";
import { Themes as themes } from "@/constants/theme";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        headerTintColor: themes.text,
        headerShadowVisible: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="diagnostics" options={{ title: "System Self-Diagnostic" }} />
    </Stack>
  );
}

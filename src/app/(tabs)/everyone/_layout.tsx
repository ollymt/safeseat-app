import { Stack } from "expo-router";
import { Themes as themes } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        title: "",
        headerTintColor: themes.text,
        headerShadowVisible: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}

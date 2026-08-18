import { Themes } from "@/constants/theme";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

import SkeuoTabBar from "@/components/skeuo-tab-bar";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <SkeuoTabBar {...props} />}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="assign" />
        <Tabs.Screen name="everyone" />
        <Tabs.Screen name="settings" />
      </Tabs>
    </ThemeProvider>
  );
}
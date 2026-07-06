import { Themes } from "@/constants/theme";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  return (
    // ThemeProvider is required to prevent visual flashes during tab switching
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <NativeTabs
          // Tints the active tab icons
          tintColor={activeScheme == "dark" ? "#BBFFB3" : "#25601D"}
      >
        {/* Main Home Tab */}
        <NativeTabs.Trigger name="home">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "house", selected: "house.fill" }}
            md={{ default: "home", selected: "home_filled" }}
          />
        </NativeTabs.Trigger>

        {/* Explore Tab */}
        <NativeTabs.Trigger name="assign">
          <NativeTabs.Trigger.Label>Assign</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "carseat.right", selected: "carseat.right.fill" }}
            md={{ default: "tatami_seat", selected: "tatami_seat" }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="me">
          <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "person", selected: "person.fill" }}
            md={{ default: "person", selected: "person" }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "gearshape", selected: "gearshape.fill" }}
            md={{ default: "settings", selected: "settings" }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}

// app/(tabs)/_layout.tsx
import { MaterialTopTabs } from "@/components/material-top-tabs"; // your custom wrapper below
import CustomTabBar from "@/components/custom-tab-bar";

export default function TabLayout() {
  return (
    <MaterialTopTabs
      tabBar={(props) => <CustomTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
      }}
    >
      <MaterialTopTabs.Screen name="home" options={{ title: "Home" }} />
      <MaterialTopTabs.Screen name="assign" options={{ title: "Assign" }} />
      <MaterialTopTabs.Screen name="everyone" options={{ title: "Everyone" }} />
      <MaterialTopTabs.Screen name="settings" options={{ title: "Settings" }} />
    </MaterialTopTabs>
  );
}
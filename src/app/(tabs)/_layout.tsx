import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import { withLayoutContext, router, usePathname } from "expo-router";
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, Host } from "@expo/ui";

import * as Haptics from "expo-haptics";
import Banner from "@/components/banner";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserPreferencesProvider } from "@/hooks/user-preferences-context";
import { SafeSeatHubProvider } from "@/hooks/safeseat-hub-context";

import homeXml from "@expo/material-symbols/home.xml";
import seatXml from "@expo/material-symbols/airline_seat_recline_extra.xml";
import groupsXml from "@expo/material-symbols/groups.xml";
import settingsXml from "@expo/material-symbols/settings.xml";

const { Navigator } = createMaterialTopTabNavigator();
const Tabs = withLayoutContext<any, any, any, any>(Navigator);

const TAB_ROOTS: Record<string, string> = {
  home: "/home",
  assign: "/assign",
  everyone: "/everyone",
  settings: "/settings",
};

function MyCustomTabBar({ state, descriptors, navigation, pathname }: any) {
  return (
    <View style={styles.tabContainer}>
      <View style={styles.tabDrawer}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const renderIcon = options.tabBarIcon;

          const handlePress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

            // React Navigation's default focused-tab behavior emits a
            // POP_TO_TOP. At an already-rooted tab there is nothing to pop,
            // which is the warning SafeSeat was showing. Do not emit tabPress
            // for that no-op case. If the focused tab is on a nested screen,
            // explicitly return to that tab's root instead.
            if (isFocused) {
              const rootPath = TAB_ROOTS[route.name];
              if (rootPath && pathname !== rootPath) {
                router.replace(rootPath as any);
              }
              return;
            }

            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const handleLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={handlePress}
              onLongPress={handleLongPress}
              style={({ pressed }) => [
                styles.tabButton,
                isFocused && styles.activeTabButton,
                pressed && styles.pressedTabButton,
              ]}
            >
              {renderIcon?.({
                focused: isFocused,
                color: isFocused ? themes.primaryBttn : themes.textSecondary,
                size: spacing.three,
              })}
              <Text style={[styles.label, isFocused && styles.activeLabel]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const pathname = usePathname();
  const isNestedScreen = pathname.split("/").filter(Boolean).length > 1;

  return (
    <UserPreferencesProvider>
      <SafeSeatHubProvider>
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "top"]}>
        <View style={styles.root}>
          <View style={styles.bannerContainer}>
            <Banner />
          </View>

          <Tabs
            tabBarPosition="bottom"
            // @ts-ignore material top tabs accepts a custom tab bar renderer
            tabBar={(props) => <MyCustomTabBar {...props} pathname={pathname} />}
            screenOptions={{
              swipeEnabled: !isNestedScreen,
              headerShown: false,
              sceneContainerStyle: {
                backgroundColor: themes.background,
              },
            }}
          >
            <Tabs.Screen
              name="home"
              options={{
                title: "Home",
                tabBarIcon: ({ focused }: { focused: boolean }) => (
                  <Host matchContents>
                    <Icon
                      name={Icon.select({
                        ios: focused ? "house.fill" : "house",
                        android: homeXml,
                      })}
                      size={spacing.three}
                      color={focused ? themes.primaryBttn : themes.textSecondary}
                    />
                  </Host>
                ),
              }}
            />

            <Tabs.Screen
              name="assign"
              options={{
                title: "Assign",
                tabBarIcon: ({ focused }: { focused: boolean }) => (
                  <Host matchContents>
                    <Icon
                      name={Icon.select({
                        ios: focused ? "carseat.right.fill" : "carseat.right",
                        android: seatXml,
                      })}
                      size={spacing.three}
                      color={focused ? themes.primaryBttn : themes.textSecondary}
                    />
                  </Host>
                ),
              }}
            />

            <Tabs.Screen
              name="everyone"
              options={{
                title: "Profiles",
                tabBarIcon: ({ focused }: { focused: boolean }) => (
                  <Host matchContents>
                    <Icon
                      name={Icon.select({
                        ios: focused ? "person.3.fill" : "person.3",
                        android: groupsXml,
                      })}
                      size={spacing.three}
                      color={focused ? themes.primaryBttn : themes.textSecondary}
                    />
                  </Host>
                ),
              }}
            />

            <Tabs.Screen
              name="settings"
              options={{
                title: "Settings",
                tabBarIcon: ({ focused }: { focused: boolean }) => (
                  <Host matchContents>
                    <Icon
                      name={Icon.select({
                        ios: focused ? "gearshape.fill" : "gearshape",
                        android: settingsXml,
                      })}
                      size={spacing.three}
                      color={focused ? themes.primaryBttn : themes.textSecondary}
                    />
                  </Host>
                ),
              }}
            />
          </Tabs>
        </View>
      </SafeAreaView>
      </SafeSeatHubProvider>
    </UserPreferencesProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themes.background,
  },
  root: {
    flex: 1,
    backgroundColor: themes.background,
  },
  bannerContainer: {
    paddingHorizontal: spacing.two,
    paddingBottom: spacing.one,
  },
  tabContainer: {
    width: "100%",
    backgroundColor: themes.background,
    paddingHorizontal: spacing.two,
    paddingTop: spacing.one,
    paddingBottom: spacing.one,
  },
  tabDrawer: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: themes.backgroundElement,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: themes.divider,
    padding: 5,
  },
  tabButton: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.half,
    borderRadius: 16,
    paddingHorizontal: spacing.half,
  },
  activeTabButton: {
    backgroundColor: themes.primarySoft,
    borderWidth: 1,
    borderColor: themes.primaryBorder,
  },
  pressedTabButton: {
    opacity: 0.72,
  },
  label: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    fontFamily: "Body-Medium",
  },
  activeLabel: {
    color: themes.primaryBttn,
    fontFamily: "Body-Bold",
  },
});

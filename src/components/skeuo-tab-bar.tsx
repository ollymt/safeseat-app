// Custom leather-and-brass tab bar, replacing expo-router's NativeTabs so
// the bottom navigation matches the rest of the dashboard instead of
// rendering the platform's native tab UI.
import { BrassRivet, Stitching } from "@/components/skeuo";
import { Materials, Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICONS: Record<
  string,
  {
    outline: keyof typeof Ionicons.glyphMap;
    filled: keyof typeof Ionicons.glyphMap;
  }
> = {
  home: { outline: "home-outline", filled: "home" },
  assign: { outline: "car-outline", filled: "car-sport" },
  everyone: { outline: "people-outline", filled: "people" },
  settings: { outline: "settings-outline", filled: "settings-sharp" },
};

const LABELS: Record<string, string> = {
  home: "Home",
  assign: "Assign",
  everyone: "Everyone",
  settings: "Settings",
};

export default function SkeuoTabBar({
  state,
  navigation,
}: {
  state: any;
  navigation: any;
}) {
  const scheme = useColorScheme();
  const activeScheme = scheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#54331C", "#3B2415", "#221306"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View pointerEvents="none" style={styles.stitchLine}>
        <Stitching
          color={Materials.stitch}
          style={{ borderWidth: 0, borderTopWidth: 1 }}
        />
      </View>
      <BrassRivet size={5} style={{ position: "absolute", top: 6, left: 10 }} />
      <BrassRivet
        size={5}
        style={{ position: "absolute", top: 6, right: 10 }}
      />

      <View style={styles.row}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const meta = ICONS[route.name] ?? ICONS.home;
          const label = LABELS[route.name] ?? route.name;

          const onPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
              {isFocused && (
                <LinearGradient
                  colors={["#8FCB57", "#4F8B29", "#2C5416"]}
                  style={styles.activePuck}
                />
              )}
              <Ionicons
                name={isFocused ? meta.filled : meta.outline}
                size={22}
                color={isFocused ? "#F4ECD8" : Materials.stitch}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? "#F4ECD8" : Materials.stitchDim,
                    fontWeight: isFocused ? "700" : "500",
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#160C04",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  stitchLine: {
    position: "absolute",
    top: 5,
    left: 16,
    right: 16,
    height: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activePuck: {
    position: "absolute",
    top: -6,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
    opacity: 0.95,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

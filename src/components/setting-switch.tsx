import { Materials, Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

type SettingSwitchProps = {
  iconName?: keyof typeof Ionicons.glyphMap;
  name: string;
  value?: boolean;
  enabled?: boolean;
  isLast?: boolean;
  onValueChange?: (newValue: boolean) => void;
};

// A hand-built chrome toggle track with a leather knob — stands in for
// the native switch so it matches the rest of the dashboard.
function SkeuoToggle({
  value,
  enabled,
  onToggle,
}: {
  value: boolean;
  enabled: boolean;
  onToggle: () => void;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#8B8F98", "#4F8B29"],
  });
  const knobTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 24],
  });

  return (
    <Pressable onPress={enabled ? onToggle : undefined} hitSlop={8}>
      <Animated.View
        style={[
          toggle.track,
          { backgroundColor: trackColor, opacity: enabled ? 1 : 0.5 },
        ]}
      >
        <Animated.View
          style={[toggle.knob, { transform: [{ translateX: knobTranslate }] }]}
        >
          <LinearGradient
            colors={["#FDFDFB", "#DCDEE2", "#9296A0"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function SettingSwitch({
  iconName,
  name,
  isLast = false,
  enabled = true,
  value = false,
  onValueChange,
}: SettingSwitchProps) {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextValue = !selectedValue;
    setSelectedValue(nextValue);
    if (onValueChange) {
      onValueChange(nextValue);
    }
  };

  return (
    <Pressable
      onPress={enabled ? handleToggle : undefined}
      disabled={!enabled}
      style={({ pressed }) => [
        setitem.setItemBase,
        {
          backgroundColor: currentTheme.element,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: currentTheme.border,
          opacity: enabled && pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={setitem.leftContainer} pointerEvents="none">
        {iconName && (
          <LinearGradient
            colors={["#F3E3A8", "#C9A227", "#7A5C12"]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={setitem.iconWrapper}
          >
            <Ionicons name={iconName} size={18} color="#2C1B0F" />
          </LinearGradient>
        )}
        <Text style={[setitem.settingName, { color: currentTheme.text }]}>
          {name}
        </Text>
      </View>

      <View style={setitem.rightContainer} pointerEvents="none">
        <SkeuoToggle
          value={selectedValue}
          enabled={enabled}
          onToggle={handleToggle}
        />
      </View>
    </Pressable>
  );
}

const toggle = StyleSheet.create({
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 1,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
});

const setitem = StyleSheet.create({
  setItemBase: {
    width: "100%",
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  rightContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    flex: 1,
    paddingRight: 4,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Materials.brassDark,
  },
  settingName: {
    fontSize: 17,
    fontWeight: "600",
  },
});

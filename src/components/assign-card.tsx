import { Themes } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Image,
} from "react-native";

type AssignCardProps = {
  seatNo: number;
  seatCode: string;
  name?: string;
  pfp?: string;
  onPress: () => void;
};

// 1. Fixed name conflict: changed function name from AssignCardProps to AssignCard
export default function AssignCard({
  seatNo,
  seatCode,
  name,
  pfp,
  onPress,
}: AssignCardProps) {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  return (
    // 2. Wired up your onPress handler and dynamic theme styles
    <Pressable
      onPress={onPress}
      style={[
        assigncard.baseCard,
        { backgroundColor: currentTheme.backgroundElement, borderColor: currentTheme.textSecondary },
      ]}
    >
      {/* 3. Fixed nested ternary layout syntax */}
      {name ? (
        pfp ? (
          <Image source={{ uri: pfp }} style={assigncard.avatar} />
        ) : (
          <Text style={[assigncard.monogram, { color: currentTheme.text }]}>
            {name.charAt(0).toUpperCase()}
          </Text>
        )
      ) : (
        <View style={assigncard.iconContainer}>
          <Host matchContents>
            <Icon
              name={Icon.select({
                ios: "plus",
                android: import("@expo/material-symbols/add.xml"), // Adjusted to common material name format
              })}
              color={currentTheme.textSecondary}
            />
          </Host>
          <Text style={[ assigncard.seatCode, { color: currentTheme.textSecondary } ]}>{seatCode.toUpperCase()}</Text>
        </View>
      )}
    </Pressable>
  );
}

const assigncard = StyleSheet.create({
  baseCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden", // Ensures profile picture respects border radius
  },
  avatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  monogram: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Body-Bold",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  seatCode: {
    fontFamily: "Condensed-Bold",
  }
});

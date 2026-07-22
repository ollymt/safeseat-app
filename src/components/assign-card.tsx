// components/assign-card.tsx
import { Themes } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import { opacity } from "@expo/ui/swift-ui/modifiers";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Image,
} from "react-native";

type Profile = {
  id: string;
  name: string;
  icon?: string;
  isAccountOwner?: boolean;
};

type AssignCardProps = {
  seatNo: number;
  seatCode: string;
  assignedProfile?: Profile | null;
  name?: string;
  pfp?: string;
  locked?: boolean
  state: string
  onPress: () => void;
};


export default function AssignCard({
  seatNo,
  seatCode,
  assignedProfile,
  name,
  pfp,
  state = "empty",
  locked = true,
  onPress,
}: AssignCardProps) {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const displayName = assignedProfile?.name ?? name;
  const displayIcon = assignedProfile?.icon ?? pfp;

  // Green outline when a seat is assigned; subtle gray dashed outline when unassigned
  const borderColor = displayName ? currentTheme.primaryBttn : currentTheme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        assigncard.baseCard,
        {
          backgroundColor: currentTheme.element,
          borderColor: state == "safe"
            ? currentTheme.primaryBttn
            : state == "warning"
              ? currentTheme.yellow
              : state == "emergency"
                ? currentTheme.warnBttn
                : currentTheme.text,
          opacity: state == "empty" ? 0.5 : 1,
          borderStyle: displayName ? "solid" : "dashed",
        },
      ]}
    >
      {displayName ? (
        <View style={assigncard.profileContainer}>
          {displayIcon ? (
            <Image
              source={{ uri: displayIcon }}
              style={[
                assigncard.avatar,
                {
                  borderColor: state == "safe"
                    ? currentTheme.primaryBttn
                    : state == "warning"
                      ? currentTheme.yellow
                      : state == "emergency"
                        ? currentTheme.warnBttn
                        : currentTheme.text,

                  borderWidth: 2
                },
              ]}
            />
          ) : (
            <View
              style={[
                assigncard.avatarFallback,
                { backgroundColor: currentTheme.primaryBttn },
              ]}
            >
              <Text style={[assigncard.monogram, { color: currentTheme.primaryBttnText }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={[assigncard.profileName, { color: currentTheme.text }]}
          >
            {displayName}
          </Text>
          <Text style={[assigncard.seatCode, { color: currentTheme.textSecondary }]}>
            {seatCode.toUpperCase()}
          </Text>
        </View>
      ) : (
        <View style={assigncard.iconContainer}>
          <Host matchContents>
            <Icon
              name={Icon.select({
                ios: "plus",
                android: import("@expo/material-symbols/add.xml"),
              })}
              color={currentTheme.textSecondary}
            />
          </Host>
          <Text style={[assigncard.seatCode, { color: currentTheme.textSecondary }]}>
            {seatCode.toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={{
        color: state == "safe"
          ? currentTheme.primaryBttn
          : state == "warning"
            ? currentTheme.yellow
            : state == "emergency"
              ? currentTheme.warnBttn
              : currentTheme.text,

        fontFamily: "Body-Bold",
        fontSize: 16,
        marginTop: 4
      }}>{state.toUpperCase()}</Text>
    </Pressable>
  );
}

const assigncard = StyleSheet.create({
  baseCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    padding: 8,
  },
  profileContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    resizeMode: "cover",
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  monogram: {
    fontSize: 22,
    fontWeight: "600",
  },
  profileName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  seatCode: {
    fontSize: 12,
  },
});
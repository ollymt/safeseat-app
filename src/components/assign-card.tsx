import { Themes } from "@/constants/theme";
import type { SafeSeatAssignment } from "@/types/safeseat-session";
import { Host, Icon } from "@expo/ui";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

export type AssignCardState =
  | "empty"
  | "assigned"
  | "monitored"
  | "unmonitored";

type AssignCardProps = {
  seatNo: number;
  seatCode: string;
  assignedProfile?: SafeSeatAssignment | null;
  state?: AssignCardState;
  onPress: () => void;
};

const STATE_LABELS: Record<AssignCardState, string> = {
  empty: "EMPTY",
  assigned: "ASSIGNED",
  monitored: "PROTOTYPE",
  unmonitored: "NOT MONITORED",
};

export default function AssignCard({
  seatCode,
  assignedProfile,
  state = "empty",
  onPress,
}: AssignCardProps) {
  const colorScheme = useColorScheme();
  const currentTheme = Themes[colorScheme === "dark" ? "dark" : "light"];

  const displayName = assignedProfile?.name;
  const displayIcon = assignedProfile?.photoURL ?? assignedProfile?.icon ?? undefined;
  const statusColor =
    state === "monitored"
      ? currentTheme.primaryBttn
      : state === "unmonitored"
        ? currentTheme.textSecondary
        : state === "assigned"
          ? currentTheme.blue
          : currentTheme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.baseCard,
        {
          backgroundColor: currentTheme.element,
          borderColor: statusColor,
          opacity: state === "empty" ? 0.55 : 1,
          borderStyle: displayName ? "solid" : "dashed",
        },
      ]}
    >
      {displayName ? (
        <View style={styles.profileContainer}>
          {displayIcon ? (
            <Image
              source={{ uri: displayIcon }}
              style={[styles.avatar, { borderColor: statusColor }]}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { backgroundColor: currentTheme.primaryBttn },
              ]}
            >
              <Text
                style={[
                  styles.monogram,
                  { color: currentTheme.primaryBttnText },
                ]}
              >
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <Text
            numberOfLines={1}
            style={[styles.profileName, { color: currentTheme.text }]}
          >
            {displayName}
          </Text>
          <Text style={[styles.seatCode, { color: currentTheme.textSecondary }]}>
            {seatCode.toUpperCase()}
          </Text>
        </View>
      ) : (
        <View style={styles.iconContainer}>
          <Host matchContents>
            <Icon
              name={Icon.select({
                ios: "plus",
                android: import("@expo/material-symbols/add.xml"),
              })}
              color={currentTheme.textSecondary}
            />
          </Host>
          <Text style={[styles.seatCode, { color: currentTheme.textSecondary }]}>
            {seatCode.toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={[styles.stateText, { color: statusColor }]}>
        {STATE_LABELS[state]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 2,
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
    textAlign: "center",
  },
  stateText: {
    fontFamily: "Body-Bold",
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
});

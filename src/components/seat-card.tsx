import { Themes } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import {
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

type SeatCardProps = {
  seatNo: number;
  name?: string;
  state?: "safe" | "warning" | "emergency" | "empty" ;
  onPress: () => void;
};

export default function SeatCard({
  seatNo,
  name = "empty",
  state = "empty",
  onPress,
}: SeatCardProps) {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  return (
    <Pressable
      style={[
        seatcard.baseCard,
        state == "empty" && seatcard.emptySeat,
        { backgroundColor: currentTheme.element },
      ]}
    >
      <View
        style={[
          seatcard.seatNoCont,
          {
            backgroundColor:
              state == "safe"
                ? currentTheme.primaryBttn
                : state == "warning"
                  ? currentTheme.yellow
                  : state == "emergency"
                    ? currentTheme.warnBttn
                    : currentTheme.text,
          },
        ]}
      >
        <Text style={[seatcard.seatNo, {color: currentTheme.background }]}>{seatNo}</Text>
      </View>
      <View
        style={{
          paddingVertical: 20,
          flex: 1,
          borderWidth: 0,
          borderColor: "#fff",
        }}
      >
        <Text style={[seatcard.name, { color: currentTheme.text, textTransform: "capitalize" }]}>
          {name}
        </Text>
      </View>
      {state == "safe" ? (
        <View
          style={{
            flexDirection: "row",
            gap: 4,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 0,
            paddingRight: 16,
            borderColor: "#fff",
          }}
        >
          <Host matchContents>
            <Icon
              name={Icon.select({
                ios: "checkmark.circle.fill",
                android: import("@expo/material-symbols/check.xml"),
              })}
              color={currentTheme.primaryBttn}
            />
          </Host>
          <Text
            style={[seatcard.stateName, { color: currentTheme.primaryBttn }]}
          >
            {state.toUpperCase()}
          </Text>
        </View>
      ) : state == "warning" ? (
        <View
          style={{
            flexDirection: "row",
            gap: 4,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 0,
            paddingRight: 16,
            borderColor: "#fff",
          }}
        >
          <Host matchContents>
            <Icon
              name={Icon.select({
                ios: "exclamationmark.triangle.fill",
                android: import("@expo/material-symbols/warning.xml"),
              })}
              color={currentTheme.yellow}
            />
          </Host>
          <Text style={[seatcard.stateName, { color: currentTheme.yellow }]}>
            {state.toUpperCase()}
          </Text>
        </View>
      ) : state == "emergency" ? (
        <View
          style={{
            flexDirection: "row",
            gap: 4,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 0,
            paddingRight: 16,
            borderColor: "#fff",
          }}
        >
          <Host matchContents>
            <Icon
              name={Icon.select({
                ios: "light.beacon.max.fill",
                android: import("@expo/material-symbols/siren.xml"),
              })}
              color={currentTheme.warnBttn}
            />
          </Host>
          <Text style={[seatcard.stateName, { color: currentTheme.warnBttn }]}>
            {state.toUpperCase()}
          </Text>
        </View>
      ) : (
        <View
          style={[{
            flexDirection: "row",
            gap: 4,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 0,
            paddingRight: 16,
            borderColor: "#fff",
          }]}
        >
          <Text style={[seatcard.stateName, { color: currentTheme.text }]}>
            {state.toUpperCase()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const seatcard = StyleSheet.create({
  baseCard: {
    width: "100%",
    borderWidth: 0,
    borderColor: "#fff",
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  seatNoCont: {
    width: "15%",
    alignItems: "center",
    justifyContent: "center",
  },
  seatNo: {
    fontSize: 48,
    fontFamily: "Logo-Font",
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 24,
    fontFamily: "Body-Bold",
  },
  stateName: {
    fontSize: 16,
    fontFamily: "Condensed-Bold",
  },
  emptySeat: {
    opacity: 0.5,
  },
});

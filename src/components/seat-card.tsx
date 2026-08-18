import { Materials, Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { PaperCard } from "@/components/skeuo";

type SeatCardProps = {
  seatNo: number;
  name?: string;
  state?: "safe" | "warning" | "emergency" | "empty";
  role?: string;
  onPress: () => void;
};

const STATE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; tone: readonly string[] }> = {
  safe: { icon: "checkmark-circle", tone: ["#8FCB57", "#4F8B29", "#2C5416"] },
  warning: { icon: "warning", tone: ["#F0C860", "#A6791F", "#6B4E12"] },
  emergency: { icon: "alert-circle", tone: ["#E36A54", "#A32A1B", "#5E140C"] },
  empty: { icon: "ellipse-outline", tone: ["#B9BDC4", "#8B8F98", "#5C5F66"] },
};

export default function SeatCard({
  seatNo,
  name = "empty",
  state = "empty",
  role,
  onPress,
}: SeatCardProps) {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];
  const meta = STATE_META[state] ?? STATE_META.empty;

  return (
    <Pressable onPress={onPress}>
      <PaperCard style={[seatcard.baseCard, state === "empty" && seatcard.emptySeat]}>
        <LinearGradient colors={meta.tone as any} style={seatcard.seatNoCont}>
          <Text style={seatcard.seatNo}>{seatNo}</Text>
        </LinearGradient>
        <View style={{ paddingVertical: 16, paddingLeft: 12, flex: 1 }}>
          {role && (
            <Text style={[seatcard.stateName, { color: currentTheme.textSecondary }]}>{role.toUpperCase()}</Text>
          )}
          <Text style={[seatcard.name, { color: currentTheme.text, textTransform: "capitalize" }]}>{name}</Text>
        </View>
        <View style={seatcard.statusChip}>
          <Ionicons name={meta.icon} size={18} color={Materials.leatherDark} />
          <Text style={seatcard.stateName}>{state.toUpperCase()}</Text>
        </View>
      </PaperCard>
    </Pressable>
  );
}

const seatcard = StyleSheet.create({
  baseCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 14,
  },
  seatNoCont: {
    width: 64,
    height: 64,
    margin: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
  },
  seatNo: {
    fontSize: 30,
    fontWeight: "900",
    color: "#2C1B0F",
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowOffset: { width: 0, height: 1 },
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
  },
  stateName: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: "#2C1B0F",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emptySeat: {
    opacity: 0.6,
  },
});
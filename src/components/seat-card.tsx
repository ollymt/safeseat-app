import checkXml from "@expo/material-symbols/check.xml";
import warningXml from "@expo/material-symbols/warning.xml";
import sirenXml from "@expo/material-symbols/siren.xml";
import circleXml from "@expo/material-symbols/circle.xml";
import { Themes as themes, Spacing as spacing } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type SeatCardProps = {
  seatNo: number;
  name?: string;
  photo?: string;
  state?: "safe" | "warning" | "emergency" | "empty" | "unknown";
  role?: string;
  onPress: () => void;
};

const stateMeta = {
  safe: { label: "SAFE", color: themes.green },
  warning: { label: "WARNING", color: themes.lightOrange },
  emergency: { label: "EMERGENCY", color: themes.warnBttn },
  unknown: { label: "ANALYZING", color: themes.info },
  empty: { label: "", color: themes.secondaryBttn },
} as const;

const getFormattedImageUri = (img?: string) => {
  if (!img || img === "Not Set" || img.trim() === "") return null;
  if (img.startsWith("http") || img.startsWith("data:")) return img;
  return `data:image/jpeg;base64,${img}`;
};

export default function SeatCard({
  seatNo,
  name = "empty",
  photo,
  state = "empty",
  role,
  onPress,
}: SeatCardProps) {
  const meta = stateMeta[state];
  const imageUri = getFormattedImageUri(photo);
  const displayName = name === "empty" ? "Empty" : name;

  const stateIcon = state === "safe"
    ? Icon.select({ ios: "checkmark.circle.fill", android: checkXml })
    : state === "warning"
      ? Icon.select({ ios: "exclamationmark.triangle.fill", android: warningXml })
      : state === "emergency"
        ? Icon.select({ ios: "light.beacon.max.fill", android: sirenXml })
        : Icon.select({ ios: "circle.dotted", android: circleXml });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${role ?? `Seat ${seatNo}`}, ${displayName}, ${state === "unknown" ? "analyzing" : state}`}
      android_ripple={{ color: "rgba(255,255,255,0.05)" }}
      style={({ pressed }) => [
        styles.baseCard,
        state === "empty" && styles.emptySeat,
        pressed && styles.pressed,
        { borderColor: `${meta.color}55` },
      ]}
    >
      <View style={[styles.avatarShell, { borderColor: meta.color, backgroundColor: `${meta.color}14` }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <Text style={styles.monogram}>{displayName.charAt(0).toUpperCase()}</Text>
        )}
        {state !== "empty" ? <View style={[styles.statusDot, { backgroundColor: meta.color }]} /> : null}
      </View>

      <View style={styles.copy}>
        {role ? <Text style={styles.role}>{role.toUpperCase()}</Text> : null}
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
      </View>

      {state !== "empty" ? (
        <View style={styles.rightSide}>
          <View style={[styles.statePill, { borderColor: `${meta.color}66`, backgroundColor: `${meta.color}12` }]}> 
            <Host matchContents>
              <Icon name={stateIcon} color={meta.color} size={16} />
            </Host>
            <Text style={[styles.stateName, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseCard: {
    width: "100%",
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one + 2,
    borderRadius: 20,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    paddingHorizontal: spacing.one + 4,
    paddingVertical: spacing.one,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  avatarShell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, resizeMode: "cover" },
  monogram: { color: themes.text, fontSize: 17, fontFamily: "Body-Bold" },
  statusDot: { position: "absolute", right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: themes.backgroundElement },
  copy: { flex: 1, minWidth: 0 },
  role: { color: themes.textSecondary, fontSize: 9.5, letterSpacing: 0.75, fontFamily: "Body-Bold" },
  name: { color: themes.text, fontSize: 17, fontFamily: "Body-Bold", marginTop: 2 },
  rightSide: { flexDirection: "row", alignItems: "center", gap: 7 },
  statePill: { paddingHorizontal: spacing.one, paddingVertical: 7, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.half },
  stateName: { fontSize: 9.5, letterSpacing: 0.45, fontFamily: "Body-Bold" },
  chevron: { color: themes.textMuted, fontSize: 25, lineHeight: 25, fontFamily: "Body-Regular", marginTop: -2 },
  emptySeat: { opacity: 0.86 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});

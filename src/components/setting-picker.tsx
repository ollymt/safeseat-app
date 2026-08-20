import { LeatherPanel, PaperCard } from "@/components/skeuo";
import { Materials, Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

type SettingPickerProps = {
  iconName?: keyof typeof Ionicons.glyphMap;
  name: string;
  value?: string; // e.g. "a+", "b-", "none"
  enabled?: boolean;
  isLast?: boolean;
  showChevron?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onPress?: () => void;
  onValueChange?: (newValue: string) => void;
};

const bloodTypes = [
  { label: "Not Set", value: "none" },
  { label: "A+", value: "a+" },
  { label: "A-", value: "a-" },
  { label: "B+", value: "b+" },
  { label: "B-", value: "b-" },
  { label: "AB+", value: "ab+" },
  { label: "AB-", value: "ab-" },
  { label: "O+", value: "o+" },
  { label: "O-", value: "o-" },
];

export default function SettingPicker({
  iconName,
  name,
  value = "none",
  isLast = false,
  enabled = true,
  onValueChange,
}: SettingPickerProps) {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const [selectedBloodType, setSelectedBloodType] = useState(value);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (value) setSelectedBloodType(value);
  }, [value]);

  const currentLabel =
    bloodTypes.find((b) => b.value === selectedBloodType)?.label || "Not Set";

  const handleSelectValue = (newValue: string) => {
    setSelectedBloodType(newValue);
    if (onValueChange) onValueChange(newValue);
    setDrawerOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={enabled ? () => setDrawerOpen(true) : undefined}
        disabled={!enabled}
        style={[
          setitem.setItemBase,
          {
            backgroundColor: currentTheme.element,
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: currentTheme.border,
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
          <Text style={[setitem.settingName, { color: currentTheme.text }]}>{name}</Text>
        </View>

        <View style={setitem.rightContainer} pointerEvents="none">
          <Text style={[setitem.settingValue, { color: currentTheme.primaryBttn }]}>
            {currentLabel}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={currentTheme.textSecondary} />
        </View>
      </Pressable>

      <Modal visible={drawerOpen} animationType="slide" transparent onRequestClose={() => setDrawerOpen(false)}>
        <View style={setitem.backdrop}>
          <LeatherPanel style={setitem.sheet} inset={10}>
            <Text style={setitem.drawerTitle}>Select {name}</Text>
            <PaperCard style={{ padding: 6 }}>
              {bloodTypes.map((b, i) => {
                const isSelected = b.value === selectedBloodType;
                return (
                  <Pressable
                    key={b.value}
                    onPress={() => handleSelectValue(b.value)}
                    style={[
                      setitem.radioRow,
                      i !== bloodTypes.length - 1 && { borderBottomWidth: 1, borderBottomColor: "rgba(120,90,50,0.25)" },
                    ]}
                  >
                    <Text style={[setitem.regularText, { color: isSelected ? currentTheme.primaryBttn : currentTheme.text, fontWeight: isSelected ? "800" : "600" }]}>
                      {b.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={currentTheme.primaryBttn} />}
                  </Pressable>
                );
              })}
            </PaperCard>
            <Pressable onPress={() => setDrawerOpen(false)} style={setitem.closeBtn}>
              <Text style={setitem.closeBtnText}>Close</Text>
            </Pressable>
          </LeatherPanel>
        </View>
      </Modal>
    </>
  );
}

const setitem = StyleSheet.create({
  setItemBase: {
    width: "100%",
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  leftContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  rightContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Materials.brassDark,
  },
  settingName: { fontSize: 17, fontWeight: "600" },
  settingValue: { fontSize: 16, fontWeight: "700" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { width: "100%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  drawerTitle: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 16, color: "#F1E3C6" },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: 14,
  },
  regularText: { fontSize: 16 },
  closeBtn: { alignItems: "center", marginTop: 16 },
  closeBtnText: { color: "#C9AC7C", fontSize: 15, fontWeight: "700" },
});
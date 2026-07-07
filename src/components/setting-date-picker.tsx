import { Themes } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
// 1. FIX: Import the drop-in replacement picker directly from @expo/ui
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

type SettingDatePickerProps = {
    iconName?: Parameters<typeof Icon>[0]["name"];
    name: string;
    value?: string; // ISO date string, e.g. "2026-07-07"
    enabled?: boolean;
    isLast?: boolean;
    onPress?: () => void;
    onValueChange?: (isoDateString: string) => void;
};

export default function SettingDatePickerItem({
    iconName,
    name,
    value,
    isLast = false,
    enabled = true,
    onPress,
    onValueChange,
}: SettingDatePickerProps) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    // Initialize with the prop value if it exists, otherwise fall back to today
    const [selectedBirthday, setSelectedBirthday] = useState(value ? new Date(value) : new Date());
    const [showPicker, setShowPicker] = useState(false);

    const formattedDate = selectedBirthday.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    return (
        <Pressable
            onPress={enabled ? onPress : undefined}
            disabled={!enabled}
            style={({ pressed }) => [
                setitem.setItemBase,
                {
                    backgroundColor: currentTheme.element,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: currentTheme.backgroundSelected,
                },
            ]}
        >
            <View style={setitem.leftContainer}>
                {iconName && (
                    <View
                        style={[
                            setitem.iconWrapper,
                            {
                                backgroundColor: currentTheme.primaryBttn,
                                padding: 6,
                                borderRadius: 8,
                            },
                        ]}
                    >
                        <Host style={{ width: 22, height: 22 }}>
                            <Icon name={iconName} color={currentTheme.primaryBttnText} />
                        </Host>
                    </View>
                )}

                <View style={{ borderWidth: 0, borderColor: "#fff" }}>
                    <Text style={[setitem.settingName, { color: currentTheme.text }]}>
                        {name}
                    </Text>
                </View>
            </View>

            <View
                style={{
                    flexDirection: "row",
                    flex: 1,
                    justifyContent: "flex-end",
                    gap: 6,
                }}
            >
                {/* Tappable value display section toggle */}
                <Pressable onPress={() => setShowPicker(true)}>
                    <Text style={[setitem.settingValue, { color: currentTheme.textSecondary || "#888" }]}>
                        {formattedDate}
                    </Text>
                </Pressable>

                {showPicker && (
                    <DateTimePicker
                        value={selectedBirthday}
                        mode="date"
                        // iOS supports "spinner", "compact", and "inline". Android handles this via presentation dialog strings.
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onValueChange={(event, date) => {
                            // iOS spinners stick around inline, whereas Android modal pickers close immediately on selection
                            setShowPicker(Platform.OS === "ios");
                            if (date) {
                                setSelectedBirthday(date);
                                if (onValueChange) {
                                    // Pass the structured ISO string format back to the parent save handler
                                    onValueChange(date.toISOString().split('T')[0]);
                                }
                            }
                        }}
                    />
                )}
            </View>
        </Pressable>
    );
}

const setitem = StyleSheet.create({
    setItemBase: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
    },
    leftContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 12,
    },
    iconWrapper: {
        justifyContent: "center",
        alignItems: "center",
    },
    settingName: {
        fontSize: 18,
        fontFamily: "Body-Medium",
    },
    settingValue: {
        fontSize: 16,
    }
});
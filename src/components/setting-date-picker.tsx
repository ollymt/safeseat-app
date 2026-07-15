import { Themes } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import { DatePicker } from "@expo/ui/swift-ui";
import { useState, useEffect, useRef } from "react";
import {
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

    // Micro-debounce handler ref to avoid multiple writes while scrolling native wheel/month calendars
    // @ts-ignore
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    // Initialize with the parent storage value if valid, fallback to current Date
    const [selectedBirthday, setSelectedBirthday] = useState(() => {
        if (value) {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date();
    });

    // Keep state in sync if parent state updates over asynchronous loading bounds
    useEffect(() => {
        if (value) {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
                // Ensure we don't force a reset if the timestamp values are fundamentally equal
                setSelectedBirthday((prev) =>
                    prev.getTime() === parsed.getTime() ? prev : parsed
                );
            }
        }
    }, [value]);

    // Cleanup active auto-save timers if the component unmounts mid-gesture
    useEffect(() => {
        return () => {
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
        };
    }, []);

    // Handle date selection, format it, and pass it back up to the saver wrapper
    const handleDateChange = (newDate: Date) => {
        console.log("date change triggered")
        setSelectedBirthday(newDate);

        if (onValueChange) {
            // Clear any pending save action if the user is actively flipping months/years
            console.log("value changed")
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
            }

            // Store as ISO (YYYY-MM-DD). This is the only string format that
            // `new Date(str)` is spec-guaranteed to parse reliably across JS
            // engines (including Hermes on React Native). Locale-formatted
            // strings like "Jul 07, 2026" can silently fail to re-parse on
            // mount (isNaN(parsed.getTime()) === true), which falls back to
            // `new Date()` (today) — that's what made the birthday look like
            // it "wasn't saving": it was saved fine, but couldn't be read back.
            const isoDate = newDate.toISOString().slice(0, 10);

            // Delay the parent storage commit by 400ms to settle interaction cycles cleanly
            saveTimeout.current = setTimeout(() => {
                if (isoDate !== value) {
                    onValueChange(isoDate);
                }
            }, 400);
        }
    };

    return (
        <Pressable
            onPress={enabled ? onPress : undefined}
            disabled={!enabled}
            style={[
                setitem.setItemBase,
                {
                    backgroundColor: currentTheme.element,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: currentTheme.border,
                }
            ]}
        >
            <View style={setitem.leftContainer} pointerEvents="none">
                {iconName && (
                    <View style={[setitem.iconWrapper, { backgroundColor: currentTheme.primaryBttn, padding: 6, borderRadius: 8 }]}>
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

            <View style={{ flexDirection: "row", flex: 1, justifyContent: "flex-end", gap: 6 }}>
                <Host matchContents>
                    <DatePicker
                        selection={selectedBirthday}
                        displayedComponents={["date"]}
                        onDateChange={handleDateChange}
                    />
                </Host>
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
    }
});
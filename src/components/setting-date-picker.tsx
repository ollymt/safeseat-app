import { Themes } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import { DatePicker } from "@expo/ui/swift-ui";
import { useState } from "react";
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
    value?: string;
    enabled?: boolean;
    isLast?: boolean;
    onPress?: () => void;
};

export default function SettingDatePickerItem({
    iconName,
    name,
    value,
    isLast = false,
    enabled = true,
    onPress,
}: SettingDatePickerProps) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const [ selectedBirthday, setSelectedBirthday ] = useState(new Date())

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
                }
            ]}
        >
            <View style={setitem.leftContainer}>
                {/* 1. Render Icon natively only if iconName prop exists */}
                {iconName && (
                    <View style={[setitem.iconWrapper, { backgroundColor: currentTheme.primaryBttn, padding: 6, borderRadius: 8 }]}>
                        <Host style={{ width: 22, height: 22 }}>
                            <Icon name={iconName} color={currentTheme.primaryBttnText} />
                        </Host>
                    </View>
                )}

                {/* 2. Primary Label */}
                <View style={{ borderWidth: 0, borderColor: "#fff" }}>
                    <Text style={[setitem.settingName, { color: currentTheme.text }]}>
                        {name}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: "row", flex: 1, justifyContent: "flex-end", gap: 6 }}>
                {/* 3. Optional Right-Side Value String */}
                <Host matchContents>
                    <DatePicker
                        selection={selectedBirthday}
                        displayedComponents={["date"]}
                        onDateChange={date => {
                            setSelectedBirthday(date);
                        }}
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
    rightContainer: {
        width: "auto",
        borderWidth: 0,
        borderColor: "#fff",
        flex: 0.9,
        marginLeft: 10,
        textAlign: "right",
        justifyContent: "flex-end",
        alignItems: "center",
        flexDirection: "row"
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
        fontSize: 18,
        fontFamily: "Condensed-Bold",
    }
});
import { Materials, Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

type SettingPageItemProps = {
    iconName?: keyof typeof Ionicons.glyphMap;
    name: string;
    value?: string;
    enabled?: boolean;
    isLast?: boolean;
    destructive?: boolean;
    showChevron?: boolean;
    onPress?: () => void;
};

export default function SettingPageItem({
    iconName,
    name,
    value,
    showChevron = false,
    isLast = false,
    destructive = false,
    enabled = true,
    onPress,
}: SettingPageItemProps) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    return (
        <Pressable
            onPress={enabled ? onPress : undefined}
            disabled={!enabled}
            style={({ pressed }) => [
                setitem.setItemBase,
                {
                    backgroundColor: currentTheme.element,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: currentTheme.border,
                    opacity: enabled ? (pressed ? 0.85 : 1) : 0.5,
                },
            ]}
        >
            <View style={setitem.leftContainer}>
                {iconName && (
                    <LinearGradient
                        colors={destructive ? ["#E36A54", "#A32A1B", "#5E140C"] : ["#F3E3A8", "#C9A227", "#7A5C12"]}
                        start={{ x: 0.3, y: 0 }}
                        end={{ x: 0.7, y: 1 }}
                        style={setitem.iconWrapper}
                    >
                        <Ionicons name={iconName} size={18} color={destructive ? "#F6E9D8" : "#2C1B0F"} />
                    </LinearGradient>
                )}

                <View>
                    <Text
                        style={[
                            setitem.settingName,
                            { color: destructive ? currentTheme.warnBttn : currentTheme.text },
                        ]}
                    >
                        {name}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: "row", flex: 1, justifyContent: "flex-end", gap: 6, alignItems: "center" }}>
                {value && (
                    <View style={setitem.rightContainer}>
                        <Text
                            style={[setitem.settingValue, { color: currentTheme.textSecondary }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {value}
                        </Text>
                    </View>
                )}

                {showChevron && (
                    <Ionicons name="chevron-forward" size={18} color={currentTheme.textSecondary} />
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
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    leftContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 12,
    },
    rightContainer: {
        width: "auto",
        flex: 0.9,
        marginLeft: 10,
        justifyContent: "flex-end",
        alignItems: "center",
        flexDirection: "row",
    },
    iconWrapper: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Materials.brassDark,
    },
    settingName: {
        fontSize: 17,
        fontWeight: "600",
    },
    settingValue: {
        fontSize: 16,
        fontWeight: "600",
    },
});
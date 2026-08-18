import React from "react";
import { StyleSheet, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Themes } from "@/constants/theme";

type Props = {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
};

export default function AdaptiveSearchBar({
    value,
    onChangeText,
    placeholder = "Search...",
}: Props) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const currentTheme = Themes[isDark ? "dark" : "light"];

    return (
        <View style={[styles.baseContainer, { backgroundColor: isDark ? "#1B1108" : "#DCC89C" }]}>
            <Ionicons name="search" size={18} color={currentTheme.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={currentTheme.textSecondary}
                style={[styles.input, { color: currentTheme.text }]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    baseContainer: {
        width: "100%",
        height: 46,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        borderWidth: 1.5,
        borderTopColor: "rgba(0,0,0,0.45)",
        borderLeftColor: "rgba(0,0,0,0.3)",
        borderRightColor: "rgba(255,255,255,0.25)",
        borderBottomColor: "rgba(255,255,255,0.3)",
    },
    input: {
        fontSize: 16,
        height: "100%",
        flex: 1,
        fontWeight: "600",
    },
});
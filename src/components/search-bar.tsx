import React from "react";
import {
    StyleSheet,
    TextInput,
    View,
    Platform,
    PlatformColor,
    useColorScheme,
} from "react-native";
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

    // 🎨 iOS Liquid Glass Styles
    const iosGlassColor = isDark
        ? PlatformColor("systemChromeMaterialDark")
        : PlatformColor("systemChromeMaterialLight");
    const iosBorderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)";

    // 🤖 Android Material You Styles (Solid background from your theme with dynamic card tints)
    const androidBgColor = isDark ? "#2C2C2C" : "#F0F0F0";

    // Combine styles conditionally based on platform
    const containerStyle = Platform.select({
        ios: {
            backgroundColor: iosGlassColor,
            borderColor: iosBorderColor,
            borderWidth: 1,
            borderRadius: 25,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
        },
        android: {
            backgroundColor: androidBgColor,
            borderRadius: 28, // Material 3 uses slightly more rounded, organic pill shapes
            elevation: 2, // Physical shadow layer
        },
    });

    return (
        <View style={[styles.baseContainer, containerStyle]}>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)"}
                style={[
                    styles.input,
                    {
                        color: currentTheme.text,
                        fontFamily: Platform.OS === "ios" ? "System" : "sans-serif"
                    }
                ]}
                clearButtonMode="while-editing" // Adds standard Apple clear button
            />
        </View>
    );
}

const styles = StyleSheet.create({
    baseContainer: {
        width: "100%",
        height: 50,
        paddingHorizontal: 16,
        justifyContent: "center",
    },
    input: {
        fontSize: 16,
        height: "100%",
        paddingVertical: 8,
    },
});
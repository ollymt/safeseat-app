// A brushed-metal, inset text field — replaces @expo/ui's native
// Host/Column/FieldGroup/TextInput SwiftUI bridge with a plain RN
// TextInput dressed up to look like an engraved dashboard slot.
import { Materials, Themes } from "@/constants/theme";
import { forwardRef } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    useColorScheme,
    View,
} from "react-native";

type SkeuoInputProps = TextInputProps & {
    label?: string;
};

const SkeuoInput = forwardRef<TextInput, SkeuoInputProps>(function SkeuoInput(
    { label, style, ...rest },
    ref
) {
    const scheme = useColorScheme();
    const activeScheme = scheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    return (
        <View style={{ width: "100%", gap: 6 }}>
            {label && (
                <Text style={[styles.label, { color: currentTheme.textSecondary }]}>
                    {label.toUpperCase()}
                </Text>
            )}
            <View style={[styles.slot, { backgroundColor: activeScheme === "dark" ? "#1B1108" : "#DCC89C" }]}>
                <TextInput
                    ref={ref}
                    placeholderTextColor={currentTheme.textSecondary}
                    style={[styles.input, { color: currentTheme.text }, style]}
                    {...rest}
                />
            </View>
        </View>
    );
});

export default SkeuoInput;

const styles = StyleSheet.create({
    label: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.8,
        marginLeft: 4,
    },
    slot: {
        width: "100%",
        height: 50,
        borderRadius: 10,
        paddingHorizontal: 14,
        justifyContent: "center",
        borderWidth: 1.5,
        borderTopColor: "rgba(0,0,0,0.45)",
        borderLeftColor: "rgba(0,0,0,0.3)",
        borderRightColor: "rgba(255,255,255,0.25)",
        borderBottomColor: "rgba(255,255,255,0.3)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 1,
    },
    input: {
        fontSize: 16,
        fontWeight: "600",
        height: "100%",
    },
});
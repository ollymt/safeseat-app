import { useState } from "react";
import { StyleSheet, TextInput as RNTextInput, KeyboardTypeOptions } from "react-native";

import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";

type TextInputProps = {
    type?: "text" | "email" | "phone" | "number" | "password";
    variant?: "regular" | "warn";
    placeholder?: string;
    enabled?: boolean;
    value?: string;
    onChangeText?: (text: string) => void;
};

export default function TextInput({
    type = "text",
    variant = "regular",
    placeholder,
    enabled = true,
    value,
    onChangeText,
}: TextInputProps) {
    const [internalText, setInternalText] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    // Determines the keyboard layout
    const getKeyboardType = (): KeyboardTypeOptions => {
        switch (type) {
            case "email":
                return "email-address";
            case "phone":
                return "phone-pad";
            case "number":
                return "numeric";
            default:
                return "default";
        }
    };

    return (
        <RNTextInput
            style={[
                styles.input,
                variant === "warn" && styles.warnInput,
                !enabled && styles.disabledInput,
                isFocused && enabled && styles.focused,
            ]}
            editable={enabled}
            onChangeText={onChangeText || setInternalText}
            value={value !== undefined ? value : internalText}
            placeholder={placeholder}
            placeholderTextColor={themes.textInputPlaceholder}
            onFocus={() => enabled && setIsFocused(true)}
            onBlur={() => setIsFocused(false)}

            // Native input type configurations
            keyboardType={getKeyboardType()}
            secureTextEntry={type === "password"}
            autoCapitalize={type === "email" || type === "password" ? "none" : "sentences"}
            autoCorrect={type !== "password"}
            textContentType={
                type === "password"
                    ? "password"
                    : type === "email"
                        ? "emailAddress"
                        : type === "phone"
                            ? "telephoneNumber"
                            : "none"
            }
        />
    );
}

const styles = StyleSheet.create({
    input: {
        height: spacing.six,
        borderWidth: spacing.quarter,
        paddingHorizontal: spacing.two,
        fontSize: fontsize.button,
        borderRadius: spacing.edge,
        color: themes.text,
        fontFamily: "Body-Medium",
        backgroundColor: themes.backgroundElement,
        borderColor: themes.textSecondary,
        borderStyle: "dashed"
    },
    focused: {
        borderColor: themes.text,
        borderStyle: "solid"
    },
    warnInput: {
        borderColor: themes.warnBttn,
    },
    disabledInput: {
        opacity: 0.5,
    },
});
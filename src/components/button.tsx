import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import type { ReactNode } from "react";

type ButtonProps = {
  variant?: "primary" | "secondary" | "warn" | "tertiary";
  label?: string;
  enabled?: boolean;
  fullWidth?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  loading?: boolean;
};

export default function Button({
  variant = "primary",
  label,
  enabled = true,
  fullWidth = false,
  onPress,
  style,
  children,
  loading = false,
}: ButtonProps) {
  const handlePress = () => {
    if (!enabled || loading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const spinnerColor =
    variant === "primary"
      ? themes.primaryBttnText
      : variant === "warn"
        ? themes.warnBttnText
        : themes.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled || loading, busy: loading }}
      onPress={handlePress}
      disabled={!enabled || loading}
      style={({ pressed }) => [
        styles.baseButton,
        variant === "primary" && styles.primaryButton,
        variant === "secondary" && styles.secondaryButton,
        variant === "warn" && styles.warnButton,
        variant === "tertiary" && styles.tertiaryButton,
        fullWidth && styles.fullWidth,
        (!enabled || loading) && styles.disabledButton,
        pressed && enabled && !loading && styles.pressedButton,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {children}
          {label ? (
            <Text
              style={[
                styles.baseText,
                variant === "primary" && styles.primaryText,
                variant === "secondary" && styles.secondaryText,
                variant === "tertiary" && styles.tertiaryText,
                variant === "warn" && styles.warnText,
              ]}
            >
              {label}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    minHeight: spacing.six,
    paddingVertical: spacing.one,
    paddingHorizontal: spacing.two,
    borderRadius: spacing.edge,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: themes.primaryBttn,
  },
  secondaryButton: {
    backgroundColor: themes.secondaryBttn,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  warnButton: {
    backgroundColor: themes.warnBttn,
  },
  tertiaryButton: {
    backgroundColor: "transparent",
  },
  fullWidth: {
    width: "100%",
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  baseText: {
    fontSize: fontsize.button,
    fontFamily: "Body-Bold",
    textAlign: "center",
  },
  primaryText: {
    color: themes.primaryBttnText,
  },
  secondaryText: {
    color: themes.text,
  },
  tertiaryText: {
    color: themes.primaryBttn,
  },
  warnText: {
    color: themes.warnBttnText,
  },
});

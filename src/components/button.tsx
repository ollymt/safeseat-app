import { Themes } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";

type ButtonProps = {
  variant?: "primary" | "secondary" | "warn" | "tertiary"; // Using literal types instead of generic string prevents typing bugs!
  label: string;
  enabled?: boolean; // Made optional with ? so it defaults nicely
  fullWidth?: boolean; // Made optional with ? so it defaults nicely
  onPress: () => void;
  style?: any;
};

export default function Button({
  variant = "primary",
  label = "Button",
  enabled = true,
  fullWidth = false, // Added missing comma
  onPress,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const activeScheme = colorScheme === "dark" ? "dark" : "light";
  const currentTheme = Themes[activeScheme];

  const handlePress = () => {
    // Triggers a light, crisp native tap feel
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Then fire the regular onPress action passed by the parent screen
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!enabled} // Wired up the native disabled state
      style={[
        style,
        button.baseButton,
        fullWidth && { width: "100%" }, // Wired up the fullWidth check dynamically

        // Dynamic styling check
        variant === "primary"
          ? { backgroundColor: currentTheme.primaryBttn }
          : variant === "secondary"
            ? { backgroundColor: currentTheme.secondaryBttn }
            : variant === "warn" ? { backgroundColor: currentTheme.warnBttn }
            : { backgroundColor: "none" }, // Fixed the "varian" typo to point to warn

        !enabled && button.disabledButton, // Applies opacity if disabled is passed
      ]}
    >
      <Text
        style={[
          button.baseText,
          variant === "primary" || variant === "warn"
            ? { color: currentTheme.primaryBttnText, fontWeight: "bold" }
            : variant === "secondary" ? { color: currentTheme.secondaryBttnText }
            : { color: currentTheme.primaryBttn },

          !enabled && button.disabledText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const button = StyleSheet.create({
  disabledButton: {
    opacity: 0.5,
  },
  baseButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center", // Centers text inside horizontal capsules
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#25601D",
  },
  secondaryButton: {
    backgroundColor: "#cccccc",
  },
  warnButton: {
    backgroundColor: "#f5425d",
  },
  disabledText: {
    opacity: 0.5,
  },
  baseText: {
    fontSize: 16,
    fontWeight: 600,
  },
  primaryText: {
    color: "#ffffff",
    fontFamily: "Body-Bold",
  },
  secondaryText: {
    color: "#000000",
    fontFamily: "Body-Medium",
  },
  warnText: {
    color: "#ffffff",
    fontFamily: "Body-Medium",
  },
});

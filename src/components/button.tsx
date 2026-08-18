import { Gradients, Materials, Themes } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { GlossSurface } from "@/components/skeuo";

type ButtonProps = {
	variant?: "primary" | "secondary" | "warn" | "tertiary";
	label?: string;
	enabled?: boolean;
	fullWidth?: boolean;
	onPress: () => void;
	style?: any;
	children?: any;
	glass?: boolean; // kept for API compatibility, unused (no native glass here)
};

const TONE_BY_VARIANT: Record<string, readonly string[]> = {
	primary: Gradients.glossGreen,
	warn: Gradients.glossRed,
	secondary: Gradients.glossTan,
};

export default function Button({
	variant = "primary",
	label,
	enabled = true,
	fullWidth = false,
	onPress,
	style,
	children,
}: ButtonProps) {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	const handlePress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onPress();
	};

	if (variant === "tertiary") {
		// A plain engraved-text link, no leather/plastic body.
		return (
			<Pressable
				onPress={handlePress}
				disabled={!enabled}
				style={[fullWidth && { width: "100%" }, { alignItems: "center", opacity: enabled ? 1 : 0.5 }, style]}
			>
				{children}
				{label && (
					<Text style={[button.baseText, { color: currentTheme.primaryBttn, textDecorationLine: "underline" }]}>
						{label}
					</Text>
				)}
			</Pressable>
		);
	}

	const tone = TONE_BY_VARIANT[variant] ?? Gradients.glossGreen;
	const textColor =
		variant === "secondary" ? currentTheme.secondaryBttnText : currentTheme.primaryBttnText;

	return (
		<GlossSurface
			tone={tone}
			style={[button.baseButton, fullWidth && { width: "100%" }, !enabled && button.disabledButton, style]}
		>
			<Pressable
				style={{ width: "100%", alignItems: "center", justifyContent: "center", paddingVertical: 15 }}
				onPress={handlePress}
				disabled={!enabled}
			>
				{children}
				{label && (
					<Text
						style={[
							button.baseText,
							{
								color: textColor,
								textShadowColor: "rgba(0,0,0,0.35)",
								textShadowOffset: { width: 0, height: 1 },
								textShadowRadius: 1,
							},
						]}
					>
						{label}
					</Text>
				)}
			</Pressable>
		</GlossSurface>
	);
}

const button = StyleSheet.create({
	disabledButton: {
		opacity: 0.45,
	},
	baseButton: {
		alignItems: "center",
		justifyContent: "center",
	},
	baseText: {
		fontSize: 17,
		fontWeight: "800",
		letterSpacing: 0.3,
	},
});
import { Themes } from "@/constants/theme";
import { GlassView } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";

type ButtonProps = {
	variant?: "primary" | "secondary" | "warn" | "tertiary"; // Using literal types instead of generic string prevents typing bugs!
	label?: string;
	enabled?: boolean; // Made optional with ? so it defaults nicely
	fullWidth?: boolean; // Made optional with ? so it defaults nicely
	onPress: () => void;
	style?: any;
	children?: any;
	glass?: boolean;
};

export default function Button({
	variant = "primary",
	label,
	enabled = true,
	fullWidth = false,
	onPress,
	style,
	children,
	glass = false,
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

	const containerStyle = [
		style,
		button.baseButton,
		fullWidth && { width: "100%" as const }, // Wired up the fullWidth check dynamically
		{ alignItems: "center" as const, justifyContent: "center" as const },
		// Dynamic styling check
		variant === "primary"
			? { backgroundColor: currentTheme.primaryBttn }
			: variant === "secondary"
				? { backgroundColor: currentTheme.secondaryBttn }
				: variant === "warn"
					? { backgroundColor: currentTheme.warnBttn }
					: { backgroundColor: "transparent" }, // Fixed the "varian" typo to point to warn

		!enabled && button.disabledButton, // Applies opacity if disabled is passed
	];

	const textStyle = [
		button.baseText,
		variant === "primary" || variant === "warn"
			? { color: currentTheme.primaryBttnText, fontWeight: "bold" as const }
			: variant === "secondary"
				? { color: currentTheme.text }
				: { color: currentTheme.primaryBttn },

		!enabled && button.disabledText,
	];

	const content = (
		<Pressable
			style={{ width: "100%", alignItems: "center" }}
			onPress={handlePress}
			disabled={!enabled} // Wired up the native disabled state
		>
			{children}
			{label && <Text style={textStyle}>{label}</Text>}
		</Pressable>
	);

	return glass ? (
		<GlassView style={containerStyle}>{content}</GlassView>
	) : (
		<View style={containerStyle}>{content}</View>
	);
}

const button = StyleSheet.create({
	disabledButton: {
		opacity: 0.5,
	},
	baseButton: {
		padding: 16,
		borderRadius: 100,
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
		fontWeight: "600",
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
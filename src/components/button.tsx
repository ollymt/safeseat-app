import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { GlassView } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View, ActivityIndicator, StyleProp, PressableProps, ViewStyle } from "react-native";

type ButtonProps = {
	variant?: "primary" | "secondary" | "warn" | "tertiary";
	label?: string;
	enabled?: boolean;
	fullWidth?: boolean;
	onPress: () => void;
	style?: StyleProp<ViewStyle>;
	children?: any;
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
		if (enabled) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			onPress();
		}
	};

	const containerStyle = [
		button.baseButton,
		variant === "primary" && button.primaryButton,
		variant === "secondary" && button.secondaryButton,
		variant === "warn" && button.warnButton,
		variant === "tertiary" && button.tertiaryButton,
		fullWidth && button.fullWidth,
		!enabled && button.disabledButton,
		style,
	];

	const textStyle = [
		button.baseText,
		variant === "primary" && button.primaryText,
		variant === "secondary" && button.secondaryText,
		variant === "tertiary" && button.tertiaryText,
		variant === "warn" && button.warnText,
		!enabled && button.disabledText,
	];

	const content = (
		<Pressable
			style={[style, button.pressableContent]}
			onPress={handlePress}
			disabled={!enabled}
		>
			{loading ? <ActivityIndicator color={themes.text} /> : (
				<>
					{children}
					{label && <Text style={[variant === "primary" ? button.primaryText : variant === "secondary" ? button.secondaryText : variant === "tertiary" ? button.tertiaryText : variant === "warn" ? button.warnText : button.baseText, button.baseText]}>{label}</Text>}
				</>
			)}
		</Pressable>
	);

	return <View style={containerStyle}>{content}</View>
}

const button = StyleSheet.create({
	baseButton: {
		paddingTop: spacing.one,
		paddingBottom: spacing.one,
		paddingLeft: spacing.two,
		paddingRight: spacing.two,
		borderRadius: spacing.edge,
		height: spacing.six,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButton: {
		backgroundColor: themes.primaryBttn,
	},
	secondaryButton: {
		backgroundColor: themes.secondaryBttn,
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
		opacity: 0.5,
	},
	pressableContent: {
		width: "100%",
		alignItems: "center",
	},
	baseText: {
		fontSize: fontsize.button,
		fontWeight: "600",
	},
	primaryText: {
		color: themes.primaryBttnText,
		fontWeight: "bold",
	},
	secondaryText: {
		color: themes.text,
	},
	tertiaryText: {
		color: themes.primaryBttn,
		textDecorationLine: "underline",
	},
	warnText: {
		color: themes.warnBttnText
	},
	disabledText: {
		opacity: 0.5,
	},
});
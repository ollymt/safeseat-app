import { Themes } from "@/constants/theme";
import { Text, useColorScheme, View, StyleSheet } from "react-native";

type TextBlockProps = {
	text: string;
};

export default function TextBlock({ text }: TextBlockProps) {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	return (
		<View
			style={[
				textblockstyles.baseCard,
				{ backgroundColor: currentTheme.element },
			]}
		>
			<Text style={{ color: currentTheme.text, fontSize: 18, fontFamily: "Body-Bold" }}>{text}</Text>
		</View>
	);
}

const textblockstyles = StyleSheet.create({
	baseCard: {
		padding: 12,
		borderRadius: 8,
	},
});

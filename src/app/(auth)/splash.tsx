import Button from "@/components/button";
import { Spacing as spacing, FontSize as fontsize } from "@/constants/theme";

import { useRouter } from "expo-router";
import {
	Dimensions,
	ImageBackground,
	StyleSheet,
	Text,
	View,
	useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: screenWidth } = Dimensions.get("window");

export default function SplashScreen() {
	const router = useRouter();

	return (
		<ImageBackground
			source={{
				uri: "https://images.stockcake.com/public/f/4/6/f46a0b7f-157f-4ba7-a89a-da22a67672ee_large/busy-night-traffic-stockcake.jpg",
			}}
			style={{ flex: 1 }}
			blurRadius={5}
		>
			<SafeAreaView
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: "#000000CC",
				}}
			>
				<View style={styles.container}>
					<View
						style={{
							flex: 9,
							alignItems: "center",
							justifyContent: "center",
							borderWidth: 0,
							borderColor: "#0000ff",
						}}
					>
						<Text style={styles.loginlogo}>SafeSeat</Text>
					</View>

					<View
						style={{
							width: "100%",
							flex: 1,
							borderColor: "#ff0000",
							borderWidth: 0,
						}}
					>
						<View style={{ width: "100%", flexDirection: "row", gap: 5 }}>
							<Button
								label="Sign-up"
								onPress={() => {
									router.push("/(auth)/signup");
								}}
								variant="secondary"
								style={{ flex: 1 }}
							/>
							<Button
								label="Log-in"
								onPress={() => {
									router.push("/(auth)/login");
								}}
								style={{ flex: 1 }}
							/>
						</View>
					</View>
				</View>
			</SafeAreaView>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: "100%",
		borderColor: "#000",
		borderWidth: 0,
		padding: spacing.two
	},
	loginlogo: {
		fontSize: fontsize.giant,
		fontFamily: "Logo-Font",
		textAlign: "center",
		color: "#ffffff",
	},
	backgroundImage: {
		...StyleSheet.absoluteFill,
		width: "100%",
		height: "100%",
	}
});

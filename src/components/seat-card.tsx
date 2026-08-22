import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import {
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";

type SeatCardProps = {
	seatNo: number;
	name?: string;
	state?: "safe" | "warning" | "emergency" | "empty";
	role?: string;
	onPress: () => void;
};

export default function SeatCard({
	seatNo,
	name = "empty",
	state = "empty",
	role,
	onPress,
}: SeatCardProps) {
	return (
		<Pressable
			style={[
				seatcard.baseCard,
				state == "empty" && seatcard.emptySeat,
				{
					backgroundColor: themes.backgroundElement,
					borderWidth: spacing.quarter,
					boxSizing: "border-box",
					borderStyle: state == "empty" ? "dashed" : "solid",
					borderColor:
						state == "safe"
							? themes.green
							: state == "warning"
								? themes.lightOrange
								: state == "emergency"
									? themes.warnBttn
									: themes.text,
				},
			]}
		>
			<View
				style={[
					seatcard.leftArea,
					{
						backgroundColor:
							state == "safe"
								? themes.green
								: state == "warning"
									? themes.lightOrange
									: state == "emergency"
										? themes.warnBttn
										: themes.text,
					},
				]}
			/>
			<View
				style={{
					paddingVertical: spacing.two,
					flex: 1,
					borderWidth: spacing.none,
					borderColor: "#fff",
				}}
			>
				{role &&
					<Text
						style={[seatcard.role, { color: themes.textSecondary }]}
					>
						{role.toUpperCase()}
					</Text>
				}

				<Text style={[seatcard.name, { color: themes.text, textTransform: "capitalize" }]}>
					{name}
				</Text>
			</View>
			{state == "safe" ? (
				<View
					style={{
						flexDirection: "row",
						gap: spacing.half,
						alignItems: "center",
						justifyContent: "center",
						borderWidth: spacing.none,
						paddingRight: spacing.two,
					}}
				>
					<Host matchContents>
						<Icon
							name={Icon.select({
								ios: "checkmark.circle.fill",
								android: import("@expo/material-symbols/check.xml"),
							})}
							color={themes.green}
						/>
					</Host>
					<Text
						style={[seatcard.stateName, { color: themes.green }]}
					>
						{state.toUpperCase()}
					</Text>
				</View>
			) : state == "warning" ? (
				<View
					style={{
						flexDirection: "row",
						gap: spacing.half,
						alignItems: "center",
						justifyContent: "center",
						borderWidth: spacing.none,
						paddingRight: spacing.two,
					}}
				>
					<Host matchContents>
						<Icon
							name={Icon.select({
								ios: "exclamationmark.triangle.fill",
								android: import("@expo/material-symbols/warning.xml"),
							})}
							color={themes.lightOrange}
						/>
					</Host>
					<Text style={[seatcard.stateName, { color: themes.lightOrange }]}>
						{state.toUpperCase()}
					</Text>
				</View>
			) : state == "emergency" ? (
				<View
					style={{
						flexDirection: "row",
						gap: spacing.half,
						alignItems: "center",
						justifyContent: "center",
						borderWidth: spacing.none,
						paddingRight: spacing.two,
					}}
				>
					<Host matchContents>
						<Icon
							name={Icon.select({
								ios: "light.beacon.max.fill",
								android: import("@expo/material-symbols/siren.xml"),
							})}
							color={themes.warnBttn}
						/>
					</Host>
					<Text style={[seatcard.stateName, { color: themes.warnBttn }]}>
						{state.toUpperCase()}
					</Text>
				</View>
			) : (
				<View
					style={[{
						flexDirection: "row",
						gap: spacing.half,
						alignItems: "center",
						justifyContent: "center",
						borderWidth: spacing.none,
						paddingRight: spacing.two,
					}]}
				>
					<Text style={[seatcard.stateName, { color: themes.text }]}>
						{state.toUpperCase()}
					</Text>
				</View>
			)}
		</Pressable>
	);
}

const seatcard = StyleSheet.create({
	baseCard: {
		width: "100%",
		borderWidth: spacing.none,
		borderColor: "#fff",
		flexDirection: "row",
		gap: spacing.one,
		borderRadius: spacing.edge,
		overflow: "hidden",
		padding: spacing.quarter,
	},
	seatNoCont: {
		width: "15%",
		alignItems: "center",
		justifyContent: "center",
	},
	leftArea: {
		width: spacing.three,
		borderTopLeftRadius: spacing.one,
		borderTopRightRadius: spacing.quarter,
		borderBottomLeftRadius: spacing.one,
		borderBottomRightRadius: spacing.quarter
	},
	name: {
		fontSize: fontsize.header,
		fontFamily: "Body-Bold",
	},
	stateName: {
		fontSize: fontsize.body,
		fontFamily: "Body-Bold",
	},
	role: {
		fontSize: fontsize.caption,
		fontFamily: "Body-Bold"
	},
	emptySeat: {
		opacity: 0.5,
	},
});

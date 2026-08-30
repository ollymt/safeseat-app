import checkXml from "@expo/material-symbols/check.xml";
import warningXml from "@expo/material-symbols/warning.xml";
import sirenXml from "@expo/material-symbols/siren.xml";
import questionXml from "@expo/material-symbols/question_mark.xml";
import addXml from "@expo/material-symbols/add.xml";
// components/assign-card.tsx
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import {
	Pressable,
	StyleSheet,
	Text,
	View,
	Image,
} from "react-native";

type Profile = {
	id: string;
	name: string;
	icon?: string;
	isAccountOwner?: boolean;
};

type AssignCardProps = {
	seatNo: number;
	seatCode: string;
	assignedProfile?: Profile | null;
	name?: string;
	pfp?: string;
	locked?: boolean;
	state: string;
	onPress: () => void;
};

export default function AssignCard({
	seatNo,
	seatCode,
	assignedProfile,
	name,
	pfp,
	state = "empty",
	locked = true,
	onPress,
}: AssignCardProps) {
	const displayName = assignedProfile?.name ?? name;
	const rawIcon = assignedProfile?.icon ?? pfp;

	// Format raw base64 or Data URI string safely
	const getFormattedImageUri = (img?: string) => {
		if (!img || img === "Not Set" || img.trim() === "") return null;
		if (img.startsWith("http") || img.startsWith("data:")) return img;
		return `data:image/jpeg;base64,${img}`;
	};

	const imageUri = getFormattedImageUri(rawIcon);

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`${seatCode}: ${displayName ?? "empty"}`}
			style={({ pressed }) => [
				assigncard.baseCard,
				{
					backgroundColor: themes.backgroundElement,
					borderColor: state == "safe"
						? themes.green
						: state == "warning"
							? themes.lightOrange
							: state == "emergency"
								? themes.warnBttn
								: themes.text,
					opacity: pressed ? 0.72 : 0.94,
					borderStyle: displayName ? "solid" : "dashed",
				},
			]}
		>
			{displayName ? (
				<View style={[assigncard.profileContainer]}>
					{imageUri ? (
						<Image
							key={imageUri} // Forces clean re-render when Base64 string updates
							source={{ uri: imageUri }}
							style={[
								assigncard.avatar,
								{
									borderColor: state == "safe"
										? themes.green
										: state == "warning"
											? themes.lightOrange
											: state == "emergency"
												? themes.warnBttn
												: themes.text,

									borderWidth: spacing.quarter,
									aspectRatio: 1,
								},
							]}
						/>
					) : (
						<View
							style={[
								assigncard.avatarFallback,
								{
									backgroundColor: themes.backgroundElement,
									borderColor: state == "safe"
										? themes.green
										: state == "warning"
											? themes.lightOrange
											: state == "emergency"
												? themes.warnBttn
												: themes.text,

									borderWidth: spacing.quarter,
									aspectRatio: 1,
								},
							]}
						>
							<Text style={[assigncard.monogram, { color: themes.text }]}>
								{displayName.charAt(0).toUpperCase()}
							</Text>
						</View>
					)}

					<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.half }}>
						{state === "safe" ? (
							<Host matchContents style={{ width: spacing.two, height: spacing.two, justifyContent: 'center', alignItems: 'center' }}>
								<Icon
									name={Icon.select({
										ios: "checkmark.circle.fill",
										android: checkXml,
									})}
									color={themes.green}
									size={spacing.two}
								/>
							</Host>
						) : state === "warning" ? (
							<Host matchContents style={{ width: spacing.two, height: spacing.two, justifyContent: 'center', alignItems: 'center' }}>
								<Icon
									name={Icon.select({
										ios: "exclamationmark.triangle.fill",
										android: warningXml,
									})}
									color={themes.lightOrange}
									size={spacing.two}
								/>
							</Host>
						) : state === "emergency" ? (
							<Host matchContents style={{ width: spacing.two, height: spacing.two, justifyContent: 'center', alignItems: 'center' }}>
								<Icon
									name={Icon.select({
										ios: "light.beacon.max.fill",
										android: sirenXml,
									})}
									color={themes.warnBttn}
									size={spacing.two}
								/>
							</Host>
						) : state === "unknown" ? (
							<Host matchContents style={{ width: spacing.two, height: spacing.two, justifyContent: 'center', alignItems: 'center' }}>
								<Icon
									name={Icon.select({
										ios: "questionmark",
										android: questionXml,
									})}
									color={themes.text}
									size={spacing.two}
								/>
							</Host>
						) : null}
						<Text
							numberOfLines={1}
							style={[assigncard.profileName, {
								color: state == "safe"
									? themes.green
									: state == "warning"
										? themes.lightOrange
										: state == "emergency"
											? themes.warnBttn
											: themes.text,
							}]}
						>
							{displayName}
						</Text>
					</View>
				</View>
			) : (
				<View style={assigncard.iconContainer}>
					{!locked &&
						<Host matchContents>
							<Icon
								name={Icon.select({
									ios: "plus",
									android: addXml,
								})}
								color={themes.text}
							/>
						</Host>
					}
					<Text style={[assigncard.seatCode, { color: themes.text }]}>
						{locked ? "EMPTY" : "ASSIGN"}
					</Text>
				</View>
			)}
		</Pressable>
	);
}

const assigncard = StyleSheet.create({
	baseCard: {
		flex: 1,
		borderRadius: spacing.edge,
		borderWidth: spacing.quarter,
		justifyContent: "center",
		alignItems: "center",
		overflow: "hidden",
		padding: spacing.one,
	},
	profileContainer: {
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.one,
		width: "100%",
	},
	avatar: {
		width: spacing.eight,
		height: spacing.eight,
		borderRadius: spacing.four,
		resizeMode: "cover",
	},
	avatarFallback: {
		width: spacing.eight,
		height: spacing.eight,
		borderRadius: spacing.four,
		justifyContent: "center",
		alignItems: "center",
	},
	monogram: {
		fontSize: fontsize.header,
		fontWeight: "600",
	},
	profileName: {
		fontSize: fontsize.body,
		fontWeight: "600",
		textAlign: "center",
		paddingHorizontal: spacing.half,
	},
	iconContainer: {
		justifyContent: "center",
		alignItems: "center",
		gap: spacing.one,
	},
	seatCode: {
		fontSize: fontsize.caption,
	},
});
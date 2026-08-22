import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "@/components/button";
import EmergencytModal from "@/components/emergency-modal";
import SeatCard from "@/components/seat-card";
import { Host, Icon } from "@expo/ui";
import InfoCard from "@/components/info-card";

type Profile = {
	id: string;
	name: string;
	photoURL?: string;
	icon?: string;
	isAccountOwner?: boolean;
};

export type SeatState = "empty" | "assigned" | "safe" | "warning" | "emergency";

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";
const IS_LOCKED_IN_KEY = "isLockedIn";
const SEAT_STATUSES_KEY = "seatStatuses";

const SEAT_ROLES: Record<number, string> = {
	1: "driver",
	2: "passenger",
	3: "l backseat",
	4: "c backseat",
	5: "r backseat",
};

export default function Home() {
	const router = useRouter();

	const [isLockedIn, setIsLockedIn] = useState<boolean>(false);
	const [assignments, setAssignments] = useState<Record<number, Profile>>({});
	const [seatStatuses, setSeatStatuses] = useState<Record<number, SeatState>>({});

	// Tracks which emergency seats the user has dismissed, so the modal
	// doesn't keep popping back up until a *new* emergency is triggered.
	const [dismissedSeats, setDismissedSeats] = useState<Set<number>>(new Set());

	// 📥 Fetch locked state and seat data whenever page comes into focus
	const loadData = useCallback(async () => {
		try {
			const [rawLockedIn, rawAssignments, rawStatuses] = await Promise.all([
				AsyncStorage.getItem(IS_LOCKED_IN_KEY),
				AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY),
				AsyncStorage.getItem(SEAT_STATUSES_KEY),
			]);

			const locked = rawLockedIn ? JSON.parse(rawLockedIn) : false;
			setIsLockedIn(locked);

			if (rawAssignments) {
				setAssignments(JSON.parse(rawAssignments));
			} else {
				setAssignments({});
			}

			if (rawStatuses) {
				setSeatStatuses(JSON.parse(rawStatuses));
			} else {
				setSeatStatuses({});
			}
		} catch (error) {
			console.error("Failed to load home state from device:", error);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadData();
		}, [loadData])
	);

	// Derive card status state
	const getSeatState = (seatNo: number): SeatState => {
		const profile = assignments[seatNo];
		if (!profile) return "empty";
		return seatStatuses[seatNo] ?? "safe";
	};

	// 🚨 Find the first assigned, locked-in seat currently in "emergency"
	// that the user hasn't already dismissed.
	const emergencySeatNo = isLockedIn
		? [1, 2, 3, 4, 5].find(
			(seatNo) =>
				seatStatuses[seatNo] === "emergency" &&
				assignments[seatNo] &&
				!dismissedSeats.has(seatNo)
		)
		: undefined;

	const emergencyProfile =
		emergencySeatNo !== undefined ? assignments[emergencySeatNo] : undefined;

	return (
		<View style={{
			backgroundColor: themes.background,
			height: "100%"
		}}
		>
			<SafeAreaView
				style={{
					flex: 1,
					backgroundColor: themes.background,
					position: "absolute",
					borderWidth: 0,
					borderColor: "red"
				}}
				edges={["left", "right"]}
			>
				<View style={[styles.container, { marginTop: spacing.six, gap: spacing.three }]}>
					{isLockedIn ? (
						<ScrollView
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{ paddingBottom: spacing.five }}
						>
							<Text style={[styles.pageHeader]}>
								Home
							</Text>
							<View style={{ gap: spacing.one, marginTop: spacing.one }}>
								<Text style={styles.sectionHeader}>Everyone's State</Text>
								{[1, 2, 3, 4, 5].map((seatNo) => {
									const profile = assignments[seatNo];
									const state = getSeatState(seatNo);

									return (
										<SeatCard
											key={seatNo}
											seatNo={seatNo}
											role={SEAT_ROLES[seatNo]}
											name={profile?.name}
											pfp={profile?.icon ?? profile?.photoURL}
											// @ts-ignore
											state={state}
											onPress={() => {
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											}}
										/>
									);
								})}
							</View>

							<View style={{ gap: spacing.one, marginTop: spacing.four }}>
								<Text style={styles.sectionHeader}>Extra Info</Text>
								<InfoCard
									smolTopText="TOTAL PASSENGER WEIGHT*"
									bigText="443 lbs"
									icon={
										<Host>
											<Icon name={Icon.select({
												ios: "scalemass.fill",
												android: import("@expo/material-symbols/weight.xml")
											})} size={spacing.five} />
										</Host>
									} />
								<Text style={styles.caption}>* Total passenger weight calculation is based on entered weight per profile.</Text>
							</View>
						</ScrollView>
					) : (
						<View style={styles.unlockedContainer}>
							<View style={{ marginVertical: spacing.two }}>
								<Host matchContents>
									<Icon name={Icon.select({
										ios: "lock.slash.fill",
										android: import("@expo/material-symbols/lock_open.xml")
									})} size={180} color={themes.secondaryBttn}
									/>
								</Host>
							</View>
							<Text
								style={[
									styles.unlockedTitle,
									{ color: themes.text },
								]}
							>
								Trip Not Locked In
							</Text>
							<Text
								style={[
									styles.unlockedSubtitle,
									{ color: themes.textSecondary },
								]}
							>
								Assign passengers to seats and tap "Lock In" on the Assign page to start monitoring.
							</Text>
							<View style={{ width: "100%", marginTop: spacing.three }}>
								<Button
									label="Go to Assign"
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
										router.push("/assign");
									}}
									fullWidth={true}
									glass={false}
								/>
							</View>
						</View>
					)}

					{/*
				{emergencySeatNo !== undefined && emergencyProfile && (
					<EmergencytModal
						seat={emergencySeatNo}
						visible={true}
						onClose={() =>
							setDismissedSeats((prev) => new Set(prev).add(emergencySeatNo))
						}
						id={emergencyProfile.id}
						name={emergencyProfile.name}
						icon={emergencyProfile.photoURL ?? emergencyProfile.icon}
						isAccountOwner={emergencyProfile.isAccountOwner}
					/>
				)}
				*/}
				</View>
			</SafeAreaView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: "100%",
		paddingLeft: spacing.two,
		paddingRight: spacing.two,
		borderWidth: spacing.none,
		borderColor: "#fff",
	},
	pageHeader: {
		fontSize: fontsize.pageHeader,
		fontFamily: "Logo-Font",
		color: themes.text,
		margin: spacing.none,
	},
	sectionHeader: {
		fontSize: fontsize.header,
		fontFamily: "Heading-Font",
		color: themes.text
	},
	unlockedContainer: {
		flex: 1,
		justifyContent: "flex-start",
		paddingTop: 140,
		alignItems: "center",
		paddingHorizontal: spacing.two,
		borderWidth: spacing.none,
		borderColor: "#fff"
	},
	unlockedTitle: {
		fontSize: fontsize.header,
		fontFamily: "Body-Bold",
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: spacing.one,
	},
	unlockedSubtitle: {
		fontSize: fontsize.body,
		textAlign: "center",
		lineHeight: spacing.three,
	},
	caption: {
		fontSize: fontsize.caption,
		color: themes.textSecondary,
		fontFamily: "Body-Regular"
	}
});
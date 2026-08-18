import { Themes } from "@/constants/theme";
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
import { LinenBackground, LeatherPanel, EngravedTitle } from "@/components/skeuo";
import { Ionicons } from "@expo/vector-icons";

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
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

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
		<LinenBackground>
			<SafeAreaView
				style={{
					flex: 1,
				}}
				edges={["left", "right"]}
			>
				{isLockedIn && (
					<LeatherPanel style={styles.headerPanel}>
						<EngravedTitle size={26}>Home</EngravedTitle>
					</LeatherPanel>
				)}
				<View style={[styles.container, { marginTop: isLockedIn ? 16 : 40 }]}>

					{isLockedIn ? (
						<ScrollView
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{ paddingBottom: 40 }}
						>
							<View style={{ gap: 10, marginTop: 10 }}>
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
											state={state}
											onPress={() => {
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											}}
										/>
									);
								})}
							</View>
						</ScrollView>
					) : (
						<View style={styles.unlockedContainer}>
							<View style={{ marginVertical: 20 }}>
								<Ionicons name="lock-open" size={180} color={currentTheme.secondaryBttn} />
							</View>
							<Text
								style={[
									styles.unlockedTitle,
									{ color: currentTheme.text },
								]}
							>
								Trip Not Locked In
							</Text>
							<Text
								style={[
									styles.unlockedSubtitle,
									{ color: currentTheme.textSecondary },
								]}
							>
								Assign passengers to seats and tap "Lock In" on the Assign page to start monitoring.
							</Text>
							<View style={{ width: "100%", marginTop: 24 }}>
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
				</View>
			</SafeAreaView>
		</LinenBackground>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: "100%",
		padding: 20,
		borderWidth: 0,
		borderColor: "#fff",
	},
	pageHeader: {
		fontSize: 40,
		fontFamily: "Logo-Font",
	},
	headerPanel: {
		width: "100%",
		paddingTop: 16,
		paddingBottom: 14,
		paddingHorizontal: 20,
	},
	unlockedContainer: {
		flex: 1,
		justifyContent: "flex-start",
		paddingTop: 140,
		alignItems: "center",
		paddingHorizontal: 20,
		borderWidth: 0,
		borderColor: "#fff"
	},
	unlockedTitle: {
		fontSize: 22,
		fontFamily: "Body-Bold",
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 8,
	},
	unlockedSubtitle: {
		fontSize: 15,
		textAlign: "center",
		lineHeight: 22,
	},
});
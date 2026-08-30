import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserPreferences } from "@/hooks/user-preferences-context";
import {
	Alert,
	ImageBackground,
	ScrollView,
	StyleSheet,
	Text,
	View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AssignCard from "@/components/assign-card";
import AssignSeatModal from "@/components/assign-seat-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import Button from "@/components/button";

type Profile = {
	id: string;
	name: string;
	photoURL?: string;
	icon?: string;
	pfp?: string; // Added pfp key support
	weight?: string | number;
	weightKg?: number;
	isAccountOwner?: boolean;
};

export type SeatState = "empty" | "assigned" | "safe" | "warning" | "emergency" | "unknown";

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";
const IS_LOCKED_IN_KEY = "isLockedIn";
const SEAT_STATUSES_KEY = "seatStatuses";

const SEATS = [
	{ seatNo: 1, seatCode: "driver" },
	{ seatNo: 2, seatCode: "front passenger" },
	{ seatNo: 3, seatCode: "left rear" },
	{ seatNo: 4, seatCode: "center rear" },
	{ seatNo: 5, seatCode: "right rear" },
];

export default function Assign() {
	const insets = useSafeAreaInsets();

	const bottomPad = 88 + insets.bottom;

	const { consent } = useUserPreferences();

	const [assignModalVisible, setAssignModalVisible] = useState(false);
	const [selectedSeat, setSelectedSeat] = useState(1);


	// Map seat numbers (1-5) to assigned Profiles
	const [assignments, setAssignments] = useState<Record<number, Profile>>({});

	// Lock-in state & status mapping (seatNo -> "safe" | "warning" | "emergency")
	const [isLockedIn, setIsLockedIn] = useState<boolean>(false);
	const [seatStatuses, setSeatStatuses] = useState<Record<number, SeatState>>({});

	// Check if at least one seat has an assigned profile
	const hasAssignedSeats = Object.values(assignments).some((profile) => Boolean(profile));

	// 📥 Load saved seat and trip state on focus.
	const loadState = useCallback(async () => {
		try {
			// Load assigned seats and status state
			const [rawAssignments, rawLockedIn, rawStatuses] = await Promise.all([
				AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY),
				AsyncStorage.getItem(IS_LOCKED_IN_KEY),
				AsyncStorage.getItem(SEAT_STATUSES_KEY),
			]);

			if (rawAssignments) {
				setAssignments(JSON.parse(rawAssignments));
			} else {
				setAssignments({});
			}

			if (rawLockedIn) {
				setIsLockedIn(JSON.parse(rawLockedIn));
			}

			if (rawStatuses) {
				setSeatStatuses(JSON.parse(rawStatuses));
			}
		} catch (error) {
			console.error("Failed to load seat & lock state:", error);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadState();
		}, [loadState])
	);

	// 🛠️ Derive the current state for any given seat number
	const getCardState = (seatNo: number): SeatState => {
		const hasProfile = Boolean(assignments[seatNo]);

		if (!hasProfile) return "empty";
		if (!isLockedIn) return "assigned";
		if (!consent && seatNo != 1) return "unknown";

		// When locked in, return its live status (defaulting to "safe")
		return seatStatuses[seatNo] ?? "unknown";
	};

	// 🔒 Buckle Handler
	const handleLockIn = async () => {
		if (!hasAssignedSeats) return;

		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

		// Until hardware reports a real state, a newly buckled seat stays UNKNOWN rather than falsely claiming SAFE.
		const initialStatuses: Record<number, SeatState> = {};
		Object.keys(assignments).forEach((seatStr) => {
			const seatNum = parseInt(seatStr, 10);
			initialStatuses[seatNum] = seatStatuses[seatNum] ?? "unknown";
		});

		try {
			await Promise.all([
				AsyncStorage.setItem(IS_LOCKED_IN_KEY, JSON.stringify(true)),
				AsyncStorage.setItem(SEAT_STATUSES_KEY, JSON.stringify(initialStatuses)),
			]);

			setIsLockedIn(true);
			setSeatStatuses(initialStatuses);
		} catch (error) {
			console.error("Failed to buckle assignments:", error);
			Alert.alert("Error", "Could not save buckled state.");
		}
	};

	// 🔓 Unbuckle Handler
	const handleUnlock = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		Alert.alert("Unbuckle?", "Are you sure you want to unbuckle?", [
			{
				text: "Cancel",
				style: "cancel"
			},
			{
				text: "Unbuckle",
				style: "default",
				onPress: async () => {
					try {
						await AsyncStorage.setItem(IS_LOCKED_IN_KEY, JSON.stringify(false));
						setIsLockedIn(false);
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
					} catch (error) {
						console.error("Failed to unbuckle:", error);
					}
				}
			}
		]);
	};

	// Callback when modal updates or unassigns a seat
	const handleSeatAssigned = (seatNumber: number, profile: Profile | null) => {
		setAssignments((prev) => {
			const updated = { ...prev };
			if (profile) {
				updated[seatNumber] = profile;
			} else {
				delete updated[seatNumber];
			}
			return updated;
		});
	};

	// Seat assignment can only be changed while the trip is unbuckled.
	// The previous redesign cycled Safe → Warning → Emergency on ordinary
	// taps while locked, which was useful as a demo shortcut but unsafe for a
	// final UI because it could manufacture a false emergency state.
	const handleCardPress = (seatNo: number) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		if (isLockedIn) {
			Alert.alert("Trip is buckled", "Unbuckle before changing seat assignments.");
			return;
		}

		setSelectedSeat(seatNo);
		setAssignModalVisible(true);
	};

	// Helper to transform display parameters and guarantee Base64 pfp propagation
	const getDisplayProfile = (profile?: Profile): Profile | undefined => {
		if (!profile) return undefined;

		// Extracts base64 profile string from whichever key it was stored under
		const base64Pfp = profile.icon || profile.pfp || profile.photoURL;

		return {
			...profile,
			name: profile.isAccountOwner ? "Me" : profile.name,
			icon: base64Pfp, // Assigns back to icon for assignedProfile prop
		};
	};

	return (
		<SafeAreaView
			style={{
				flex: 1,
				backgroundColor: themes.background,
			}}
			edges={["left", "right", "bottom"]}
		>
			<ScrollView contentContainerStyle={[{ flexGrow: 1 }, { marginTop: spacing.one, paddingBottom: bottomPad }]} showsVerticalScrollIndicator={true} bounces={true}>
				<View style={[styles.container]}>
					<Text style={[styles.pageHeader, { color: themes.text }]}>
						Assign
					</Text>

					<ImageBackground
						source={require("../../../../assets/images/appImgs/car-cropped.png")}
						style={{ height: 416, marginTop: spacing.two }}
					>
						<View
							style={{
								gap: spacing.one,
								width: "100%",
								borderWidth: spacing.none,
								borderColor: themes.secondaryBttn,
								borderRadius: spacing.one,
							}}
						>
							{/* Front Row */}
							<View style={{ gap: spacing.three, flexDirection: "row", height: 128, marginTop: spacing.ten, paddingHorizontal: spacing.eight }}>
								<AssignCard
									seatNo={1}
									assignedProfile={getDisplayProfile(assignments[1])}
									pfp={assignments[1]?.icon || assignments[1]?.pfp || assignments[1]?.photoURL || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNyV3QnQOwXP124try4wkWE0xXqxT6KZitbq4TerzfLkMDDY-v1CXzTGw&s=10"}
									onPress={() => handleCardPress(1)}
									state={getCardState(1)}
									seatCode="driver"
									locked={isLockedIn}
								/>
								<AssignCard
									seatNo={2}
									assignedProfile={getDisplayProfile(assignments[2])}
									pfp={assignments[2]?.icon || assignments[2]?.pfp || assignments[2]?.photoURL || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNyV3QnQOwXP124try4wkWE0xXqxT6KZitbq4TerzfLkMDDY-v1CXzTGw&s=10"}
									onPress={() => handleCardPress(2)}
									state={getCardState(2)}
									seatCode="front passenger"
									locked={isLockedIn}
								/>
							</View>

							{/* Back Row */}
							<View style={{ gap: spacing.one, flexDirection: "row", height: 128, paddingHorizontal: spacing.four, marginTop: spacing.two }}>
								<AssignCard
									seatNo={3}
									assignedProfile={getDisplayProfile(assignments[3])}
									pfp={assignments[3]?.icon || assignments[3]?.pfp || assignments[3]?.photoURL || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNyV3QnQOwXP124try4wkWE0xXqxT6KZitbq4TerzfLkMDDY-v1CXzTGw&s=10"}
									onPress={() => handleCardPress(3)}
									state={getCardState(3)}
									seatCode="left rear"
									locked={isLockedIn}
								/>
								<AssignCard
									seatNo={4}
									assignedProfile={getDisplayProfile(assignments[4])}
									pfp={assignments[4]?.icon || assignments[4]?.pfp || assignments[4]?.photoURL || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNyV3QnQOwXP124try4wkWE0xXqxT6KZitbq4TerzfLkMDDY-v1CXzTGw&s=10"}
									onPress={() => handleCardPress(4)}
									state={getCardState(4)}
									seatCode="center rear"
									locked={isLockedIn}
								/>
								<AssignCard
									seatNo={5}
									assignedProfile={getDisplayProfile(assignments[5])}
									pfp={assignments[5]?.icon || assignments[5]?.pfp || assignments[5]?.photoURL || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNyV3QnQOwXP124try4wkWE0xXqxT6KZitbq4TerzfLkMDDY-v1CXzTGw&s=10"}
									onPress={() => handleCardPress(5)}
									state={getCardState(5)}
									seatCode="right rear"
									locked={isLockedIn}
								/>
							</View>
						</View>
					</ImageBackground>

					{/* Buckle / Unbuckle Action Controls */}
					<View style={{ paddingVertical: spacing.none, marginTop: -spacing.one }}>
						{isLockedIn ? (
							<Button
								label="Unbuckle"
								onPress={handleUnlock}
								fullWidth={true}
								variant="secondary"
							/>
						) : (
							<Button
								label="Buckle"
								onPress={handleLockIn}
								fullWidth={true}
								variant="primary"
								enabled={hasAssignedSeats}
							/>
						)}
					</View>


					<AssignSeatModal
						seat={selectedSeat}
						visible={assignModalVisible}
						onClose={() => {
							setAssignModalVisible(false);
						}}
						onSuccess={(seatNum, profile) => {
							handleSeatAssigned(seatNum, profile);
						}}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
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
		gap: spacing.three,
	},
	pageHeader: {
		fontSize: fontsize.pageHeader,
		fontFamily: "Logo-Font",
		color: themes.text,
		margin: spacing.none,
	},
});
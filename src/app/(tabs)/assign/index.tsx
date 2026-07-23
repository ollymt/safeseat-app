import { Themes } from "@/constants/theme";
import { useFocusEffect, useRouter } from "expo-router";
import {
	Alert,
	StyleSheet,
	Text,
	useColorScheme,
	View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AssignCard from "@/components/assign-card";
import AssignSeatModal from "@/components/assign-seat-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import Button from "@/components/button";
import EmergencytModal from "@/components/emergency-modal";

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

const SEATS = [
	{ seatNo: 1, seatCode: "driver" },
	{ seatNo: 2, seatCode: "passenger" },
	{ seatNo: 3, seatCode: "l backseat" },
	{ seatNo: 4, seatCode: "c backseat" },
	{ seatNo: 5, seatCode: "r backseat" },
];

export default function Assign() {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	const router = useRouter();

	const [assignModalVisible, setAssignModalVisible] = useState(false);
	const [selectedSeat, setSelectedSeat] = useState(1);

	// Map seat numbers (1-5) to assigned Profiles
	const [assignments, setAssignments] = useState<Record<number, Profile>>({});

	// Lock-in state & status mapping (seatNo -> "safe" | "warning" | "emergency")
	const [isLockedIn, setIsLockedIn] = useState<boolean>(false);
	const [seatStatuses, setSeatStatuses] = useState<Record<number, SeatState>>({});

	// Check if at least one seat has an assigned profile
	const hasAssignedSeats = Object.values(assignments).some((profile) => Boolean(profile));

	// 📥 Load saved state on focus
	const loadState = useCallback(async () => {
		try {
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

		// When locked in, return its live status (defaulting to "safe")
		return seatStatuses[seatNo] ?? "safe";
	};

	// 🔒 Lock In Handler
	const handleLockIn = async () => {
		if (!hasAssignedSeats) return;

		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

		// Default all currently assigned seats to "safe" status upon lock-in
		const initialStatuses: Record<number, SeatState> = {};
		Object.keys(assignments).forEach((seatStr) => {
			const seatNum = parseInt(seatStr, 10);
			initialStatuses[seatNum] = seatStatuses[seatNum] ?? "safe";
		});

		try {
			await Promise.all([
				AsyncStorage.setItem(IS_LOCKED_IN_KEY, JSON.stringify(true)),
				AsyncStorage.setItem(SEAT_STATUSES_KEY, JSON.stringify(initialStatuses)),
			]);

			setIsLockedIn(true);
			setSeatStatuses(initialStatuses);
		} catch (error) {
			console.error("Failed to lock in assignments:", error);
			Alert.alert("Error", "Could not save locked-in state.");
		}
	};

	// 🔓 Unlock Handler
	const handleUnlock = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		Alert.alert("Seats are locked in.", "Are you sure you want to unlock?", [
			{
				text: "No",
				style: "cancel"
			},
			{
				text: "Yes",
				style: "destructive",
				onPress: async () => {
					try {
						await AsyncStorage.setItem(IS_LOCKED_IN_KEY, JSON.stringify(false));
						setIsLockedIn(false);
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
					} catch (error) {
						console.error("Failed to unlock assignments:", error);
					}
				}
			}
		])
		
	};

	// ⚡ Mutator: Update status for a specific locked seat ("safe" | "warning" | "emergency")
	const updateSeatStatus = async (seatNo: number, status: "safe" | "warning" | "emergency") => {
		const updatedStatuses = { ...seatStatuses, [seatNo]: status };
		setSeatStatuses(updatedStatuses);

		// Clear dismissal so a new emergency on this seat shows the modal again
		if (status === "emergency") {
			setDismissedSeats((prev) => {
				const next = new Set(prev);
				next.delete(seatNo);
				return next;
			});
		}

		try {
			await AsyncStorage.setItem(SEAT_STATUSES_KEY, JSON.stringify(updatedStatuses));
		} catch (error) {
			console.error(`Failed to update status for seat ${seatNo}:`, error);
		}
	};

	// ⚡ Mutator: Update status for ALL assigned seats at once
	const setAllSeatsStatus = async (status: "safe" | "warning" | "emergency") => {
		const updatedStatuses: Record<number, SeatState> = {};
		Object.keys(assignments).forEach((seatStr) => {
			updatedStatuses[parseInt(seatStr, 10)] = status;
		});

		setSeatStatuses(updatedStatuses);
		try {
			await AsyncStorage.setItem(SEAT_STATUSES_KEY, JSON.stringify(updatedStatuses));
		} catch (error) {
			console.error("Failed to update status for all seats:", error);
		}
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

	// Card tap interaction
	const handleCardPress = (seatNo: number) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		if (isLockedIn) {
			// Options or quick-status toggle when locked in
			const currentStatus = getCardState(seatNo);
			if (currentStatus === "empty") return;

			// Example cycle when tapped while locked in: safe -> warning -> emergency -> safe
			const nextStatus: Record<string, "safe" | "warning" | "emergency"> = {
				safe: "warning",
				warning: "emergency",
				emergency: "safe",
			};
			updateSeatStatus(seatNo, nextStatus[currentStatus] ?? "safe");
		} else {
			// Open assignment modal when unlocked
			setSelectedSeat(seatNo);
			setAssignModalVisible(true);
		}
	};

	const [dismissedSeats, setDismissedSeats] = useState<Set<number>>(new Set());

	const emergencySeat = isLockedIn
		? SEATS.find(
			({ seatNo }) =>
				seatStatuses[seatNo] === "emergency" &&
				assignments[seatNo] &&
				!dismissedSeats.has(seatNo)
		)
		: undefined;

	const emergencyProfile = emergencySeat ? assignments[emergencySeat.seatNo] : undefined;

	return (
		<SafeAreaView
			style={{
				flex: 1,
				backgroundColor: currentTheme.background,
			}}
			edges={['left', 'right']}
		>
			<View style={[styles.container, { marginTop: 40 }]}>
				<Text style={[styles.pageHeader, { color: currentTheme.text }]}>
					Assign
				</Text>

				<View
					style={{
						gap: 10,
						marginTop: 10,
						width: "100%",
						borderWidth: 0,
						borderColor: currentTheme.secondaryBttn,
						borderRadius: 10,
					}}
				>
					{/* Front Row */}
					<View style={{ gap: 10, flexDirection: "row", height: 230 }}>
						<AssignCard
							seatNo={1}
							assignedProfile={assignments[1]}
							onPress={() => handleCardPress(1)}
							state={getCardState(1)}
							seatCode="driver"
						/>
						<AssignCard
							seatNo={2}
							assignedProfile={assignments[2]}
							onPress={() => handleCardPress(2)}
							state={getCardState(2)}
							seatCode="passenger"
						/>
					</View>

					{/* Back Row */}
					<View style={{ gap: 10, flexDirection: "row", height: 230 }}>
						<AssignCard
							seatNo={3}
							assignedProfile={assignments[3]}
							onPress={() => handleCardPress(3)}
							state={getCardState(3)}
							seatCode="l backseat"
						/>
						<AssignCard
							seatNo={4}
							assignedProfile={assignments[4]}
							onPress={() => handleCardPress(4)}
							state={getCardState(4)}
							seatCode="c backseat"
						/>
						<AssignCard
							seatNo={5}
							assignedProfile={assignments[5]}
							onPress={() => handleCardPress(5)}
							state={getCardState(5)}
							seatCode="r backseat"
						/>
					</View>
				</View>

				{/* Lock In / Unlock Action Controls */}
				<View style={{ paddingVertical: 20 }}>
					{isLockedIn ? (
						<Button
							label="Unlock"
							onPress={handleUnlock}
							fullWidth={true}
							variant="warn"
							glass={false}
						/>
					) : (
						<Button
							label="Lock In"
							onPress={handleLockIn}
							fullWidth={true}
							variant="primary"
							enabled={hasAssignedSeats}
							glass={false}
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

				{emergencySeat && emergencyProfile && (
					<EmergencytModal
						seat={emergencySeat.seatNo}
						visible={true}
						onClose={() =>
							setDismissedSeats((prev) => new Set(prev).add(emergencySeat.seatNo))
						}
						id={emergencyProfile.id}
						name={emergencyProfile.name}
						icon={emergencyProfile.photoURL ?? emergencyProfile.icon}
						isAccountOwner={emergencyProfile.isAccountOwner}
					/>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: "100%",
		padding: 20,
		borderWidth: 0,
		borderColor: "#fff"
	},
	pageHeader: {
		fontSize: 40,
		fontFamily: "Logo-Font",
	}
});
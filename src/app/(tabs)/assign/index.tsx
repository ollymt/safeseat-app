import { Themes } from "@/constants/theme";
import { useGLTF } from '@react-three/drei/native';
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

import { Model as CarModel } from "@/components/CarModel";
import { Canvas } from "@react-three/fiber";

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

const SEAT_COORDINATES = {
	driver: [0.4, 0.5, -0.2],
	passenger: [-0.4, 0.5, -0.2],
	rearLeft: [0.5, 0.4, -1.2],
	rearMiddle: [0.0, 0.4, -1.2],
	rearRight: [-0.5, 0.4, -1.2],
};



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

				<Canvas>
					<ambientLight />
					<CarModel />
				</Canvas>
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
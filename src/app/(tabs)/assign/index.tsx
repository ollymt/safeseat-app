import { Themes } from "@/constants/theme";
import { useFocusEffect, useRouter } from "expo-router";
import {
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

type Profile = {
	id: string;
	name: string;
	photoURL?: string;
	isAccountOwner?: boolean;
};

const SEAT_ASSIGNMENTS_KEY = "seatAssignments";

export default function Assign() {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	const router = useRouter();

	const [assignModalVisible, setAssignModalVisible] = useState(false);
	const [selectedSeat, setSelectedSeat] = useState(5);

	// Map seat numbers (1-5) to their assigned Profile
	const [assignments, setAssignments] = useState<Record<number, Profile>>({});

	// Check if at least one seat has a valid assigned profile
	const hasAssignedSeats = Object.values(assignments).some((profile) => Boolean(profile));

	// Load saved assignments whenever screen comes into focus
	const loadAssignments = useCallback(async () => {
		try {
			const raw = await AsyncStorage.getItem(SEAT_ASSIGNMENTS_KEY);
			if (raw) {
				setAssignments(JSON.parse(raw));
			} else {
				setAssignments({});
			}
		} catch (error) {
			console.error("Failed to load seat assignments:", error);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadAssignments();
		}, [loadAssignments])
	);

	// Callback when modal saves or clears an assignment
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
					<View style={{ gap: 10, flexDirection: "row", height: 230 }}>
						<AssignCard
							seatNo={1}
							assignedProfile={assignments[1]}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								setSelectedSeat(1);
								setAssignModalVisible(true);
							}}
							seatCode="driver"
						/>
						<AssignCard
							seatNo={2}
							assignedProfile={assignments[2]}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								setSelectedSeat(2);
								setAssignModalVisible(true);
							}}
							seatCode="passenger"
						/>
					</View>
					<View style={{ gap: 10, flexDirection: "row", height: 230 }}>
						<AssignCard
							seatNo={3}
							assignedProfile={assignments[3]}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								setSelectedSeat(3);
								setAssignModalVisible(true);
							}}
							seatCode="l backseat"
						/>
						<AssignCard
							seatNo={4}
							assignedProfile={assignments[4]}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								setSelectedSeat(4);
								setAssignModalVisible(true);
							}}
							seatCode="c backseat"
						/>
						<AssignCard
							seatNo={5}
							assignedProfile={assignments[5]}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								setSelectedSeat(5);
								setAssignModalVisible(true);
							}}
							seatCode="r backseat"
						/>
					</View>
				</View>

				<View style={{ paddingVertical: 20 }}>
					<Button
						label="Lock In"
						onPress={() => { }}
						fullWidth={true}
						enabled={hasAssignedSeats}
					/>
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
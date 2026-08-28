import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserPreferences } from "@/hooks/user-preferences-context";
import {
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "@/components/button";
import EmergencytModal from "@/components/emergency-modal";
import SeatCard from "@/components/seat-card";
import { Host, Icon } from "@expo/ui";
import InfoCard from "@/components/info-card";

// 👇 Static icon imports — import(...) called inline in JSX returns a
// Promise, not the icon data, and breaks the Android icons below.
import weightXml from "@expo/material-symbols/weight.xml";
import lockOpenXml from "@expo/material-symbols/lock_open.xml";

type Profile = {
	id: string;
	name: string;
	photoURL?: string;
	icon?: string;
	weight?: string | number;
	weightKg?: number;
	isAccountOwner?: boolean;
};

// 👇 Added "unknown" — used for non-driver seats when data sharing
// consent is turned off, so their real state is hidden.
export type SeatState = "empty" | "assigned" | "safe" | "warning" | "emergency" | "unknown";

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

// The driver's seat is always visible regardless of consent — consent only
// hides the states of everyone *else* in the car.
const DRIVER_SEAT_NO = 1;

export default function Home() {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const bottomPad = 104 + (insets.bottom / 2); // extra breathing room

	const { consent, loading } = useUserPreferences();

	const [isLockedIn, setIsLockedIn] = useState<boolean>(false);
	const [assignments, setAssignments] = useState<Record<number, Profile>>({});
	const [seatStatuses, setSeatStatuses] = useState<Record<number, SeatState>>({});
	const [useMetric, setUseMetric] = useState<boolean>(false);

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

			const savedPrivacyString = await SecureStore.getItemAsync("user_local_app_prefs");
			if (savedPrivacyString) {
				const savedPrivacy = JSON.parse(savedPrivacyString);
				if (savedPrivacy.useMetric !== undefined) {
					setUseMetric(savedPrivacy.useMetric);
				}
			}

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

		// 👇 If data sharing consent is off, hide the real state for every
		// seat except the driver's — the driver can always see their own
		// state regardless of this setting.
		if (!consent && seatNo !== DRIVER_SEAT_NO) {
			return "unknown";
		}

		return seatStatuses[seatNo] ?? "safe";
	};

	const getProfileWeightKg = (profile?: Profile): number => {
		if (!profile) return 0;
		if (profile.weightKg !== undefined && typeof profile.weightKg === "number") {
			return profile.weightKg;
		}
		if (profile.weight && profile.weight !== "Not Set") {
			const parsed = parseFloat(String(profile.weight).replace(/[^0-9.]/g, ""));
			return isNaN(parsed) ? 0 : parsed;
		}
		return 0;
	};

	const totalWeightInfo = (() => {
		const totalKg = [1, 2, 3, 4, 5].reduce(
			(sum, seatNo) => sum + getProfileWeightKg(assignments[seatNo]),
			0
		);

		if (useMetric) {
			return `${totalKg.toFixed(1)} kg`;
		} else {
			return `${(totalKg * 2.20462).toFixed(1)} lbs`;
		}
	})();

	// 🚨 Find the first assigned, locked-in seat currently in "emergency"
	// that the user hasn't already dismissed.
	// 👇 getSeatState already returns "unknown" for non-driver seats when
	// consent is off, so this naturally won't trigger the emergency modal
	// for a seat whose real state is hidden.
	const emergencySeatNo = isLockedIn
		? [1, 2, 3, 4, 5].find(
			(seatNo) =>
				getSeatState(seatNo) === "emergency" &&
				assignments[seatNo] &&
				!dismissedSeats.has(seatNo)
		)
		: undefined;

	const emergencyProfile =
		emergencySeatNo !== undefined ? assignments[emergencySeatNo] : undefined;

	// Helper to transform the profile name to "Me" if they are the account owner
	const getDisplayName = (profile?: Profile): string | undefined => {
		if (!profile) return undefined;
		return profile.isAccountOwner ? "Me" : profile.name;
	};

	return (
		<View style={{
			backgroundColor: themes.background,
			height: "100%"
		}}
		>
			<SafeAreaView
				style={{
					flex: 1,
					backgroundColor: themes.background
				}}
				edges={["left", "right", "bottom"]}
			>
				<ScrollView contentContainerStyle={[{ flexGrow: 1 }, { marginTop: spacing.one, paddingBottom: bottomPad }]} showsVerticalScrollIndicator={true} bounces={true}>
					<View style={[styles.container]}>

						{isLockedIn ? (
							<View>
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
												name={getDisplayName(profile)}
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
										bigText={totalWeightInfo}
										icon={
											<Host>
												<Icon name={Icon.select({
													ios: "scalemass.fill",
													android: weightXml
												})} size={spacing.five} />
											</Host>
										} />
									<Text style={styles.caption}>* Total passenger weight calculation is based on entered weight per profile.</Text>
								</View>
							</View>
						) : (
							<View style={styles.unlockedContainer}>
								<View style={{ marginVertical: spacing.two }}>
									<Host matchContents>
										<Icon name={Icon.select({
											ios: "figure.seated.seatbelt",
											android: lockOpenXml
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
									Trip Not Buckled
								</Text>
								<Text
									style={[
										styles.unlockedSubtitle,
										{ color: themes.textSecondary },
									]}
								>
									Assign passengers to seats and tap "Buckle" on the Assign page to start monitoring.
								</Text>
								<View style={{ width: "100%", marginTop: spacing.three }}>
									<Button
										label="Go to Assign"
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
											router.push("/assign");
										}}
										fullWidth={true}
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
				</ScrollView>
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
		gap: spacing.three,
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
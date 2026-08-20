import { Materials, Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
	Dimensions,
	FlatList,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	SectionList,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

// Import doc, getDoc, collection, and getDocs
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, db } from "../../../firebase";

import AddContactModal from "@/components/add-contact-modal";
import AddProfileModal from "@/components/add-profile-modal";
import ContactCard from "@/components/contact-card";
import ProfileCard from "@/components/profile-card";
import { GlossSurface, LeatherPanel, LinenBackground, EngravedTitle } from "@/components/skeuo";
import SkeuoInput from "@/components/skeuo-input";

const { width: screenWidth } = Dimensions.get("window");

interface UserProfile {
	id: string;
	name: string;
	img?: string;
	createdBy: string;
}

// 🌟 New Interface for Emergency Contacts
interface EmergencyContact {
	id: string;
	name: string;
	phone: string;
	hierarchy: number; // 1-5
}

interface ProfileSection {
	title: string;
	data: UserProfile[];
}

export default function Everyone() {
	const colorScheme = useColorScheme();
	const activeScheme = colorScheme === "dark" ? "dark" : "light";
	const currentTheme = Themes[activeScheme];

	const router = useRouter();

	const [userName, setUserName] = useState<string>("Guest");
	const [userEmail, setUserEmail] = useState<string>("Not Set");
	const [userPhone, setUserPhone] = useState<string>("Not Set");
	const [userImg, setUserImg] = useState<string>("");

	const [useMetric, setUseMetric] = useState<boolean>(true);
	const [refreshing, setRefreshing] = useState(false);

	const [sections, setSections] = useState<ProfileSection[]>([]);

	// 🌟 1. State for Emergency Contacts
	const [emergencyContacts, setEmergencyContacts] = useState<
		EmergencyContact[]
	>([]);

	const [addProfileVisible, setAddProfileVisible] = useState(false);
	const [addContactVisible, setAddContactVisible] = useState(false);

	const searchInputRef = useRef<any>(null);

	const loadAllUserData = useCallback(async () => {
		setRefreshing(true);
		try {
			// --- A. LOAD CACHED HEALTH DATA ---
			const cachedHealth = await SecureStore.getItemAsync(
				"user_health_profile",
			);
			if (cachedHealth) {
				const localData = JSON.parse(cachedHealth);
				if (localData.name) setUserName(localData.name);
				if (localData.email) setUserEmail(localData.email);
				if (localData.phone) setUserPhone(localData.phone);
				if (localData.img) setUserImg(localData.img);
			}

			const cachedPrivacy =
				await SecureStore.getItemAsync("user_privacy_prefs");
			if (cachedPrivacy) {
				const privacyData = JSON.parse(cachedPrivacy);
				if (privacyData.useMetric !== undefined)
					setUseMetric(privacyData.useMetric);
			}

			const currentUser = auth.currentUser;
			if (currentUser) {
				// --- B. FETCH USER DATA FROM CLOUD ---
				const userDocRef = doc(db, "users", currentUser.uid);
				const userDocSnap = await getDoc(userDocRef);

				let freshUserName = userName;
				let freshUserImg = userImg;

				if (userDocSnap.exists()) {
					const cloudData = userDocSnap.data();

					if (cloudData.name) {
						setUserName(cloudData.name);
						freshUserName = cloudData.name;
					}
					if (cloudData.email) setUserEmail(cloudData.email);
					if (cloudData.phone) setUserPhone(cloudData.phone);
					if (cloudData.img) {
						setUserImg(cloudData.img);
						freshUserImg = cloudData.img;
					}
					if (cloudData.useMetric !== undefined)
						setUseMetric(cloudData.useMetric);

					const combinedProfile = {
						name: cloudData.name || "",
						email: cloudData.email || "",
						phone: cloudData.phone || "",
						img: cloudData.icon || "",
						birthday: cloudData.birthday || "",
						height: cloudData.height || "",
						weight: cloudData.weight || "",
						bloodType: cloudData.bloodType || "",
						allergies: cloudData.allergies || "",
					};

					await SecureStore.setItemAsync(
						"user_health_profile",
						JSON.stringify(combinedProfile),
					);

					// Preserve the existing local useMetric value — it's device-only and never stored in Firestore
					const existingPrivacyRaw = await SecureStore.getItemAsync("user_privacy_prefs");
					const existingPrivacy = existingPrivacyRaw ? JSON.parse(existingPrivacyRaw) : {};

					const combinedPrivacy = {
						...existingPrivacy,
						consent: cloudData.consent ?? true,
						emergencyEscalation: cloudData.emergencyEscalation ?? true,
					};
					await SecureStore.setItemAsync(
						"user_privacy_prefs",
						JSON.stringify(combinedPrivacy),
					);
				}

				// --- C. FETCH USER'S NESTED PROFILES SUBCOLLECTION ---
				const subcollectionRef = collection(
					db,
					"users",
					currentUser.uid,
					"profiles",
				);
				const querySnapshot = await getDocs(subcollectionRef);

				const loadedProfiles: UserProfile[] = querySnapshot.docs.map((doc) => ({
					id: doc.id,
					name: doc.data().name || "Unnamed Profile",
					img: doc.data().icon || doc.data().img,
					createdBy: currentUser.uid,
				}));

				loadedProfiles.sort((a, b) => a.name.localeCompare(b.name));

				const groups: { [key: string]: UserProfile[] } = {};
				loadedProfiles.forEach((profile) => {
					const firstLetter = profile.name.charAt(0).toUpperCase();
					const key = /^[A-Z]$/.test(firstLetter) ? firstLetter : "#";
					if (!groups[key]) {
						groups[key] = [];
					}
					groups[key].push(profile);
				});

				const sortedGroupSections: ProfileSection[] = Object.keys(groups)
					.sort((a, b) => {
						if (a === "#") return 1;
						if (b === "#") return -1;
						return a.localeCompare(b);
					})
					.map((key) => ({
						title: key,
						data: groups[key],
					}));

				const ownerSection: ProfileSection = {
					title: "Me",
					data: [
						{
							id: "owner-profile",
							name: `${freshUserName} (Me)`,
							img: freshUserImg || "",
							createdBy: currentUser.uid,
						},
					],
				};

				setSections([ownerSection, ...sortedGroupSections]);

				// 🌟 2. FETCH EMERGENCY CONTACTS SUBCOLLECTION
				// Adjust subcollection name "emergencyContacts" to match whatever you named it in Firestore
				const contactsRef = collection(
					db,
					"users",
					currentUser.uid,
					"emergencyContacts",
				);
				const contactsSnap = await getDocs(contactsRef);

				const loadedContacts: EmergencyContact[] = contactsSnap.docs.map(
					(doc) => {
						const data = doc.data();
						return {
							id: doc.id,
							name: data.name || "Unknown Name",
							phone: data.phone || "No Phone Number",
							hierarchy: data.hierarchy != null && !isNaN(Number(data.hierarchy)) && Number(data.hierarchy) > 0
								? Number(data.hierarchy)
								: 0, // 0 means "unset" — do NOT default to 5
						};
					},
				);

				// 🌟 Sort by hierarchy (1-5 ascending), unset (0) always last
				loadedContacts.sort((a, b) => {
					if (a.hierarchy === 0 && b.hierarchy === 0) return 0;
					if (a.hierarchy === 0) return 1;  // a is unset, push it after b
					if (b.hierarchy === 0) return -1; // b is unset, push it after a
					return a.hierarchy - b.hierarchy; // normal ascending sort
				});
				setEmergencyContacts(loadedContacts);
			}
		} catch (error) {
			console.error("Error syncing cache with Firestore collections:", error);
		} finally {
			setRefreshing(false);
		}
	}, [userName, userImg]);

	useFocusEffect(
		useCallback(() => {
			loadAllUserData();
		}, [loadAllUserData]),
	);

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [searchQuery, setSearchQuery] = useState("");

	const filteredSections = useMemo(() => {
		if (!searchQuery.trim()) {
			return sections;
		}

		const query = searchQuery.toLowerCase();

		return sections
			.map((section) => {
				const filteredData = section.data.filter((profile) =>
					profile.name.toLowerCase().includes(query),
				);
				return {
					...section,
					data: filteredData,
				};
			})
			.filter((section) => section.data.length > 0);
	}, [sections, searchQuery]);

	const isiOS = Platform.OS == "ios"

	const [isKeyboardVisible, setKeyboardVisible] = useState(false);

	useEffect(() => {
		const keyboardDidShowListener = Keyboard.addListener(
			'keyboardDidShow',
			() => setKeyboardVisible(true)
		);
		const keyboardDidHideListener = Keyboard.addListener(
			'keyboardDidHide',
			() => setKeyboardVisible(false)
		);

		return () => {
			keyboardDidShowListener.remove();
			keyboardDidHideListener.remove();
		};
	}, []);

	return (
		<LinenBackground>
			<SafeAreaView
				style={{ flex: 1 }}
				edges={["left", "right"]}
			>
				<LeatherPanel style={styles.headerPanel}>
					<EngravedTitle size={26}>Everyone</EngravedTitle>
				</LeatherPanel>
				<View style={[styles.container, { marginTop: 16 }]}>
					<View style={{ paddingBottom: 10, flexDirection: "row" }}>
						{(["Profiles", "Contacts"] as const).map((label, i) => {
							const active = selectedIndex === i;
							return (
								<Pressable
									key={label}
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
										setSelectedIndex(i);
									}}
									style={{ flex: 1 }}
								>
									{active ? (
										<GlossSurface tone={["#8FCB57", "#4F8B29", "#2C5416"]} style={styles.segmentBtn}>
											<Text style={styles.segmentTextActive}>{label}</Text>
										</GlossSurface>
									) : (
										<View style={[styles.segmentBtn, { backgroundColor: currentTheme.backgroundElement, borderRadius: 100 }]}>
											<Text style={[styles.segmentText, { color: currentTheme.textSecondary }]}>{label}</Text>
										</View>
									)}
								</Pressable>
							);
						})}
					</View>

					{selectedIndex === 0 ? (
						<View style={{ flex: 1, borderWidth: 0, borderColor: currentTheme.text }}>
							<SectionList
								sections={filteredSections}
								keyExtractor={(item) => item.id}
								onRefresh={loadAllUserData}
								refreshing={refreshing}
								contentContainerStyle={Platform.OS == "android" ? { marginTop: 0, paddingBottom: 70 } : { marginTop: 0, paddingBottom: 160 }}
								stickySectionHeadersEnabled={false}
								showsVerticalScrollIndicator={false}
								showsHorizontalScrollIndicator={false}
								renderItem={({ item, index, section }) => (
									<View style={{ marginBottom: 8 }}>
										<ProfileCard
											name={item.name}
											img={
												item.img ||
												"https://pbs.twimg.com/media/C8SFjSYWAAA6452.jpg"
											}
											isLast={index === section.data.length - 1}
											onPress={() => {
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
												if (item.id === "owner-profile") {
													// @ts-ignore
													router.push("/(tabs)/everyone/profile");
												} else {
													router.push({
														// @ts-ignore
														pathname: "/(tabs)/everyone/profile",
														params: { profileId: item.id }, // 🌟 Changed key from "id" to "profileId"
													});
												}
											}}
										/>
									</View>
								)}
								renderSectionHeader={({ section: { title } }) => (
									<View
										style={[
											styles.sectionHeaderContainer,
											{ backgroundColor: currentTheme.background },
										]}
									>
										<Text
											style={[
												styles.sectionHeaderTitle,
												{ color: currentTheme.text },
											]}
										>
											{title}
										</Text>
									</View>
								)}
								renderSectionFooter={() => (
									<View style={[styles.sectionFooterSpacer]} />
								)}
								ListEmptyComponent={() => (
									<View style={{ padding: 20, alignItems: "center" }}>
										<Text style={{ color: currentTheme.text, opacity: 0.6 }}>
											No profiles found. Create one to get started!
										</Text>
									</View>
								)}
							/>
						</View>
					) : (
						// 🌟 3. RENDERING EMERGENCY CONTACTS TAB
						<View style={{ flex: 1 }}>
							<FlatList
								data={emergencyContacts}
								keyExtractor={(item) => item.id}
								onRefresh={loadAllUserData}
								refreshing={refreshing}
								showsVerticalScrollIndicator={false}
								contentContainerStyle={{ paddingBottom: 0, gap: 10 }}
								renderItem={({ item, index }) => (
									<View>
										<ContactCard
											name={item.name}
											phone={item.phone}
											order={
												item.hierarchy === 1 ? "primary"
													: item.hierarchy === 2 ? "secondary"
														: item.hierarchy === 3 ? "tertiary"
															: item.hierarchy === 4 ? "quaternary"
																: item.hierarchy === 5 ? "quinary"
																	: "none"
											}
										/>
									</View>
								)}
								ListEmptyComponent={() => (
									<View style={{ padding: 20, alignItems: "center" }}>
										<Text style={{ color: currentTheme.text, opacity: 0.6 }}>
											No emergency contacts added yet.
										</Text>
									</View>
								)}
							/>
						</View>
					)}

					{/* 🌟 4. ABSOLUTE POSITIONED BAR (SHARED BY BOTH INDICES FOR UNIFORM LAYOUT) */}
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						keyboardVerticalOffset={Platform.OS == "ios" ? 50 : 0}
						style={{
							position: "absolute",
							// 🌟 DYNAMIC BOTTOM VALUE
							bottom: isKeyboardVisible
								? (Platform.OS == "ios" ? 116 : 40)
								: (Platform.OS === "ios" ? 95 : 15),
							left: 20,
							right: 20,
							zIndex: 10,
						}}
					>
						<View style={{ flexDirection: "row", gap: 10 }}>
							{selectedIndex === 0 ? (
								<>
									<View style={{ flex: 1 }}>
										<SkeuoInput
											ref={searchInputRef}
											placeholder="Search"
											value={searchQuery}
											onChangeText={setSearchQuery}
											returnKeyType="search"
											clearButtonMode="while-editing"
										/>
									</View>
									<GlossSurface tone={["#8FCB57", "#4F8B29", "#2C5416"]} style={styles.addBtn}>
										<Pressable
											style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
											onPress={() => setAddProfileVisible(true)}
										>
											<Ionicons name="add" size={22} color="#F4ECD8" />
										</Pressable>
									</GlossSurface>
								</>
							) : (
								<>
									<View style={{ flex: 1 }} />
									<GlossSurface tone={["#8FCB57", "#4F8B29", "#2C5416"]} style={styles.addBtn}>
										<Pressable
											style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
											onPress={() => setAddContactVisible(true)}
										>
											<Ionicons name="add" size={22} color="#F4ECD8" />
										</Pressable>
									</GlossSurface>
								</>
							)}
						</View>
					</KeyboardAvoidingView>

					<AddProfileModal
						visible={addProfileVisible}
						onClose={() => {
							setAddProfileVisible(false);
						}}
					/>

					<AddContactModal
						visible={addContactVisible}
						onClose={() => {
							setAddContactVisible(false);
						}}
					/>
				</View>
			</SafeAreaView>
		</LinenBackground>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, width: "100%", paddingHorizontal: 20 },
	fieldContainer: { gap: 4, width: "100%" },
	pageHeader: { fontSize: 40, fontFamily: "Logo-Font" },
	infoLabel: { fontFamily: "Condensed-Bold", fontSize: 14, margin: 0 },
	caption: { opacity: 0.8, fontSize: 13 },
	headerPanel: { width: "100%", paddingTop: 16, paddingBottom: 14, paddingHorizontal: 20 },
	segmentBtn: {
		height: 38,
		borderRadius: 100,
		marginHorizontal: 4,
		alignItems: "center",
		justifyContent: "center",
	},
	segmentText: { fontSize: 14, fontWeight: "700" },
	segmentTextActive: { fontSize: 14, fontWeight: "800", color: "#F4ECD8" },
	addBtn: { width: 46, height: 46 },
	sectionHeaderContainer: {
		paddingVertical: 8,
		marginTop: 0,
		justifyContent: "center",
	},
	sectionHeaderTitle: {
		fontSize: 14,
		fontFamily: "Condensed-Bold",
		textTransform: "uppercase",
		opacity: 0.6,
	},
	sectionFooterSpacer: {
		height: 10,
	},
});
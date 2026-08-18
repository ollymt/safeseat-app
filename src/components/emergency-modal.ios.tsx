// components/AssignSeatModal.tsx
import { Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    Pressable,
    useColorScheme,
    View,
} from "react-native";

import Button from "@/components/button";
import { LeatherPanel, PaperCard } from "@/components/skeuo";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    hierarchy: number; // 1-5
}

type Props = {
    visible: boolean;
    seat: number;
    onClose: () => void;
    id?: string;
    name: string;
    icon?: string;
    isAccountOwner?: boolean;
};

const LOCAL_EMERGENCY_CONTACTS_KEY = "app_emergency_contacts";

const HIERARCHY_LABELS: Record<number, string> = {
    1: "Primary",
    2: "Secondary",
    3: "Tertiary",
    4: "Quaternary",
    5: "Quinary",
};

export default function EmergencyModal({
    visible,
    seat,
    name,
    icon,
    onClose,
}: Props) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const [role, setRole] = useState("");
    const [econMenuVisible, setEconMenuVisible] = useState(false);

    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);

    useEffect(() => {
        if (!visible) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        switch (seat) {
            case 1:
                setRole("Driver");
                break;
            case 2:
                setRole("Passenger");
                break;
            case 3:
                setRole("L Backseat");
                break;
            case 4:
                setRole("C Backseat");
                break;
            case 5:
                setRole("R Backseat");
                break;
            default:
                setRole("MISSINGNO");
                break;
        }
    }, [visible, seat]);

    // 📥 Fetch contacts matching the exact schema from Everyone screen
    const fetchAppEmergencyContacts = async () => {
        setLoadingContacts(true);
        let loadedContacts: EmergencyContact[] = [];

        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                // Query users/{uid}/emergencyContacts
                const contactsRef = collection(
                    db,
                    "users",
                    currentUser.uid,
                    "emergencyContacts"
                );
                const contactsSnap = await getDocs(contactsRef);

                loadedContacts = contactsSnap.docs.map((doc) => {
                    const data = doc.data();
                    const hierarchyNum = Number(data.hierarchy);
                    return {
                        id: doc.id,
                        name: data.name || "Unknown Name",
                        phone: data.phone || "No Phone Number",
                        hierarchy:
                            data.hierarchy != null && !isNaN(hierarchyNum) && hierarchyNum > 0
                                ? hierarchyNum
                                : 0,
                    };
                });

                // Sort by hierarchy (1-5 ascending), unset (0) last
                loadedContacts.sort((a, b) => {
                    if (a.hierarchy === 0 && b.hierarchy === 0) return 0;
                    if (a.hierarchy === 0) return 1;
                    if (b.hierarchy === 0) return -1;
                    return a.hierarchy - b.hierarchy;
                });

                // Sync local cache
                if (loadedContacts.length > 0) {
                    await AsyncStorage.setItem(
                        LOCAL_EMERGENCY_CONTACTS_KEY,
                        JSON.stringify(loadedContacts)
                    );
                }
            }

            // Fallback to AsyncStorage if offline or Firestore is empty
            if (loadedContacts.length === 0) {
                const cached = await AsyncStorage.getItem(LOCAL_EMERGENCY_CONTACTS_KEY);
                if (cached) {
                    loadedContacts = JSON.parse(cached);
                }
            }

            setContacts(loadedContacts);
        } catch (error) {
            console.error("Error syncing emergency contacts:", error);
            const cached = await AsyncStorage.getItem(LOCAL_EMERGENCY_CONTACTS_KEY);
            if (cached) {
                setContacts(JSON.parse(cached));
            }
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleOpenContactMenu = () => {
        setEconMenuVisible(true);
        fetchAppEmergencyContacts();
    };

    const handleCall = (phoneNumber: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
        Linking.openURL(`tel:${cleanNumber}`);
    };

    if (!visible) return null;

    return (
        <View style={styles.glassViewCont}>
            <LeatherPanel style={[styles.glassView, { borderColor: "#D8543F", borderWidth: 2 }]}>
                {/* Header Content */}
                <View style={styles.headerRow}>
                    {icon ? (
                        <Image
                            source={{ uri: icon }}
                            style={[styles.avatar, { borderColor: "#C9A227" }]}
                        />
                    ) : null}
                    <Text style={[styles.titleText, { color: "#F1E3C6" }]}>
                        {name} is having an emergency!
                    </Text>
                </View>

                {/* Emergency Action Buttons */}
                <View style={{ flexDirection: "column", gap: 10, width: "100%" }}>
                    <Button variant="warn" onPress={() => { }} fullWidth={true}>
                        <View style={styles.buttonContent}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="alert-circle" size={36} color={currentTheme.primaryBttnText} />
                            </View>
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: currentTheme.primaryBttnText },
                                ]}
                            >
                                Notify Emergency Services
                            </Text>
                        </View>
                    </Button>

                    <Button
                        variant="primary"
                        onPress={handleOpenContactMenu}
                        fullWidth={true}
                    >
                        <View style={styles.buttonContent}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="call" size={36} color={currentTheme.primaryBttnText} />
                            </View>
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: currentTheme.primaryBttnText },
                                ]}
                            >
                                Call Emergency Contact
                            </Text>
                        </View>
                    </Button>
                </View>
                <View style={{ width: "100%", borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: "hidden" }}>
                    <Button
                        label="Dismiss"
                        variant="secondary"
                        onPress={onClose}
                        fullWidth={true}
                    />
                </View>
            </LeatherPanel>

            {/* Contacts Selection Sheet */}
            <Modal
                visible={econMenuVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setEconMenuVisible(false)}
            >
                <View style={styles.contactSheetBackdrop}>
                    <LeatherPanel style={styles.contactSheet} inset={10}>
                        <View style={{ width: "100%", flexDirection: "row", justifyContent: "flex-end" }}>
                            <Pressable onPress={() => setEconMenuVisible(false)} style={styles.closeCircle}>
                                <Ionicons name="close" size={18} color="#F1E3C6" />
                            </Pressable>
                        </View>

                        <Text style={styles.contactSheetTitle}>
                            Select Emergency Contact
                        </Text>

                        {loadingContacts ? (
                            <ActivityIndicator
                                size="large"
                                color="#F1E3C6"
                                style={{ marginVertical: 20 }}
                            />
                        ) : contacts.length > 0 ? (
                            <ScrollView style={{ width: "100%", maxHeight: 340 }} contentContainerStyle={{ gap: 8 }}>
                                {contacts.map((contact) => {
                                    const rankLabel = HIERARCHY_LABELS[contact.hierarchy];
                                    return (
                                        <PaperCard key={contact.id} style={{ padding: 0 }}>
                                            <Pressable
                                                onPress={() => handleCall(contact.phone)}
                                                style={styles.contactRow}
                                            >
                                                <Ionicons name="call" size={20} color={currentTheme.primaryBttn} />
                                                <View style={{ marginLeft: 12, flex: 1 }}>
                                                    <Text style={{ color: currentTheme.text, fontSize: 18, fontWeight: "800" }}>
                                                        {contact.name}
                                                    </Text>
                                                    <Text style={{ color: currentTheme.textSecondary, fontSize: 14 }}>
                                                        {contact.phone}
                                                    </Text>
                                                </View>
                                                {rankLabel && (
                                                    <Text style={{ color: currentTheme.textSecondary, fontSize: 12, fontWeight: "700" }}>
                                                        {rankLabel.toUpperCase()}
                                                    </Text>
                                                )}
                                            </Pressable>
                                        </PaperCard>
                                    );
                                })}
                            </ScrollView>
                        ) : (
                            <Text style={styles.contactSheetEmpty}>
                                No emergency contacts added yet.
                            </Text>
                        )}
                    </LeatherPanel>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    glassView: {
        width: "100%",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
        borderRadius: 36,
        padding: 20,
    },
    glassViewCont: {
        position: "absolute",
        bottom: 70,
        left: 20,
        right: 20,
        zIndex: 1000,
        flexDirection: "column",
        gap: 20,
    },
    headerRow: {
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        width: "100%",
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
    },
    titleText: {
        flex: 1,
        fontSize: 24,
        fontWeight: "800",
        flexWrap: "wrap",
        textAlign: "center"
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 40,
    },
    iconContainer: {
        justifyContent: "center",
        alignItems: "center",
        height: 24,
    },
    buttonText: {
        fontWeight: "800",
        fontSize: 18,
        includeFontPadding: false,
        textAlignVertical: "center",
        lineHeight: 24,
        height: 24,
        overflow: "visible",
        paddingTop: 2,
    },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    contactSheetBackdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    contactSheet: {
        width: "100%",
        maxHeight: "80%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 34,
    },
    contactSheetTitle: {
        color: "#F1E3C6",
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 14,
    },
    contactSheetEmpty: {
        color: "#C9AC7C",
        fontSize: 16,
        textAlign: "center",
    },
    closeCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
});
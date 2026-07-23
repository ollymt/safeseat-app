// components/AssignSeatModal.tsx
import { Themes } from "@/constants/theme";
import {
    BottomSheet,
    Column,
    Host,
    Icon,
    List,
    Row,
    Spacer,
    Button as UIButton,
    Text as UIText,
} from "@expo/ui";
import {
    buttonBorderShape,
    buttonStyle,
    controlSize,
} from "@expo/ui/swift-ui/modifiers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GlassView } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

import Button from "@/components/button";
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
            <GlassView style={styles.glassView}>
                {/* Header Content */}
                <View style={styles.headerRow}>
                    {icon ? (
                        <Image
                            source={{ uri: icon }}
                            style={[styles.avatar, { borderColor: currentTheme.text }]}
                        />
                    ) : null}
                    <Text style={[styles.titleText, { color: currentTheme.text }]}>
                        {name} is having an emergency!
                    </Text>
                </View>

                {/* Emergency Action Buttons */}
                <View style={{ flexDirection: "column", gap: 10, width: "100%" }}>
                    <Button variant="warn" onPress={() => { }} fullWidth={true}>
                        <View style={styles.buttonContent}>
                            <View style={styles.iconContainer}>
                                <Host matchContents>
                                    <Icon
                                        name={Icon.select({
                                            ios: "light.beacon.max.fill",
                                            android: import("@expo/material-symbols/siren.xml"),
                                        })}
                                        color={currentTheme.primaryBttnText}
                                        size={36}
                                    />
                                </Host>
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
                                <Host matchContents>
                                    <Icon
                                        name={Icon.select({
                                            ios: "phone.fill",
                                            android: import("@expo/material-symbols/call.xml"),
                                        })}
                                        color={currentTheme.primaryBttnText}
                                        size={36}
                                    />
                                </Host>
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
            </GlassView>

            {/* Contacts Selection Sheet */}
            <Host>
                <BottomSheet
                    isPresented={econMenuVisible}
                    onDismiss={() => setEconMenuVisible(false)}
                    snapPoints={["half"]}
                    showDragIndicator={false}
                >
                    <Column alignment="center" style={{ paddingHorizontal: 0 }} spacing={16}>
                        <Row style={{ width: "100%" }}>
                            <UIButton
                                variant="outlined"
                                onPress={() => setEconMenuVisible(false)}
                                modifiers={[
                                    buttonStyle("glass"),
                                    controlSize("large"),
                                    buttonBorderShape("circle"),
                                ]}
                            >
                                <Icon
                                    name={Icon.select({
                                        ios: "xmark",
                                        android: import("@expo/material-symbols/close.xml"),
                                    })}
                                />
                            </UIButton>
                            <Spacer flexible />
                        </Row>

                        <UIText
                            textStyle={{
                                color: currentTheme.text,
                                fontSize: 28,
                                fontWeight: "bold",
                                textAlign: "center",
                            }}
                        >
                            Select Emergency Contact
                        </UIText>

                        {loadingContacts ? (
                            <ActivityIndicator
                                size="large"
                                color={currentTheme.text}
                                style={{ marginVertical: 0 }}
                            />
                        ) : contacts.length > 0 ? (
                            <List>
                                {contacts.map((contact) => {
                                    const rankLabel = HIERARCHY_LABELS[contact.hierarchy];
                                    return (
                                        <UIButton
                                            key={contact.id}
                                            onPress={() => handleCall(contact.phone)}
                                            modifiers={[buttonStyle("plain"), controlSize("large")]}
                                        >
                                            <Row alignment="center" style={{ width: "100%" }} spacing={12}>
                                                <Icon
                                                    name={Icon.select({
                                                        ios: "phone.circle.fill",
                                                        android: import("@expo/material-symbols/call.xml"),
                                                    })}
                                                    size={30}
                                                />
                                                <Column alignment="start">
                                                    <UIText textStyle={{ fontSize: 20, fontWeight: "bold" }}>
                                                        {contact.name}
                                                    </UIText>
                                                    <UIText textStyle={{ fontSize: 16 }}>
                                                            {contact.phone}
                                                    </UIText>
                                                </Column>
                                            </Row>
                                        </UIButton>
                                    );
                                })}
                            </List>
                        ) : (
                            <UIText
                                textStyle={{
                                    color: currentTheme.textSecondary || "#888",
                                    fontSize: 16,
                                    textAlign: "center",
                                }}
                            >
                                No emergency contacts added yet.
                            </UIText>
                        )}
                        <Spacer flexible />
                    </Column>
                </BottomSheet>
            </Host>
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
        fontFamily: "Body-Bold",
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
        fontFamily: "Body-Bold",
        fontSize: 18,
        includeFontPadding: false,
        textAlignVertical: "center",
        lineHeight: 24,
        height: 24,
        overflow: "visible",
        paddingTop: 2,
    },
});
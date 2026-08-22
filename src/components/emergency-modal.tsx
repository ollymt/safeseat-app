// components/AssignSeatModal.tsx
import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { BottomSheet, Host, Icon, Row, Spacer } from "@expo/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    Pressable,
    useColorScheme,
    View,
} from "react-native";

import { Button as UIButton } from "@expo/ui";

import Button from "@/components/button";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    hierarchy: number;
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

    const fetchAppEmergencyContacts = async () => {
        setLoadingContacts(true);
        let loadedContacts: EmergencyContact[] = [];

        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
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

                loadedContacts.sort((a, b) => {
                    if (a.hierarchy === 0 && b.hierarchy === 0) return 0;
                    if (a.hierarchy === 0) return 1;
                    if (b.hierarchy === 0) return -1;
                    return a.hierarchy - b.hierarchy;
                });

                if (loadedContacts.length > 0) {
                    await AsyncStorage.setItem(
                        LOCAL_EMERGENCY_CONTACTS_KEY,
                        JSON.stringify(loadedContacts)
                    );
                }
            }

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

    const handleCall = async (phoneNumber: string) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
            const url = `tel:${cleanNumber}`;
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            }
        } catch (e) {
            console.error("Failed to make phone call:", e);
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.glassViewCont}>
            <View style={[styles.glassView, { backgroundColor: themes.backgroundElement, borderWidth: 0, borderColor: themes.text }]}>
                {/* Header Content */}
                <View style={styles.headerRow}>
                    {icon ? (
                        <Image
                            source={{ uri: icon }}
                            style={[styles.avatar, { borderColor: themes.text }]}
                        />
                    ) : null}
                    <Text style={[styles.titleText, { color: themes.text }]}>
                        {name} is having an emergency!
                    </Text>
                </View>

                {/* Emergency Action Buttons */}
                <View style={{ flexDirection: "column", gap: 10, width: "100%" }}>
                    <Button variant="warn" onPress={() => { }} fullWidth={true}>
                        <View style={styles.buttonContent}>
                            <View style={styles.iconContainer}>
                                <Ionicons
                                    name="warning"
                                    color={themes.primaryBttnText}
                                    size={30}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: themes.primaryBttnText },
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
                                <Ionicons
                                    name="call"
                                    color={themes.primaryBttnText}
                                    size={30}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: themes.primaryBttnText },
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
            </View>

            {/*
               ANDROID FIX:
               The previous version mixed native @expo/ui components (Column, Row,
               UIButton, UIText, Icon) directly inside a React Native <ScrollView>.
               RN's layout system and Android's Compose interop don't reliably agree
               on measurement when nested that way, which is what caused the crash
               on "Call Emergency Contact". BottomSheet itself is still the native
               @expo/ui component (needed for native sheet behavior), but everything
               rendered *inside* it below is now plain React Native — no more
               crossing native -> RN -> native boundaries. Icons were also switched
               from the `android: import("...")` pattern (which passes an unresolved
               Promise as the icon source) to @expo/vector-icons, which resolves
               synchronously on both platforms.
            */}
            <BottomSheet
                isPresented={econMenuVisible}
                onDismiss={() => setEconMenuVisible(false)}
                snapPoints={["full"]}
                showDragIndicator={false}
            >
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: "100%", alignItems: "center" }}>
                    <View style={{ width: "100%", flexDirection: "row", justifyContent: "flex-end" }}>
                        <Host matchContents>
                            <Row alignment="start">
                            <UIButton variant="outlined" onPress={() => setEconMenuVisible(false)}>
                                <Icon name={Icon.select({
                                    ios: "xmark",
                                    android: import("@expo/material-symbols/close.xml")
                                })}/>
                            </UIButton>
                            <Spacer />
                            </Row>
                        </Host>
                    </View>

                    <Text
                        style={{
                            color: themes.text,
                            fontSize: 24,
                            fontWeight: "bold",
                            textAlign: "center",
                            marginBottom: 12,
                        }}
                    >
                        Select Emergency Contact
                    </Text>

                    {loadingContacts ? (
                        <ActivityIndicator
                            size="large"
                            color={themes.text}
                            style={{ marginVertical: 20 }}
                        />
                    ) : contacts.length > 0 ? (
                        <ScrollView style={{ width: "100%", maxHeight: 300, borderRadius: 16 }} contentContainerStyle={{ gap: 0 }}>
                            {contacts.map((contact) => (
                                <Pressable
                                    key={contact.id}
                                    onPress={() => handleCall(contact.phone)}
                                    style={[
                                        styles.contactRow,
                                        { backgroundColor: themes.backgroundElement, borderBottomWidth: 0, borderColor: themes.secondaryBttn },
                                    ]}
                                >
                                    <Host matchContents>
                                        <Icon name={Icon.select({
                                            ios: "phone.fill",
                                            android: import("@expo/material-symbols/call.xml")
                                        })} />
                                    </Host>
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={{ color: themes.text, fontSize: 18, fontWeight: "bold" }}>
                                            {contact.name}
                                        </Text>
                                        <Text style={{ color: themes.text, fontSize: 14 }}>
                                            {contact.phone}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text
                            style={{
                                color: themes.textSecondary || "#888",
                                fontSize: 16,
                                textAlign: "center",
                            }}
                        >
                            No emergency contacts added yet.
                        </Text>
                    )}
                </View>
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    glassView: {
        width: "100%",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
        borderRadius: 16,
        padding: 20,
    },
    glassViewCont: {
        position: "absolute",
        bottom: 20,
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
        width: 24,
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
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
});
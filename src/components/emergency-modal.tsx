import { FontSize as fontsize, Spacing as spacing, Themes as themes } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { collection, getDocs } from "firebase/firestore";

import Button from "@/components/button";
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

const ROLE_LABELS: Record<number, string> = {
  1: "Driver",
  2: "Front passenger",
  3: "Left rear",
  4: "Center rear",
  5: "Right rear",
};

const formatImageUri = (value?: string) => {
  if (!value || value === "Not Set" || value.trim() === "") return undefined;
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  return `data:image/jpeg;base64,${value}`;
};

export default function EmergencyModal({
  visible,
  seat,
  name,
  icon,
  onClose,
  isAccountOwner = false,
}: Props) {
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [visible, seat]);

  const fetchEmergencyContacts = async () => {
    setLoadingContacts(true);
    let loadedContacts: EmergencyContact[] = [];

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const contactsRef = collection(db, "users", currentUser.uid, "emergencyContacts");
        const contactsSnap = await getDocs(contactsRef);

        loadedContacts = contactsSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          const hierarchyNum = Number(data.hierarchy);
          return {
            id: docSnap.id,
            name: data.name || "Unknown contact",
            phone: data.phone || "",
            hierarchy:
              data.hierarchy != null && !Number.isNaN(hierarchyNum) && hierarchyNum > 0
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
            JSON.stringify(loadedContacts),
          );
        }
      }

      if (loadedContacts.length === 0) {
        const cached = await AsyncStorage.getItem(LOCAL_EMERGENCY_CONTACTS_KEY);
        if (cached) loadedContacts = JSON.parse(cached);
      }

      setContacts(loadedContacts);
    } catch (error) {
      console.error("Error syncing emergency contacts:", error);
      const cached = await AsyncStorage.getItem(LOCAL_EMERGENCY_CONTACTS_KEY);
      if (cached) setContacts(JSON.parse(cached));
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleOpenContactMenu = () => {
    setContactMenuVisible(true);
    fetchEmergencyContacts();
  };

  const handleCall = async (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
    if (!cleanNumber) {
      Alert.alert("No phone number", "This contact does not have a usable phone number.");
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const url = `tel:${cleanNumber}`;
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Calling unavailable", "This device cannot open the phone dialer.");
      }
    } catch (error) {
      console.error("Failed to open phone dialer:", error);
      Alert.alert("Calling unavailable", "Could not open the phone dialer.");
    }
  };

  const handleEmergencyServices = () => {
    Alert.alert(
      "Call emergency services?",
      "This will open your phone dialer with 911. SafeSeat will not place the call automatically.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Dialer",
          style: "destructive",
          onPress: () => handleCall("911"),
        },
      ],
    );
  };

  if (!visible) return null;

  const role = ROLE_LABELS[seat] ?? `Seat ${seat}`;
  const imageUri = formatImageUri(icon);
  const title = isAccountOwner ? "You may be having an emergency" : `${name} may be having an emergency`;

  return (
    <>
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.card}>
          <View style={styles.alertPill}>
            <Ionicons name="warning" color={themes.warnBttn} size={16} />
            <Text style={styles.alertPillText}>EMERGENCY</Text>
          </View>

          <View style={styles.headerRow}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.headerCopy}>
              <Text style={styles.titleText}>{title}</Text>
              <Text style={styles.subtitleText}>{role} · verification requires attention</Text>
            </View>
          </View>

          <View style={styles.actionStack}>
            <Button variant="warn" onPress={handleEmergencyServices} fullWidth>
              <View style={styles.buttonContent}>
                <Ionicons name="call" color={themes.warnBttnText} size={22} />
                <Text style={[styles.buttonText, { color: themes.warnBttnText }]}>Emergency Services</Text>
              </View>
            </Button>

            <Button variant="primary" onPress={handleOpenContactMenu} fullWidth>
              <View style={styles.buttonContent}>
                <Ionicons name="people" color={themes.primaryBttnText} size={22} />
                <Text style={[styles.buttonText, { color: themes.primaryBttnText }]}>Emergency Contacts</Text>
              </View>
            </Button>

            <Button label="Dismiss for now" variant="secondary" onPress={onClose} fullWidth />
          </View>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={contactMenuVisible}
        onRequestClose={() => setContactMenuVisible(false)}
      >
        <View style={styles.contactBackdrop}>
          <View style={styles.contactSheet}>
            <View style={styles.contactHeader}>
              <View>
                <Text style={styles.contactTitle}>Emergency Contacts</Text>
                <Text style={styles.contactSubtitle}>Tap a contact to open the phone dialer.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close emergency contacts"
                onPress={() => setContactMenuVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" color={themes.text} size={24} />
              </Pressable>
            </View>

            {loadingContacts ? (
              <ActivityIndicator size="large" color={themes.primaryBttn} style={styles.loader} />
            ) : contacts.length > 0 ? (
              <ScrollView style={styles.contactList} contentContainerStyle={styles.contactListContent}>
                {contacts.map((contact, index) => (
                  <Pressable
                    key={contact.id}
                    onPress={() => handleCall(contact.phone)}
                    style={({ pressed }) => [styles.contactRow, pressed && styles.contactRowPressed]}
                  >
                    <View style={styles.contactIcon}>
                      <Ionicons name="call" color={themes.primaryBttn} size={20} />
                    </View>
                    <View style={styles.contactCopy}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactPhone}>{contact.phone || "No phone number"}</Text>
                    </View>
                    <Text style={styles.contactOrder}>
                      {contact.hierarchy > 0 ? `#${contact.hierarchy}` : ""}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyContacts}>
                <Ionicons name="person-add-outline" color={themes.textSecondary} size={34} />
                <Text style={styles.emptyContactsTitle}>No emergency contacts yet</Text>
                <Text style={styles.emptyContactsText}>Add contacts from People → Contacts.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: spacing.two,
    right: spacing.two,
    bottom: spacing.two,
    zIndex: 1000,
  },
  card: {
    width: "100%",
    gap: spacing.two,
    borderRadius: 22,
    padding: spacing.two,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.warnBttn,
  },
  alertPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.half,
    paddingHorizontal: spacing.one,
    paddingVertical: spacing.half,
    borderRadius: 999,
    backgroundColor: "#3C2025",
  },
  alertPillText: {
    color: themes.warnBttn,
    fontSize: fontsize.caption,
    fontFamily: "Body-Bold",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.two,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: themes.warnBttn,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: themes.warnBttn,
    backgroundColor: themes.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: themes.text,
    fontSize: fontsize.header,
    fontFamily: "Body-Bold",
  },
  headerCopy: {
    flex: 1,
    gap: spacing.half,
  },
  titleText: {
    color: themes.text,
    fontSize: 20,
    fontFamily: "Body-Bold",
  },
  subtitleText: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    fontFamily: "Body-Regular",
  },
  actionStack: {
    width: "100%",
    gap: spacing.one,
  },
  buttonContent: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.one,
  },
  buttonText: {
    fontFamily: "Body-Bold",
    fontSize: fontsize.button,
  },
  contactBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(4, 8, 18, 0.72)",
  },
  contactSheet: {
    maxHeight: "72%",
    padding: spacing.two,
    paddingBottom: spacing.four,
    gap: spacing.two,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: themes.backgroundElement,
    borderWidth: 1,
    borderColor: themes.divider,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.two,
  },
  contactTitle: {
    color: themes.text,
    fontSize: fontsize.header,
    fontFamily: "Heading-Font",
  },
  contactSubtitle: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    fontFamily: "Body-Regular",
    marginTop: spacing.half,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: themes.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginVertical: spacing.four,
  },
  contactList: {
    width: "100%",
  },
  contactListContent: {
    gap: spacing.one,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.one,
    padding: spacing.two,
    borderRadius: 16,
    backgroundColor: themes.backgroundElevated,
  },
  contactRowPressed: {
    opacity: 0.7,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: themes.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  contactCopy: {
    flex: 1,
  },
  contactName: {
    color: themes.text,
    fontSize: fontsize.body,
    fontFamily: "Body-Bold",
  },
  contactPhone: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    fontFamily: "Body-Regular",
    marginTop: spacing.quarter,
  },
  contactOrder: {
    color: themes.primaryBttn,
    fontSize: fontsize.caption,
    fontFamily: "Body-Bold",
  },
  emptyContacts: {
    alignItems: "center",
    paddingVertical: spacing.four,
    gap: spacing.one,
  },
  emptyContactsTitle: {
    color: themes.text,
    fontSize: fontsize.body,
    fontFamily: "Body-Bold",
  },
  emptyContactsText: {
    color: themes.textSecondary,
    fontSize: fontsize.caption,
    fontFamily: "Body-Regular",
    textAlign: "center",
  },
});

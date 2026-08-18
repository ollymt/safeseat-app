// components/contact-card-drawer.tsx
import { GlossSurface, LeatherPanel } from "@/components/skeuo";
import { Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

type Props = {
    visible: boolean;
    name: string;
    number: string;
    order: string;
    onClose: () => void;
};

export default function ContactCardDrawer({ visible, onClose, name, number, order }: Props) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    useEffect(() => {
        if (visible) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [visible]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <LeatherPanel style={styles.sheet} inset={10}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.order}>{order.toUpperCase()}</Text>
                            <Text style={styles.name}>{name}</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                                <Text style={styles.number}>{number}</Text>
                                <Pressable onPress={() => Alert.alert("Copied")}>
                                    <Text style={styles.copy}>Copy</Text>
                                </Pressable>
                            </View>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeCircle}>
                            <Ionicons name="close" size={18} color="#F1E3C6" />
                        </Pressable>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                        <Pressable style={[styles.actionTile, styles.actionOutline]} onPress={() => Alert.alert("Edit")}>
                            <Ionicons name="pencil" size={22} color="#F1E3C6" />
                            <Text style={styles.actionLabel}>Edit</Text>
                        </Pressable>
                        <Pressable style={[styles.actionTile, styles.actionOutline]} onPress={() => Alert.alert("Message")}>
                            <Ionicons name="chatbubbles" size={22} color="#F1E3C6" />
                            <Text style={styles.actionLabel}>Message</Text>
                        </Pressable>
                        <GlossSurface tone={["#8FCB57", "#4F8B29", "#2C5416"]} style={styles.actionTile}>
                            <Pressable
                                style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center", gap: 4 }}
                                onPress={() => Alert.alert("Call")}
                            >
                                <Ionicons name="call" size={22} color="#F4ECD8" />
                                <Text style={[styles.actionLabel, { color: "#F4ECD8" }]}>Call</Text>
                            </Pressable>
                        </GlossSurface>
                    </View>
                </LeatherPanel>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
        width: "100%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 34,
    },
    order: { color: "#C9AC7C", fontSize: 14, fontWeight: "700" },
    name: { color: "#F1E3C6", fontSize: 30, fontWeight: "800" },
    number: { color: "#F1E3C6", fontSize: 18, fontWeight: "600" },
    copy: { color: "#8FCB57", fontSize: 15, fontWeight: "700" },
    closeCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    actionTile: {
        flex: 1,
        height: 90,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    actionOutline: {
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    actionLabel: { color: "#F1E3C6", fontSize: 13, fontWeight: "700" },
});
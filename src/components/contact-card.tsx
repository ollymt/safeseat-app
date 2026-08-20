import { Materials, Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Linking, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useRouter } from "expo-router";

import * as Haptics from "expo-haptics";
import { GlossSurface, PaperCard } from "@/components/skeuo";

type ContactCardProps = {
    name: string;
    phone: string;
    order: "primary" | "secondary" | "tertiary" | "quaternary" | "quinary" | "none";
    onPress?: () => void;
};

export default function ContactCard({
    name,
    phone,
    order,
}: ContactCardProps) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const router = useRouter();

    const getOrderColor = () => {
        switch (order) {
            case "primary":
                return currentTheme.warnBttn;
            case "secondary":
                return currentTheme.yellow;
            case "tertiary":
                return currentTheme.primaryBttn;
            case "quaternary":
                return currentTheme.blue;
            case "quinary":
                return currentTheme.purple;
            default:
                return currentTheme.textSecondary;
        }
    };

    const accentColor = getOrderColor();

    const handleMakeCall = async (phoneNumber: string) => {
        const url = `tel:${phoneNumber}`;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Phone calls are not supported on this device.");
            }
        } catch (error) {
            console.error("An error occurred trying to open the dialer:", error);
        }
    };

    const handleSendSMS = async (phoneNumber: string, messageBody?: string) => {
        const url = messageBody
            ? `sms:${phoneNumber}?body=${encodeURIComponent(messageBody)}`
            : `sms:${phoneNumber}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "SMS messaging is not supported on this device.");
            }
        } catch (error) {
            console.error("An error occurred trying to open messages:", error);
        }
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(name, undefined, [
            { text: `Call ${name}`, onPress: () => handleMakeCall(phone) },
            { text: `Message ${name}`, onPress: () => handleSendSMS(phone) },
            { text: `Edit ${name}'s Info`, onPress: () => router.navigate("/settings") },
            { text: "Cancel", style: "cancel" },
        ]);
    };

    return (
        <Pressable onLongPress={handleLongPress}>
            <PaperCard style={[contcard.baseCard, { flexDirection: "row", borderColor: accentColor, borderWidth: 2 }]}>
                {/* index-tab accent strip */}
                <View style={[contcard.tab, { backgroundColor: accentColor }]} />

                <View style={{ flex: 1 }}>
                    <Text style={[contcard.orderLabel, { color: accentColor }]}>{order.toUpperCase()}</Text>
                    <Text style={[contcard.contName, { color: currentTheme.text }]}>{name}</Text>
                    <Text style={[contcard.numLabel, { color: currentTheme.textSecondary }]}>{phone}</Text>
                </View>
                <View style={{ alignItems: "center", justifyContent: "center", marginRight: 4 }}>
                    <GlossSurface
                        tone={["#8FCB57", "#4F8B29", "#2C5416"]}
                        style={{ width: 44, height: 44 }}
                    >
                        <Pressable
                            style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                handleMakeCall(phone);
                            }}
                        >
                            <Ionicons name="call" size={18} color="#F4ECD8" />
                        </Pressable>
                    </GlossSurface>
                </View>
            </PaperCard>
        </Pressable>
    );
}

const contcard = StyleSheet.create({
    baseCard: {
        width: "100%",
        padding: 14,
        paddingLeft: 18,
        alignItems: "center",
    },
    tab: {
        position: "absolute",
        left: 0,
        top: 12,
        bottom: 12,
        width: 4,
        borderRadius: 2,
    },
    contName: {
        fontWeight: "800",
        fontSize: 22,
    },
    orderLabel: {
        fontWeight: "700",
        fontSize: 12,
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    numLabel: {
        fontWeight: "600",
        fontSize: 15,
        marginTop: 2,
    },
});
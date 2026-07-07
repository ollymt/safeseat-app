import { Themes } from "@/constants/theme";
import { Host, Button, Icon } from "@expo/ui";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useColorScheme, View, Linking, Alert } from "react-native";

import * as Haptics from "expo-haptics"

type ContactCardProps = {
    name: string
    phone: string
    order: "primary" | "secondary" | "tertiary" | "quaternary" | "quinary"
}

export default function ContactCard({
    name,
    phone,
    order
}: ContactCardProps) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    // 1. Trigger a Phone Call
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

    // 2. Trigger a Text Message (SMS)
    const handleSendSMS = async (phoneNumber: string, messageBody?: string) => {
        // You can optionally pre-fill text content using the 'body' query parameter
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

    return (
        <View
            style={[
                contcard.baseCard,
                {
                    backgroundColor: currentTheme.element,
                    flexDirection: "row",
                    borderWidth: 2,
                    borderColor: order == "primary" ? currentTheme.warnBttn : order == "secondary" ? currentTheme.yellow : order == "tertiary" ? currentTheme.primaryBttn : order == "quaternary" ? currentTheme.blue : order == "quinary" ? currentTheme.purple : currentTheme.text
                }
            ]}
        >
            <View style={{ flex: 1 }}>
                <Text style={[contcard.orderLabel, { color: order == "primary" ? currentTheme.warnBttn : order == "secondary" ? currentTheme.yellow : order == "tertiary" ? currentTheme.primaryBttn : order == "quaternary" ? currentTheme.blue : order == "quinary" ? currentTheme.purple : currentTheme.text }]}>{order.toUpperCase()}</Text>
                <Text style={[ contcard.contName, { color: currentTheme.text }]}>{name}</Text>
                <Text style={[ contcard.numLabel, { color: currentTheme.text }]}>{phone}</Text>
            </View>
            <View style={{ alignItems: "center", justifyContent: "center", borderWidth: 0, borderColor: "#fff", marginRight: 10}}>
                <Pressable style={{ backgroundColor: currentTheme.primaryBttn, padding: 8, borderRadius: 100 }} onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    Alert.alert(`Call or Text ${name}?`, "", [
                        {
                            text: "Cancel",
                            style: "cancel"
                        },
                        {
                            text: "Text",
                            onPress: () => handleSendSMS(phone),
                            style: "default"
                        },
                        {
                            text: "Call",
                            onPress: () => handleMakeCall(phone),
                            style: "default"
                        },
                    ])
                }}>
                    <Host matchContents>
                        <Icon
                            name={Icon.select({
                                ios: "phone.fill",
                                android: import("@expo/material-symbols/phone_enabled.xml")
                            })}
                            color={currentTheme.primaryBttnText}
                        />
                    </Host>
                </Pressable>
            </View>
        </View>
    )
}

const contcard = StyleSheet.create({
    baseCard: {
        width: "100%",
        padding: 10,
        borderRadius: 12
    },
    contName: {
        fontFamily: "Body-Bold",
        fontSize: 36,
    },
    orderLabel: {
        fontFamily: "Condensed-Bold",
        fontSize: 14
    },
    numLabel: {
        fontFamily: "Body-Bold",
        fontSize: 18
    }
})
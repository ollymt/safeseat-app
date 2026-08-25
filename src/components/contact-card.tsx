import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import { useState } from "react";
import { MenuView } from '@expo/ui/community/menu';
import { Pressable, StyleSheet, Text, useColorScheme, View, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import Button from "./button";

import * as Haptics from "expo-haptics";

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
    onPress
}: ContactCardProps) {
    const router = useRouter();

    // 🌟 Helper function to determine badge/border color based on order
    const getOrderColor = () => {
        switch (order) {
            case "primary":
                return themes.green;
            case "secondary":
                return themes.lightOrange;
            default:
                return themes.text; // 🌟 Defaults to textSecondary when priority is not set
        }
    };

    const accentColor = getOrderColor();

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

    const isUnimportant = (order != "primary" && order != "secondary" && order != "tertiary")

    return (
        <Pressable
            style={[
                contcard.baseCard,
                isUnimportant && contcard.emptySeat,
                {
                    backgroundColor: themes.backgroundElement,
                    borderWidth: spacing.quarter,
                    boxSizing: "border-box",
                    borderColor:
                        order == "primary"
                            ? themes.green
                            : order == "secondary"
                                ? themes.lightOrange
                                : order == "tertiary"
                                    ? themes.warnBttn
                                    : themes.secondaryBttn,
                },
            ]}
            onPress={onPress}
        >
            <View
                style={[
                    contcard.leftArea,
                    {
                        backgroundColor:
                            order == "primary"
                                ? themes.green
                                : order == "secondary"
                                    ? themes.lightOrange
                                    : order == "tertiary"
                                        ? themes.warnBttn
                                        : themes.secondaryBttn,
                    },
                ]}
            />
            <View
                style={{
                    paddingVertical: spacing.one,
                    flex: 1,
                    borderWidth: spacing.none,
                    borderColor: "#fff",
                    gap: spacing.half
                }}
            >

                <Text
                    style={[contcard.role, {
                        color: order == "primary"
                            ? themes.green
                            : order == "secondary"
                                ? themes.lightOrange
                                : order == "tertiary"
                                    ? themes.warnBttn
                                    : themes.textSecondary
                    }]}
                >
                    {order.toUpperCase()}
                </Text>

                <Text style={[contcard.name, { color: themes.text }]}>
                    {name == "empty" ? "Empty" : name}
                </Text>

                <Text
                    style={[contcard.role, {
                        color: order == "primary"
                            ? themes.green
                            : order == "secondary"
                                ? themes.lightOrange
                                : order == "tertiary"
                                    ? themes.warnBttn
                                    : themes.textSecondary
                    }]}
                >
                    {phone}
                </Text>
            </View>

            <Pressable
                style={[
                    contcard.rightArea,
                    {
                        backgroundColor:
                            order == "primary"
                                ? themes.green
                                : order == "secondary"
                                    ? themes.lightOrange
                                    : order == "tertiary"
                                        ? themes.warnBttn
                                        : themes.secondaryBttn,
                    },
                ]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleMakeCall(phone);
                }}
            >
                <Host matchContents>
                    <Icon name={Icon.select({
                        ios: "phone.fill",
                        android: import("@expo/material-symbols/call.xml")
                    })} color={isUnimportant ? themes.text : themes.background} size={spacing.five}/>
                </Host>
            </Pressable>
        </Pressable>
    );
}

const contcard = StyleSheet.create({
    baseCard: {
        width: "100%",
        borderWidth: spacing.none,
        borderColor: themes.text,
        flexDirection: "row",
        gap: spacing.one,
        borderRadius: spacing.edge,
        overflow: "hidden",
        padding: spacing.quarter,
    },
    seatNoCont: {
        width: "15%",
        alignItems: "center",
        justifyContent: "center",
    },
    leftArea: {
        width: spacing.three,
        borderTopLeftRadius: spacing.one,
        borderTopRightRadius: spacing.quarter,
        borderBottomLeftRadius: spacing.one,
        borderBottomRightRadius: spacing.quarter
    },
    rightArea: {
        width: spacing.eight,
        borderTopLeftRadius: spacing.quarter,
        borderTopRightRadius: spacing.one,
        borderBottomLeftRadius: spacing.quarter,
        borderBottomRightRadius: spacing.one,
        alignItems: "center",
        justifyContent: "center"
    },
    name: {
        fontSize: fontsize.header,
        fontFamily: "Body-Bold",
    },
    stateName: {
        fontSize: fontsize.body,
        fontFamily: "Body-Bold",
    },
    role: {
        fontSize: fontsize.body,
        fontFamily: "Body-Bold"
    },
    emptySeat: {
        opacity: 1,
    },
});
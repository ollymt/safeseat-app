import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { useEffect, useState } from "react";
import { View, Pressable, Text, Image, StyleSheet } from "react-native"
import { Host, Icon } from "@expo/ui"

type Profile = {
    id: string;
    name: string;
    icon?: string;
    isAccountOwner?: boolean;
};

type ProfileListProps = {
    name: string;
    pfp?: string;
    checked?: boolean;
    isLast?: boolean;
    onPress?: () => void;
}

export default function ProfileList({
    name,
    pfp,
    checked = false,
    isLast = false,
    onPress,
}: ProfileListProps) {
    return (
        <Pressable style={[styles.base, isLast && styles.isLast]} onPress={onPress}>

            {!pfp || pfp == "" ? (
                <View style={styles.pfp}>
                    <Text style={styles.monogram}>{name.charAt(0).toUpperCase()}</Text>
                </View>
            ) : (
                <Image source={{ uri: pfp }} style={styles.pfp} />
            )}

            <Text style={styles.name}>{name}</Text>

            {checked && (
                <Host matchContents>
                    <Icon name={Icon.select({
                        ios: "checkmark",
                        android: import("@expo/material-symbols/check.xml")
                    })} color={themes.primaryBttn} />
                </Host>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    base: {
        width: "100%",
        backgroundColor: themes.backgroundElement,
        flexDirection: "row",
        padding: spacing.one,
        gap: spacing.two,
        borderWidth: spacing.none,
        borderColor: themes.text,
        alignItems: "center"
    },
    pfp: {
        width: spacing.seven,
        height: spacing.seven,
        backgroundColor: themes.secondaryBttn,
        borderWidth: spacing.quarter,
        borderColor: themes.text,
        borderRadius: spacing.four,
        alignItems: "center",
        justifyContent: "center",
    },
    monogram: {
        fontSize: fontsize.header,
        fontWeight: 600,
        color: themes.text
    },
    name: {
        fontSize: fontsize.body,
        fontFamily: "Body-Medium",
        color: themes.text,
        flex: 1,
    },
    isLast: {
        borderBottomWidth: spacing.quarter,
        borderColor: themes.secondaryBttn,
    }
})
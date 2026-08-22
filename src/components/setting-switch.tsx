import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import { useState, useEffect } from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
    Switch
} from "react-native";

import * as Haptics from "expo-haptics";

type SettingSwitchProps = {
    iconName?: Parameters<typeof Icon>[0]["name"];
    name: string;
    value?: boolean;
    enabled?: boolean;
    isLast?: boolean;
    onValueChange?: (newValue: boolean) => void; // Added property signature to sync back up to parent state
};

export default function SettingSwitch({
    iconName,
    name,
    isLast = false,
    enabled = true,
    value = false,
    onValueChange,
}: SettingSwitchProps) {
    const [selectedValue, setSelectedValue] = useState(value);

    // Synchronize local toggled UI state if parent storage finishes resolving asynchronously
    useEffect(() => {
        setSelectedValue(value);
    }, [value]);

    const handleToggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        const nextValue = !selectedValue;
        setSelectedValue(nextValue);
        if (onValueChange) {
            onValueChange(nextValue);
        }
    };

    return (
        <>
            <Pressable
                onPress={enabled ? handleToggle : undefined}
                disabled={!enabled}
                style={[
                    setitem.setItemBase,
                    {
                        backgroundColor: themes.backgroundElement,
                        borderBottomWidth: isLast ? spacing.none : spacing.quarter,
                        borderBottomColor: themes.secondaryBttn,
                    }
                ]}
            >
                {/* LEFT BLOCK */}
                {/* Added pointerEvents="none" so icon frames don't conflict with row press */}
                <View style={setitem.leftContainer} pointerEvents="none">
                    {iconName && (
                        <View style={[setitem.iconWrapper, { backgroundColor: themes.primaryBttn, padding: 6, borderRadius: 8 }]}>
                            <Host style={{ width: 22, height: 22 }}>
                                <Icon name={iconName} color={themes.primaryBttnText} />
                            </Host>
                        </View>
                    )}
                    <Text style={[setitem.settingName, { color: themes.text }]}>{name}</Text>
                </View>

                {/* RIGHT BLOCK */}
                {/* Added pointerEvents="none" here so the entire row area responds uniformly without getting swallowed by native switch wrappers */}
                <View style={setitem.rightContainer}>
                        <Switch 
                            value={selectedValue} 
                            onValueChange={handleToggle} 
                            disabled={!enabled}
                            trackColor={{false: themes.secondaryBttn, true: themes.primaryBttn}}
                        />
                </View>
            </Pressable>
        </>
    );
}

const setitem = StyleSheet.create({
    setItemBase: {
        width: "100%",
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
    },
    leftContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 12,
    },
    rightContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        flex: 1,
        paddingRight: 6,
    },
    iconWrapper: {
        justifyContent: "center",
        alignItems: "center",
    },
    settingName: {
        fontSize: 18,
        fontFamily: "Body-Medium",
    },
    settingValue: {
        fontSize: 18,
        fontFamily: "Condensed-Bold",
    },
    drawerCont: {
        width: "100%",
        flexDirection: "column",
        padding: 24,
    },
    drawerTitle: {
        fontSize: 20,
        fontFamily: "Heading-Font",
        textAlign: "center",
        marginBottom: 16,
    },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        padding: 14,
        borderRadius: 8,
        gap: 12,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    regularText: {
        fontSize: 16,
        fontFamily: "Body-Medium"
    }
});
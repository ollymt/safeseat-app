// @/components/setting-picker.android.tsx
import { Themes } from "@/constants/theme";
import unfoldMoreIcon from "@expo/material-symbols/unfold_more.xml";
import { Host, Icon } from "@expo/ui";
import { useState, useEffect } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

type SettingPickerProps = {
    iconName?: any;
    name: string;
    value?: string; // Wired core data hook state token
    isLast?: boolean;
    enabled?: boolean;
    onValueChange?: (newValue: string) => void; // Parent asynchronous sync callback
};

const bloodTypes = [
    { label: "Not Set", value: "none" },
    { label: "A+", value: "a+" },
    { label: "A-", value: "a-" },
    { label: "B+", value: "b+" },
    { label: "B-", value: "b-" },
    { label: "AB+", value: "ab+" },
    { label: "AB-", value: "ab-" },
    { label: "O+", value: "o+" },
    { label: "O-", value: "o-" },
];

export default function SettingPicker({
    iconName,
    name,
    value = "none",
    isLast = false,
    enabled = true,
    onValueChange,
}: SettingPickerProps) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const [selectedBloodType, setSelectedBloodType] = useState(value);
    const [modalVisible, setModalVisible] = useState(false);

    // Keep the local state synchronized when the parent's value loads asynchronously late
    useEffect(() => {
        if (value) {
            setSelectedBloodType(value);
        }
    }, [value]);

    const currentLabel = bloodTypes.find(b => b.value === selectedBloodType)?.label || "Not Set";

    const handleSelectValue = (newValue: string) => {
        setSelectedBloodType(newValue);
        if (onValueChange) {
            onValueChange(newValue);
        }
        setModalVisible(false);
    };

    return (
        <>
            <Pressable
                onPress={enabled ? () => setModalVisible(true) : undefined}
                disabled={!enabled}
                style={({ pressed }) => [
                    setitem.setItemBase,
                    {
                        backgroundColor: currentTheme.element,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: currentTheme.border,
                        opacity: pressed ? 0.8 : 1
                    }
                ]}
            >
                <View style={setitem.leftContainer}>
                    {iconName && (
                        /* FIXED: Added pointerEvents="none" to the View container wrapping the native Host block */
                        <View style={[setitem.iconWrapper, { backgroundColor: currentTheme.primaryBttn, padding: 6, borderRadius: 8 }]} pointerEvents="none">
                            <Host style={{ width: 22, height: 22 }}>
                                <Icon name={iconName} color={currentTheme.primaryBttnText} />
                            </Host>
                        </View>
                    )}
                    <Text style={[setitem.settingName, { color: currentTheme.text }]}>{name}</Text>
                </View>

                <View style={setitem.rightContainer}>
                    {/* FIXED: Added pointerEvents="none" to the native indicator row wrapper container */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} pointerEvents="none">
                        <Text style={[setitem.settingValue, { color: currentTheme.primaryBttn }]}>
                            {currentLabel}
                        </Text>
                        <Host style={{ width: 20, height: 20 }}>
                            <Icon name={unfoldMoreIcon} color={currentTheme.primaryBttn} />
                        </Host>
                    </View>
                </View>
            </Pressable>

            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={setitem.modalOverlay}>
                    <View style={[setitem.modalContent, { backgroundColor: currentTheme.element }]}>
                        <Text style={[setitem.modalTitle, { color: currentTheme.text }]}>
                            Select Blood Type
                        </Text>

                        <ScrollView style={setitem.scrollContainer} nestedScrollEnabled={true}>
                            {bloodTypes.map(b => {
                                const isSelected = b.value === selectedBloodType;
                                return (
                                    <Pressable
                                        key={b.value}
                                        onPress={() => handleSelectValue(b.value)}
                                        style={({ pressed }) => [
                                            setitem.radioRow,
                                            {
                                                backgroundColor: isSelected ? currentTheme.backgroundSelected : "transparent",
                                                opacity: pressed ? 0.7 : 1
                                            }
                                        ]}
                                    >
                                        <View style={[setitem.radioOuter, { borderColor: currentTheme.primaryBttn }]}>
                                            {isSelected && <View style={[setitem.radioInner, { backgroundColor: currentTheme.primaryBttn }]} />}
                                        </View>
                                        <Text style={[setitem.regularText, { color: currentTheme.text }]}>
                                            {b.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        <View style={setitem.buttonRow}>
                            <Pressable
                                style={[setitem.btn, { backgroundColor: currentTheme.backgroundSelected }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={{ color: currentTheme.text, fontFamily: "Body-Medium" }}>Cancel</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const setitem = StyleSheet.create({
    setItemBase: { width: "100%", height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
    leftContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
    rightContainer: { justifyContent: "flex-end", alignItems: "center" },
    iconWrapper: { justifyContent: "center", alignItems: "center" },
    settingName: { fontSize: 18, fontFamily: "Body-Medium" },
    settingValue: { fontSize: 18, fontFamily: "Condensed-Bold" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalContent: { width: "100%", maxHeight: "70%", borderRadius: 16, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 20, fontFamily: "Heading-Font", textAlign: "center", marginBottom: 16 },
    scrollContainer: { width: "100%", marginBottom: 16 },
    radioRow: { flexDirection: "row", alignItems: "center", width: "100%", padding: 14, borderRadius: 8, gap: 12 },
    radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    regularText: { fontSize: 16, fontFamily: "Body-Medium" },
    buttonRow: { flexDirection: "row", justifyContent: "flex-end" },
    btn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }
});
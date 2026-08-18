path = "src/components/assign-seat-modal.tsx"
c = open(path).read()

c = c.replace(
'''import { Themes } from "@/constants/theme";
import { BottomSheet, Button, Column, Host, Icon, List, Row, Spacer, Text } from "@expo/ui";
import { buttonBorderShape, buttonStyle, controlSize } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { useColorScheme, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";''',
'''import UButton from "@/components/button";
import { LeatherPanel, PaperCard } from "@/components/skeuo";
import { Themes } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { useColorScheme, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";'''
)

old_return = c[c.index('    return ('):]
new_return = '''    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <LeatherPanel style={styles.sheet} inset={10}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={onClose} disabled={isLoading} style={styles.chromeCircle}>
                            <Ionicons name="close" size={18} color="#F1E3C6" />
                        </Pressable>
                        <View style={{ flex: 1 }} />
                        <Pressable
                            onPress={handleSave}
                            disabled={isLoading || !selectedProfileId}
                            style={[styles.chromeCircle, selectedProfileId && !isLoading ? styles.chromeCircleActive : null]}
                        >
                            <Ionicons name="checkmark" size={18} color="#F1E3C6" />
                        </Pressable>
                    </View>

                    <Text style={styles.title}>Assign {role}</Text>

                    {isFetchingProfiles ? (
                        <Text style={styles.caption}>Loading Profiles...</Text>
                    ) : profiles.length === 0 ? (
                        <Text style={styles.caption}>All available profiles have been assigned.</Text>
                    ) : (
                        <PaperCard style={{ marginTop: 16, padding: 6, maxHeight: 320 }}>
                            <ScrollView>
                                {profiles.map((profile, i) => {
                                    const isSelected = profile.id === selectedProfileId;
                                    return (
                                        <Pressable
                                            key={profile.id}
                                            onPress={() => handleSelectProfile(profile.id)}
                                            style={[
                                                styles.profileRow,
                                                i !== profiles.length - 1 && { borderBottomWidth: 1, borderBottomColor: "rgba(120,90,50,0.25)" },
                                            ]}
                                        >
                                            <Text style={[styles.profileName, { color: isSelected ? currentTheme.primaryBttn : currentTheme.text, fontWeight: isSelected ? "800" : "600" }]}>
                                                {profile.name}
                                            </Text>
                                            {isSelected && <Ionicons name="checkmark-circle" size={20} color={currentTheme.primaryBttn} />}
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </PaperCard>
                    )}

                    <View style={{ marginTop: 16 }}>
                        <UButton
                            label={isLoading ? "Saving..." : "Assign Seat"}
                            variant="primary"
                            fullWidth
                            enabled={!isLoading && !!selectedProfileId}
                            onPress={handleSave}
                        />
                    </View>

                    {isCurrentlyAssigned && !isFetchingProfiles && (
                        <Pressable onPress={handleUnassign} disabled={isLoading} style={{ alignItems: "center", marginTop: 14 }}>
                            <Text style={styles.unassignText}>Unassign Seat</Text>
                        </Pressable>
                    )}
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
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    chromeCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    chromeCircleActive: {
        backgroundColor: "#4F8B29",
    },
    title: {
        fontSize: 26,
        color: "#F1E3C6",
        fontWeight: "800",
        textAlign: "center",
    },
    caption: {
        fontSize: 15,
        color: "#C9AC7C",
        textAlign: "center",
        marginTop: 16,
    },
    profileRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
    },
    profileName: {
        fontSize: 17,
    },
    unassignText: {
        color: "#E36A54",
        fontSize: 15,
        fontWeight: "700",
    },
});
'''
c = c.replace(old_return, new_return)
open(path, "w").write(c)
print("ok")
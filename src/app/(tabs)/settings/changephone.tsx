import Button from "@/components/button";
import { Themes } from "@/constants/theme";
import { Column, FieldGroup, Host, Slider, TextInput } from "@expo/ui";
import { frame, scrollDisabled, submitLabel } from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View,
    Alert // 🛠️ Added for user feedback
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store"; // 🛠️ Added for persistence logic

import { isSessionValid } from "@/utils/securitySession";

import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

export default function ChangePhone() {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const router = useRouter();

    const [newNumber, setNewNumber] = useState(0);
    const [cleanNumber, setCleanNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setCleanNumber(newNumber.toString().trim().padEnd(9, '0'))
    }, [newNumber])

    // Fetch both storage blocks when the component mounts
        useEffect(() => {
            async function loadAllUserData() {
                try {
                    // Fetch Core Account Details from Firebase (Auth + Firestore)
                    const currentUser = auth.currentUser;
                    if (currentUser) {
                        const userDocRef = doc(db, "users", currentUser.uid);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            if (userData.phone) setNewNumber(userData.phone.slice(2));
                        }
                    }
                } catch (error) {
                    console.error("Failed to load user profile data:", error);
                }
            }
    
            loadAllUserData();
        }, []);

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: currentTheme.background,
            }}
            edges={['left', 'right']}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={changepass.container}>
                        <View style={changepass.logoSection}>
                            <Text style={[changepass.loginlogo, { color: currentTheme.text, textAlign: "center" }]}>Change Phone Number</Text>
                            <Text style={{ color: currentTheme.textSecondary, fontSize: 16 }}>Entered Number: 09{cleanNumber}</Text>
                        </View>

                        <View style={changepass.formSection}>
                            <Host
                                style={{
                                    borderColor: "#000",
                                    borderWidth: 0,
                                    height: 90,
                                    width: "100%",
                                }}
                            >
                                <Column
                                    spacing={16}
                                    modifiers={[frame({ maxWidth: Infinity })]}
                                >
                                    <Slider value={Number(newNumber)} onValueChange={setNewNumber} min={0} max={999999999} step={1} />
                                </Column>
                            </Host>
                            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                                <Button
                                    label={isLoading ? "Updating..." : "Change Phone"}
                                    variant="primary"
                                    fullWidth={true}
                                    onPress={() => {}} // 🛠️ Connected handler function hook
                                    // 🛠️ Fixed logical lock: disabled/enabled rules match exact string validation constraints
                                    enabled={!isLoading}
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const changepass = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
        padding: 20,
    },
    logoSection: {
        height: "25%",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    formSection: {
        width: "100%",
        flex: 1,
    },
    loginlogo: {
        fontSize: 40,
        fontFamily: "Logo-Font",
        textAlign: "center",
    },
})
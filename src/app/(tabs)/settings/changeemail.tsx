import Button from "@/components/button";
import { Themes } from "@/constants/theme";
import { Column, FieldGroup, Host, TextInput } from "@expo/ui";
import { frame, scrollDisabled, submitLabel } from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function ChangeEmail() {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const router = useRouter();

    const [newEmail, setNewEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // 🛠️ Step 2: Handle saving logic to SecureStore
    const handleChangeEmail = async () => {
        // Clear whitespace and convert to lowercase for database/storage consistency
        const cleanEmail = newEmail.trim().toLowerCase();

        // Basic Regex Validation for Email Structure
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Error", "Please enter a valid email address.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Fetch your user profile object structure
            const savedUserDataString = await SecureStore.getItemAsync("user_account");

            let userAccount = {};
            if (savedUserDataString) {
                userAccount = JSON.parse(savedUserDataString);
            }

            // 2. Modify the target email key inside the profile block
            userAccount.email = cleanEmail;

            // 3. Save the serialized object string bundle back down to the hardware container
            await SecureStore.setItemAsync("user_account", JSON.stringify(userAccount));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            Alert.alert("Success", "Your email has been updated successfully!", [
                { text: "OK", onPress: () => router.back() } // Return to Profile / Settings
            ]);
        } catch (error) {
            console.error("SecureStore email update failure:", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Error", "Failed to update email safely. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: currentTheme.background,
            }}
            edges={["bottom", 'left', 'right']}
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
                            <Text style={[changepass.loginlogo, { color: currentTheme.text, textAlign: "center" }]}>Change Email</Text>
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
                                    <FieldGroup modifiers={[scrollDisabled()]}>
                                        <TextInput
                                            autoCorrect={false}
                                            autoCapitalize="none" // 🛠️ Keeps native interface from pushing capitals on email input
                                            placeholder="Enter New Email"
                                            value={newEmail}
                                            modifiers={[submitLabel("done")]}
                                            onChangeText={setNewEmail}
                                            keyboardType={"email-address"}
                                        />
                                    </FieldGroup>
                                </Column>
                            </Host>
                            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                                <Button
                                    label={isLoading ? "Updating..." : "Change Email"}
                                    variant="primary"
                                    fullWidth={true}
                                    onPress={handleChangeEmail} // 🛠️ Connected handler function hook
                                    // 🛠️ Fixed logical lock: disabled/enabled rules match exact string validation constraints
                                    enabled={!isLoading && newEmail.trim() !== ""}
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
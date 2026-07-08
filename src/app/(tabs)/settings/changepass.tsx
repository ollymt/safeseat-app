import { Themes } from "@/constants/theme";
import { useRouter } from "expo-router";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
    Text,
    useColorScheme,
    Alert // 🛠️ Added for validation feedback
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { submitLabel, scrollDisabled, frame } from "@expo/ui/swift-ui/modifiers";
import { TextInput, Host, FieldGroup, Column } from "@expo/ui";
import { useState } from "react";
import Button from "@/components/button";
import * as SecureStore from "expo-secure-store"; // 🛠️ Added for saving data securely
import * as Haptics from "expo-haptics";

export default function ChangePass() {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    const router = useRouter();

    // 🛠️ Step 1: Separate states for each password field
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // 🛠️ Step 2: Change Password Core Logic
    const handleChangePassword = async () => {
        // Basic Client-side Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Error", "New password and confirmation do not match.");
            return;
        }

        if (newPassword.length < 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Error", "New password must be at least 6 characters long.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Fetch user profile data string from SecureStore
            const savedUserDataString = await SecureStore.getItemAsync("user_account");

            if (savedUserDataString) {
                const userAccount = JSON.parse(savedUserDataString);

                // 2. Verify the old password matches (Assuming password key is stored inside user_account)
                // Note: If you don't store password in 'user_account', change the key to match your auth storage pattern
                if (userAccount.password && userAccount.password !== oldPassword) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    Alert.alert("Error", "The old password you entered is incorrect.");
                    setIsLoading(false);
                    return;
                }

                // 3. Update the password field value
                userAccount.password = newPassword;

                // 4. Save the stringified updated payload back into SecureStore
                await SecureStore.setItemAsync("user_account", JSON.stringify(userAccount));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                Alert.alert("Success", "Your password has been changed successfully!", [
                    { text: "OK", onPress: () => router.back() } // Go back to settings screen
                ]);
            } else {
                // Fallback case: If no user account object exists yet, we establish a new layout anchor
                const newAccount = { password: newPassword };
                await SecureStore.setItemAsync("user_account", JSON.stringify(newAccount));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                Alert.alert("Success", "Password initialized successfully!", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (error) {
            console.error("SecureStore save error:", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("Error", "Failed to update password securely. Please try again.");
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
                            <Text style={[changepass.loginlogo, { color: currentTheme.text, textAlign: "center" }]}>Change Password</Text>
                        </View>

                        <View style={changepass.formSection}>
                            <Host
                                style={{
                                    borderColor: "#000",
                                    borderWidth: 0,
                                    height: 200, // 3. Changing from flex: 0.33 to a static height blocks collapse!
                                    width: "100%",
                                }}
                            >
                                <Column
                                    spacing={16}
                                    modifiers={[frame({ maxWidth: Infinity })]}
                                >
                                    <FieldGroup modifiers={[scrollDisabled()]}>
                                        {/* 🛠️ Map each input field to its respective state function hooks */}
                                        <TextInput
                                            secureTextEntry={true}
                                            placeholder="Enter Old Password"
                                            value={oldPassword}
                                            modifiers={[submitLabel("next")]}
                                            onChangeText={setOldPassword}
                                        />
                                        <TextInput
                                            secureTextEntry={true}
                                            placeholder="Enter New Password"
                                            value={newPassword}
                                            modifiers={[submitLabel("next")]}
                                            onChangeText={setNewPassword}
                                        />
                                        <TextInput
                                            secureTextEntry={true}
                                            placeholder="Confirm New Password"
                                            value={confirmPassword}
                                            modifiers={[submitLabel("done")]}
                                            onChangeText={setConfirmPassword}
                                        />
                                    </FieldGroup>
                                </Column>
                            </Host>
                            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                                {/* 🛠️ Connect function and handle loading states */}
                                <Button
                                    label={isLoading ? "Updating..." : "Change Password"}
                                    variant="primary"
                                    fullWidth={true}
                                    onPress={handleChangePassword}
                                    enabled={!isLoading && oldPassword != "" && newPassword != "" && confirmPassword != ""}
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
        height: "25%", // Reduced slightly to give more room for keyboard space
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
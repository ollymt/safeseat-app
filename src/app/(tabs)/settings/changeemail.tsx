import Button from "@/components/button";
import SkeuoInput from "@/components/skeuo-input";
import { LinenBackground, PaperCard, Stitching } from "@/components/skeuo";
import { Materials, Themes } from "@/constants/theme";
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
            // @ts-ignore
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
        <LinenBackground>
            <SafeAreaView style={{ flex: 1 }} edges={["bottom", 'left', 'right']}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={changepass.container}>
                            <View style={changepass.logoSection}>
                                <Text style={[changepass.loginlogo, { color: currentTheme.text, textAlign: "center" }]}>Change Email</Text>
                                <Stitching color={Materials.stitchDim} style={{ borderWidth: 0, borderTopWidth: 1, width: 80, marginTop: 10, alignSelf: "center" }} />
                            </View>

                            <PaperCard style={changepass.formSection}>
                                <SkeuoInput
                                    label="New Email"
                                    placeholder="you@example.com"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    returnKeyType="done"
                                    onSubmitEditing={handleChangeEmail}
                                    onChangeText={setNewEmail}
                                />
                                <View style={{ marginTop: 20 }}>
                                    <Button
                                        label={isLoading ? "Updating..." : "Change Email"}
                                        variant="primary"
                                        fullWidth={true}
                                        onPress={handleChangeEmail}
                                        enabled={!isLoading && newEmail.trim() !== ""}
                                    />
                                </View>
                            </PaperCard>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinenBackground>
    )
}

const changepass = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
        padding: 20,
    },
    logoSection: {
        alignItems: "center",
        justifyContent: "flex-end",
        paddingVertical: 24,
    },
    formSection: {
        width: "100%",
        padding: 20,
    },
    loginlogo: {
        fontSize: 30,
        fontWeight: "800",
        textAlign: "center",
    },
})
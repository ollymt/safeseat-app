import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { useEffect, useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    Image,
} from "react-native";
import * as SecureStore from "expo-secure-store";

type ProfileCardProps = {
    name?: string;
    img?: string;
    profileId?: string; // Optional: Pass profileId if rendering sub-profiles
    isLast?: boolean;
    enabled?: boolean;
    onPress?: () => void;
};

export default function ProfileCard({
    name = "empty",
    img,
    profileId,
    isLast = false,
    enabled = true,
    onPress,
}: ProfileCardProps) {
    const [avatarUri, setAvatarUri] = useState<string>("");

    useEffect(() => {
        // 1. If an img prop was explicitly passed down, use it directly
        if (img && img !== "Not Set" && img !== "") {
            setAvatarUri(img);
            return;
        }

        // 2. Fallback to SecureStore cache
        const loadCachedAvatar = async () => {
            try {
                const cacheKey = profileId ? `profile_${profileId}` : "user_health_profile";
                const cachedHealth = await SecureStore.getItemAsync(cacheKey);

                if (cachedHealth) {
                    const parsed = JSON.parse(cachedHealth);
                    const iconVal = parsed.icon || parsed.pfp;
                    if (iconVal && iconVal !== "Not Set" && iconVal !== "") {
                        setAvatarUri(iconVal);
                    }
                }
            } catch (error) {
                console.error("Error loading cached avatar:", error);
            }
        };

        loadCachedAvatar();
    }, [img, profileId]);

    const fallbackUri = "https://pbs.twimg.com/media/C8SFjSYWAAA6452.jpg";

    // Validate URI to prevent empty strings from breaking Image component
    const isValidUri = avatarUri && avatarUri.trim().length > 0 && avatarUri !== "Not Set";
    const imageSource = isValidUri ? { uri: avatarUri } : { uri: fallbackUri };

    return (
        <Pressable
            style={[
                seatcard.baseCard,
                {
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: themes.secondaryBttn,
                    backgroundColor: themes.backgroundElement,
                    opacity: enabled ? 1 : 0.5,
                    flexDirection: "row",
                    alignItems: "center"
                }
            ]}
            onPress={onPress}
        >
            <View style={{ borderRadius: 12, overflow: "hidden" }}>
                <Image
                    source={imageSource}
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                />
            </View>

            <View style={{ justifyContent: "center", flex: 1, paddingLeft: 10 }}>
                <Text style={[seatcard.profileName, { color: themes.text }]}>{name}</Text>
            </View>
        </Pressable>
    );
}

const seatcard = StyleSheet.create({
    baseCard: {
        width: "100%",
        borderWidth: 0,
        borderColor: "#fff",
        gap: 6,
        padding: 10,
        overflow: "hidden",
    },
    profileName: {
        fontFamily: "Body-Medium",
        fontSize: 18,
    }
});
import { Themes } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import {
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
    Image,
} from "react-native";

type ProfileCardProps = {
    name?: string;
    img?: string;
    isLast?: boolean;
    enabled?: boolean;
    onPress?: () => void;
};

export default function ProfileCard({
    name = "empty",
    img,
    isLast = false,
    enabled = true,
    onPress,
}: ProfileCardProps) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    return (
        <Pressable
            style={[
                seatcard.baseCard,
                {
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: currentTheme.border,
                    opacity: enabled ? 1 : 0.5,
                    flexDirection: "row",
                    // 🌟 Align items vertically along the main row axis (keeps image and text centered together)
                    alignItems: "center"
                }
            ]}
            onPress={onPress}
        >
            <View style={{ borderRadius: 12, borderColor: "#fff", flexDirection: "row", gap: 0 }}>
                <Image source={{ uri: img }} style={{ width: 50, height: 50, borderRadius: 25 }} />
            </View>

            {/* 🛠️ Fix 1: Use justifyContent: "center" instead of alignContent */}
            <View style={{ justifyContent: "center", flex: 1, paddingLeft: 10 }}>
                <Text style={[seatcard.profileName, { color: currentTheme.text }]}>{name}</Text>
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
        // 🛠️ Fix 2: Removed "flex: 1" from here so the text doesn't stretch and distort alignment bounds
    }
});
import { Materials, Themes } from "@/constants/theme";
import { Image, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { PaperCard } from "@/components/skeuo";

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
    enabled = true,
    onPress,
}: ProfileCardProps) {
    const colorScheme = useColorScheme();
    const activeScheme = colorScheme === "dark" ? "dark" : "light";
    const currentTheme = Themes[activeScheme];

    return (
        <Pressable onPress={onPress} disabled={!enabled} style={{ opacity: enabled ? 1 : 0.5 }}>
            <PaperCard style={seatcard.baseCard}>
                <View style={seatcard.frame}>
                    {img ? (
                        <Image source={{ uri: img }} style={seatcard.avatar} />
                    ) : (
                        <View style={[seatcard.avatar, seatcard.fallback]}>
                            <Text style={seatcard.monogram}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                </View>

                <View style={{ justifyContent: "center", flex: 1, paddingLeft: 12 }}>
                    <Text style={[seatcard.profileName, { color: currentTheme.text }]}>{name}</Text>
                </View>
            </PaperCard>
        </Pressable>
    );
}

const seatcard = StyleSheet.create({
    baseCard: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
    },
    frame: {
        padding: 3,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: Materials.brassMid,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    fallback: {
        backgroundColor: Materials.leatherMid,
        alignItems: "center",
        justifyContent: "center",
    },
    monogram: {
        color: "#F1E3C6",
        fontSize: 18,
        fontWeight: "800",
    },
    profileName: {
        fontSize: 18,
        fontWeight: "700",
    },
});
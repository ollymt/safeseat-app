import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { Host, Icon } from "@expo/ui";
import {
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

type InfoCardProps = {
    smolTopText?: string;
    smolBottomText?: string;
    bigText?: string;
    icon?: any;
};

export default function InfoCard({
    smolTopText,
    smolBottomText,
    bigText = "big text",
    icon,
}: InfoCardProps) {
    return (
        <View
            style={[
                seatcard.baseCard,
            ]}
        >
            <View
                style={[
                    seatcard.leftArea,
                ]}
            >
                {icon}
            </View>
            <View
                style={{
                    paddingVertical: spacing.two,
                    flex: 1,
                    borderWidth: spacing.none,
                    borderColor: "#fff",
                }}
            >
                {smolTopText &&
                    <Text
                        style={ seatcard.role }
                    >
                        {smolTopText}
                    </Text>
                }

                <Text style={ seatcard.name }>
                    {bigText}
                </Text>

                {smolBottomText &&
                    <Text
                        style={ seatcard.role }
                    >
                        {smolBottomText}
                    </Text>
                }

            </View>
            
        </View>
    );
}

const seatcard = StyleSheet.create({
    baseCard: {
        width: "100%",
        borderWidth: spacing.quarter,
        borderColor: themes.secondaryBttn,
        flexDirection: "row",
        gap: spacing.one,
        borderRadius: spacing.edge,
        overflow: "hidden",
        padding: spacing.quarter,
        minHeight: spacing.ten,
        backgroundColor: themes.backgroundElement,

    },
    seatNoCont: {
        width: "15%",
        alignItems: "center",
        justifyContent: "center",
    },
    leftArea: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: spacing.seven,
        borderTopLeftRadius: spacing.one,
        borderTopRightRadius: spacing.quarter,
        borderBottomLeftRadius: spacing.one,
        borderBottomRightRadius: spacing.quarter,
        backgroundColor: themes.secondaryBttn,
    },
    name: {
        fontSize: fontsize.header,
        fontFamily: "Body-Bold",
        color: themes.text,
    },
    stateName: {
        fontSize: fontsize.body,
        fontFamily: "Body-Bold",
    },
    role: {
        fontSize: fontsize.caption,
        fontFamily: "Body-Bold",
        color: themes.textSecondary
    },
    emptySeat: {
        opacity: 0.5,
    },
});

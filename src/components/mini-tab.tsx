import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { StyleSheet, View, Text, Pressable, ViewStyle } from "react-native";

type MiniTabProps = {
    values: string[];
    selectedIndex: number;
    onChange: (index: number) => void;
    style?: ViewStyle
};

export default function MiniTab({
    values,
    selectedIndex,
    onChange,
    style
}: MiniTabProps) {
    return (
        <View style={[styles.container, style]}>
            {values.map((item, index) => {
                const isSelected = selectedIndex === index;
                return (
                    <Pressable
                        key={`${item}-${index}`}
                        style={[
                            styles.tab,
                            isSelected && styles.selectedTab,
                        ]}
                        onPress={() => onChange?.(index)}
                    >
                        <Text
                            style={[
                                styles.text,
                                isSelected && styles.selectedText,
                            ]}
                        >
                            {item}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        backgroundColor: themes.secondaryBttn ?? "#f0f0f0",
        borderRadius: spacing.edge,
        overflow: "hidden"
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.one,
        paddingHorizontal: spacing.two,
        alignItems: "center",
        justifyContent: "center",
    },
    selectedTab: {
        backgroundColor: themes.primaryBttn,
    },
    text: {
        fontSize: fontsize.button,
        color: themes.text,
        fontFamily: "Body-Regular"
    },
    selectedText: {
        color: themes.primaryBttnText,
        fontFamily: "Body-Bold",
    },
});
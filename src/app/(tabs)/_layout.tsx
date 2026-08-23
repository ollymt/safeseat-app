import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { withLayoutContext } from 'expo-router';
import {
	createMaterialTopTabNavigator,
} from 'expo-router/js-top-tabs';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Icon, Host } from '@expo/ui'; // Import Icon from expo-ui

const { Navigator } = createMaterialTopTabNavigator();
const Tabs = withLayoutContext<any, any, any, any>(Navigator);

function MyCustomTabBar({ state, descriptors, navigation }: any) {
	return (
		<View style={styles.tabContainer}>
			<View style={styles.tabDrawer}>
				{state.routes.map((route: any, index: number) => {
					const isFocused = state.index === index;
					const { options } = descriptors[route.key];
					const label = options.title ?? route.name;

					// Extract the icon component from options
					const renderIcon = options.tabBarIcon;

					return (
						<Pressable
							key={route.key}
							onPress={() => navigation.navigate(route.name)}
							style={[styles.tabButton]}
						>
							{/* Render icon if defined */}
							{renderIcon && renderIcon({
								focused: isFocused,
								color: isFocused ? themes.text : themes.primaryBttn,
								size: spacing.three,
							})}
							<Text style={[styles.label, isFocused && styles.activeLabel]}>
								{label.charAt(0).toUpperCase() + label.slice(1)}
							</Text>

							<View style={{ width: spacing.two, height: spacing.half, backgroundColor: isFocused ? themes.primaryBttn : themes.backgroundElement, borderRadius: spacing.quarter}}/>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

export default function TabLayout() {
	return (
		<Tabs
			tabBarPosition="bottom"
			// @ts-ignore
			tabBar={(props) => <MyCustomTabBar {...props} />}
		>
			<Tabs.Screen
				name="home"
				options={{
					title: 'Home',
					tabBarIcon: ({ focused }: { focused: boolean }) => (
						<Host matchContents>
							<Icon
								name={Icon.select({
									ios: focused ? "house.fill" : "house",
									android: import("@expo/material-symbols/home.xml")
								})}
								size={spacing.three}
								color={focused ? themes.primaryBttn : themes.primaryBttnText}
							/>
						</Host>
					),
				}}
			/>
			<Tabs.Screen
				name="assign"
				options={{
					title: 'Assign',
					tabBarIcon: ({ focused }: { focused: boolean }) => (
						<Host matchContents>
							<Icon
								name={Icon.select({
									ios: focused ? "carseat.right.fill" : "carseat.right",
									android: import("@expo/material-symbols/airline_seat_recline_extra.xml")
								})}
								size={spacing.three}
								color={focused ? themes.primaryBttn : themes.primaryBttnText}
							/>
						</Host>
					),
				}}
			/>
			<Tabs.Screen
				name="everyone"
				options={{
					title: 'Everyone',
					tabBarIcon: ({ focused }: { focused: boolean }) => (
						<Host matchContents>
							<Icon
								name={Icon.select({
									ios: focused ? "person.3.fill" : "person.3",
									android: import("@expo/material-symbols/groups.xml")
								})}
								size={spacing.three}
								color={focused ? themes.primaryBttn : themes.primaryBttnText}
							/>
						</Host>
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: 'Settings',
					tabBarIcon: ({ focused }: { focused: boolean }) => (
						<Host matchContents>
							<Icon
								name={Icon.select({
									ios: focused ? "gearshape.fill" : "gearshape",
									android: import("@expo/material-symbols/settings.xml")
								})}
								size={spacing.three}
								color={focused ? themes.primaryBttn : themes.primaryBttnText}
							/>
						</Host>
					),
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	tabContainer: {
		flexDirection: "row",
		backgroundColor: "transparent",
		paddingVertical: spacing.none,
		paddingHorizontal: spacing.two,
		justifyContent: "space-around",
		alignItems: "center",
		height: 112,
		position: "absolute",
		bottom: -spacing.one,
	},
	tabButton: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: spacing.one,
		borderRadius: spacing.half,
		height: 96,
		gap: 4,
	},
	focusedButton: {
		backgroundColor: themes.primaryBttn,
	},
	label: {
		color: themes.text,
		fontSize: fontsize.button,
	},
	activeLabel: {
		color: themes.primaryBttn,
		fontWeight: "bold",
	},
	tabDrawer: {
		borderWidth: spacing.quarter,
		borderBottomWidth: spacing.none,
		borderTopLeftRadius: spacing.edge,
		borderTopRightRadius: spacing.edge,
		borderColor: themes.secondaryBttn,
		padding: spacing.none,
		width: "100%",
		height: 112,
		flexDirection: "row",
		backgroundColor: themes.backgroundElement
	},
});
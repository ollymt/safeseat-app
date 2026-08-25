import { Themes as themes, Spacing as spacing, FontSize as fontsize } from "@/constants/theme";
import { withLayoutContext, router, usePathname } from 'expo-router';
import { createMaterialTopTabNavigator } from 'expo-router/js-top-tabs';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useEffect } from "react";
import { Icon, Host } from '@expo/ui';

import * as Haptics from "expo-haptics";

const { Navigator } = createMaterialTopTabNavigator();
const Tabs = withLayoutContext<any, any, any, any>(Navigator);

function MyCustomTabBar({ state, descriptors, navigation }: any) {
	useEffect(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
	}, [state.index])
	return (
		<View style={styles.tabContainer}>
			<View style={styles.tabDrawer}>
				{state.routes.map((route: any, index: number) => {
					const isFocused = state.index === index;
					const { options } = descriptors[route.key];
					const label = options.title ?? route.name;

					const renderIcon = options.tabBarIcon;

					const handlePress = () => {
						const event = navigation.emit({
							type: 'tabPress',
							target: route.key,
							canPreventDefault: true,
						});

						if (isFocused) {
							// Option 1: Attempt to dismiss nested stack screens back to tab root
							try {
								router.dismissAll();
							} catch {
								// Option 2: Fallback to navigating directly to the root screen path
								// @ts-ignore
								router.navigate(`/(tabs)/${route.name}`);
							}
						} else if (!event.defaultPrevented) {
							navigation.navigate(route.name);
						}
					};

					return (
						<Pressable
							key={route.key}
							onPress={handlePress}
							style={[styles.tabButton]}
						>
							{renderIcon && renderIcon({
								focused: isFocused,
								color: isFocused ? themes.text : themes.primaryBttn,
								size: spacing.three,
							})}
							<Text style={[styles.label, isFocused && styles.activeLabel]}>
								{label.charAt(0).toUpperCase() + label.slice(1)}
							</Text>

							<View style={{ width: spacing.two, height: spacing.half, backgroundColor: isFocused ? themes.primaryBttn : themes.backgroundElement, borderRadius: spacing.quarter }} />
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

export default function TabLayout() {
	const pathname = usePathname();

	// Check if user is on a nested screen inside a tab (path length > 2 parts)
	const isNestedScreen = pathname.split('/').filter(Boolean).length > 1;

	return (
		<Tabs
			tabBarPosition="bottom"
			// @ts-ignore
			tabBar={(props) => <MyCustomTabBar {...props} />}
			screenOptions={{
				// Disable tab swipe only when pushed deeper into a stack
				swipeEnabled: !isNestedScreen,
				headerShown: false,
				// Forces the tab view container frame to be dark
				sceneContainerStyle: {
					backgroundColor: themes.background,
				},
				tabBarStyle: {
					backgroundColor: themes.backgroundElement,
					borderTopColor: "transparent",
				},

			}}
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
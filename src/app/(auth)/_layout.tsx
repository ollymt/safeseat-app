import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true, // Keep the header system alive...
        headerTransparent: true, // ...but make it completely invisible!
        title: "", // Erase the text title completely
        headerTintColor: "#000000", // The color of your floating back arrow (e.g., black)
        headerShadowVisible: false, // Removes any potential bottom border lines
        animation: "slide_from_right",
      }}
    >
      {/* The login screen will be the default page here */}
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}

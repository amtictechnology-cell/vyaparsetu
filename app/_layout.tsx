import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="information" />
      <Stack.Screen name="home" />
      <Stack.Screen name="Drivermanagment" />
      <Stack.Screen name="staffmanagment" />
      <Stack.Screen name="regularcustomer" />
      <Stack.Screen name="khatabook" />
      <Stack.Screen name="bookingrooms" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
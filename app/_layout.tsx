import { Stack, usePathname, useRouter } from "expo-router";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide footer on authentication screens
  const hideFooterRoutes = ["/", "/signup", "/otp", "/information", "/plans"];
  const showFooter = !hideFooterRoutes.includes(pathname);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="information" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="home" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="trackrecord" />
      <Stack.Screen name="additem" />
      <Stack.Screen name="Drivermanagment" />
      <Stack.Screen name="staffmanagment" />
      <Stack.Screen name="staffprofile" />
      <Stack.Screen name="billgenerate" />
      <Stack.Screen name="khatabook" />
      <Stack.Screen name="bookingrooms" />
      <Stack.Screen name="(tabs)" />
        </Stack>
      </View>

      {showFooter && (
        <View style={styles.footer}>
          {pathname.startsWith("/supplier") ? (
            <>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/supplier" as any)}>
                <Ionicons name="home" size={24} color={pathname === "/supplier" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/supplier" ? "#ff6600" : "#666" }]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/supplier/settings" as any)}>
                <Ionicons name="settings-outline" size={24} color={pathname === "/supplier/settings" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/supplier/settings" ? "#ff6600" : "#666" }]}>Settings</Text>
              </TouchableOpacity>
            </>
          ) : pathname.startsWith("/builder") ? (
            <>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/builder" as any)}>
                <Ionicons name="home" size={24} color={pathname === "/builder" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/builder" ? "#ff6600" : "#666" }]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/builder/settings" as any)}>
                <Ionicons name="settings-outline" size={24} color={pathname === "/builder/settings" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/builder/settings" ? "#ff6600" : "#666" }]}>Settings</Text>
              </TouchableOpacity>
            </>
          ) : pathname.startsWith("/Shop") || pathname.startsWith("/shop") ? (
            <>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/Shop" as any)}>
                <Ionicons name="home" size={24} color={pathname.toLowerCase() === "/shop" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname.toLowerCase() === "/shop" ? "#ff6600" : "#666" }]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/Shop/settings" as any)}>
                <Ionicons name="settings-outline" size={24} color={pathname.toLowerCase() === "/shop/settings" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname.toLowerCase() === "/shop/settings" ? "#ff6600" : "#666" }]}>Settings</Text>
              </TouchableOpacity>
            </>
          ) : pathname.startsWith("/printing") ? (
            <>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/printing" as any)}>
                <Ionicons name="home" size={24} color={pathname === "/printing" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/printing" ? "#ff6600" : "#666" }]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/printing/settings" as any)}>
                <Ionicons name="settings-outline" size={24} color={pathname === "/printing/settings" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/printing/settings" ? "#ff6600" : "#666" }]}>Settings</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Default Hotel Footer
            <>
              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/home")}>
                <Ionicons name="home" size={24} color={pathname === "/home" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/home" ? "#ff6600" : "#666" }]}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/offer" as any)}>
                <Ionicons name="pricetag-outline" size={24} color={pathname === "/offer" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/offer" ? "#ff6600" : "#666" }]}>Offers</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/settings")}>
                <Ionicons name="settings-outline" size={24} color={pathname === "/settings" ? "#ff6600" : "#666"} />
                <Text style={[styles.footerTabText, { color: pathname === "/settings" ? "#ff6600" : "#666" }]}>Settings</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  footerTabText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

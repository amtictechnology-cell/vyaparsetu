import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function LandingPage() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const router = useRouter();

  useEffect(() => {
    // Parallel Animation: Fade + Scale Spring
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const checkLoginStatus = async () => {
      // Wait 3 seconds so the landing page animation can finish
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        const token = await AsyncStorage.getItem("userToken");

        if (!token) {
          router.replace("/signup");
          return;
        }

        const response = await fetch("http://192.168.31.192:6000/api/v1/user/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          router.replace("/signup");
          return;
        }

        const data = await response.json();

        if (data?.user) {
          const category = (data.user.businessCategory || "").toLowerCase();

          if (category === "shop") {
            router.replace("/Shop" as any);
          }
          else if (category === "supplier" || category === "suppliers") {
            router.replace("/supplier" as any);
          }
          else if (category) {
            router.replace("/home" as any);
          }
          else {
            // Token is valid, but profile is incomplete
            router.replace({ pathname: "/information", params: { userId: data.user.userId } } as any);
          }
        } else {
          router.replace("/signup");
        }
      } catch (error) {
        console.log("Auto login error:", error);
        router.replace("/signup");
      }
    };
    checkLoginStatus();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Animated.Text style={styles.text}>
          <Animated.Text style={styles.vyaparText}>Vyapar</Animated.Text>
          <Animated.Text style={styles.setuText}>Setu</Animated.Text>
        </Animated.Text>
        <Animated.Text style={styles.tagline}>
          Digital Solution for Your Business
        </Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.bottomContainer, { opacity: fadeAnim }]}>
        <Animated.Text style={styles.bottomText}>
          100% Bhartiya brand 🇮🇳
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffb703",
  },
  mainContent: {
    alignItems: "center",
  },
  text: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
  },
  vyaparText: {
    color: "#000000",
  },
  setuText: {
    color: "#0c831f",
  },
  tagline: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e1e1e",
    marginTop: -4,
    opacity: 0.8,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  bottomText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e1e1e",
    letterSpacing: 0.5,
  },
});

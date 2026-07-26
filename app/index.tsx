import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ImageBackground } from "react-native";
import { BASE_URL } from "../constants/Config";

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
        const isSubscribed = await AsyncStorage.getItem("isSubscribed");

        if (!token) {
          router.replace("/signup");
          return;
        }

        const response = await fetch(`${BASE_URL}/user/profile`, {
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
        const user = data?.user;

        if (user) {
          const category = (user.businessCategory || "").toLowerCase();

          if (!category) {
            // Token is valid, but profile is incomplete
            router.replace({ pathname: "/information", params: { userId: user.userId } } as any);
          } else if (isSubscribed !== "true") {
            // Profile complete but plan not selected
            router.replace("/plans" as any);
          } else if (category === "shop") {
            router.replace("/Shop" as any);
          } else if (category === "supplier" || category === "suppliers") {
            router.replace("/supplier" as any);
          } else if (category === "printing") {
            router.replace("/printing" as any);
          } else if (category === "builder") {
            router.replace("/builder" as any);
          } else {
            router.replace("/home" as any);
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
    <ImageBackground 
      source={require("../assets/images/bg.png")} 
      style={styles.container}
      resizeMode="cover"
    >
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
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
    color: "#0059ff",
  },
  setuText: {
    color: "#ff6600",
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


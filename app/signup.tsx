import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
} from "react-native";
import { BASE_URL } from "../constants/Config";

export default function SignupScreen() {
  const [mobile, setMobile] = useState("");
  const router = useRouter();

  const handleMobileChange = (text: string) => {
    // Only allow numbers and max 10 digits
    const formatted = text.replace(/[^0-9]/g, "");
    if (formatted.length <= 10) {
      setMobile(formatted);
      if (formatted.length === 10) {
      }
    }
  };

  const handleContinue = async () => {
    if (mobile.length === 10) {
      try {
        const response = await fetch(`${BASE_URL}/auth/send/otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mobileNo: mobile }),
        });

        if (response.ok) {
          router.push({ pathname: "/otp", params: { mobile } });
        } else {
          Alert.alert("Error", "Failed to signup. Please try again.");
        }
      } catch (error) {
        console.error("Signup error:", error);
        Alert.alert("Error", "Network error. Please try again later.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/images/login.png')}
              style={styles.loginImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Atithi</Text>
            <Text style={styles.subtitle}>{"India's No. 1 Business App"}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>Enter your mobile number to proceed</Text>

            <View style={styles.inputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={handleMobileChange}
                maxLength={10}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, mobile.length === 10 ? styles.buttonActive : styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={mobile.length !== 10}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you agree to our{"\n"}
                <Text style={styles.link}>Terms of Service</Text> & <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  loginImage: {
    width: 320,
    height: 320,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    color: "#ff6600",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: "#444",
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 40,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  cardSubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 28,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e8eaed",
    borderRadius: 16,
    marginBottom: 28,
    height: 60,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  countryCode: {
    paddingHorizontal: 16,
    backgroundColor: "#f5f7fa",
    height: "100%",
    justifyContent: "center",
    borderRightWidth: 1.5,
    borderRightColor: "#e8eaed",
  },
  countryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e1e1e",
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 16,
    color: "#1e1e1e",
  },
  button: {
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
  },
  buttonActive: {
    backgroundColor: "#ff6600",
    shadowColor: "#ff6600",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: "#e0e0e0",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
  link: {
    color: "#ff6600",
    fontWeight: "700",
  },
});

import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
        const response = await fetch("http://192.168.31.192:6000/api/v1/auth/send/otp", {
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
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Vyapar<Text style={styles.greenText}>Setu</Text></Text>
          <Text style={styles.subtitle}>India's No. 1 Business App</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login or Signup</Text>
          <Text style={styles.cardSubtitle}>Enter your mobile number to proceed</Text>

          <View style={styles.inputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
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
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{"\n"}
            <Text style={styles.link}>Terms of Service</Text> & <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffb703",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#000",
    letterSpacing: -1,
  },
  greenText: {
    color: "#0c831f",
  },
  subtitle: {
    fontSize: 14,
    color: "#1e1e1e",
    fontWeight: "600",
    marginTop: -5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 24,
    height: 56,
    overflow: "hidden",
  },
  countryCode: {
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    height: "100%",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  countryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    color: "#000",
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ccc",
  },
  buttonActive: {
    backgroundColor: "#0c831f",
  },
  buttonDisabled: {
    backgroundColor: "#a0a0a0",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    lineHeight: 18,
  },
  link: {
    color: "#0c831f",
    fontWeight: "700",
  },
});

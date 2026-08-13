import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
} from "react-native";
import { BASE_URL } from "../constants/Config";

export default function OTPScreen() {
  const { mobile } = useLocalSearchParams<{ mobile: string }>();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const router = useRouter();

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length === 4) {
      try {
        const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mobileNo: mobile, otpCode: enteredOtp }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data?.token) {
            await AsyncStorage.setItem("userToken", data.token);
          }

          const user = data?.user;
          if (user) {
            const category = (user.businessCategory || "").toLowerCase();

            if (!category) {
              router.replace({ pathname: "/information", params: { userId: user.userId } } as any);
            } else {
              // Check API response for active subscription, fallback to local storage
              let hasActivePlan = false;
              if (user.activeSubscription && user.activeSubscription.status === 'active') {
                hasActivePlan = true;
                await AsyncStorage.setItem("isSubscribed", "true");
              } else {
                const isSubscribedLocal = await AsyncStorage.getItem("isSubscribed");
                hasActivePlan = isSubscribedLocal === "true";
              }

              if (hasActivePlan) {
                if (category === "shop") {
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
                router.replace("/plans" as any);
              }
            }
          } else {
            router.replace("/signup");
          }
        } else {
          Alert.alert("Invalid OTP", data.message || "Please enter the correct OTP.");
        }
      } catch (error) {
        console.error("OTP verification error:", error);
        Alert.alert("Error", "Network error. Please try again later.");
      }
    } else {
      Alert.alert("Invalid OTP", "Please enter a 4-digit OTP.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/images/otp.png')}
            style={styles.otpImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the code sent to <Text style={styles.mobileText}>+91 {mobile}</Text>
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.changeNumberButton}>
            <Text style={styles.changeNumberText}>Change Number</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              autoFocus={index === 0}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          <Text style={styles.buttonText}>Verify & Proceed</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>{"Didn't receive code? "}<Text style={styles.resendLink}>Resend</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "flex-start",
    paddingTop: 0,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 0,
  },
  otpImage: {
    width: 320,
    height: 320,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  mobileText: {
    fontWeight: "700",
    color: "#1e1e1e",
  },
  changeNumberButton: {
    marginTop: 8,
  },
  changeNumberText: {
    color: "#0059ff",
    fontSize: 15,
    fontWeight: "700",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  otpInput: {
    width: 65,
    height: 65,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 16,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: "#000",
    backgroundColor: "#f9f9f9",
  },
  button: {
    height: 56,
    backgroundColor: "#ff6600",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  resendButton: {
    marginTop: 24,
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    color: "#666",
  },
  resendLink: {
    color: "#0059ff",
    fontWeight: "700",
  },
});

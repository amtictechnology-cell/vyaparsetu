import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
        const response = await fetch("http://192.168.31.192:6000/api/v1/auth/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mobileNo: mobile, otpCode: enteredOtp }),
        });

        const data = await response.json();

        if (response.ok) {
          let routed = false;

          if (data?.token) {
            await AsyncStorage.setItem("userToken", data.token);

            // Fetch profile using token to accurately check if user is new or existing
            try {
              const profileRes = await fetch("http://192.168.31.192:6000/api/v1/user/profile", {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${data.token}`,
                },
              });

              if (profileRes.ok) {
                const profileData = await profileRes.json();
                const user = profileData?.user;

                if (user) {
                  const category = (user.businessCategory || "").toLowerCase();
                  
                  if (category === "shop") {
                    router.replace("/Shop" as any);
                    routed = true;
                  } else if (category === "supplier" || category === "suppliers") {
                    router.replace("/Supplier" as any);
                    routed = true;
                  } else if (category) {
                    router.replace("/home" as any);
                    routed = true;
                  } else {
                    router.replace({ pathname: "/information", params: { userId: user.userId } } as any);
                    routed = true;
                  }
                }
              }
            } catch (err) {
              console.error("Profile check after OTP error:", err);
            }
          }
          
          if (!routed) {
            // Fallback logic if profile fetch fails
            if (data?.user?.isProfileCompleted || data?.user?.businessCategory) {
              const category = (data.user?.businessCategory || "").toLowerCase();
              if (category === "shop") {
                router.replace("/Shop" as any);
              } else if (category === "supplier" || category === "suppliers") {
                router.replace("/Supplier" as any);
              } else {
                router.replace("/home" as any);
              }
            } else {
              router.replace({ pathname: "/information", params: { userId: data?.user?.userId } } as any);
            }
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
        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>Enter the code sent to your mobile</Text>
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
          <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendLink}>Resend</Text></Text>
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
    justifyContent: "center",
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
    backgroundColor: "#0c831f",
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
    color: "#0c831f",
    fontWeight: "700",
  },
});

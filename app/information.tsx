import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const CATEGORIES = ["Hotel", "Shop", "Supplier"];

export default function InformationScreen() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const handleStart = async () => {
    if (name && businessName && category) {
      try {
        const apiCategory = category.toLowerCase() === "supplier" ? "supplier" : category.toLowerCase();

        const response = await fetch("http://192.168.31.192:6000/api/v1/user/complete-profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId || "",
            businessCategory: apiCategory,
            name,
            businessName
          }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data?.token) {
            await AsyncStorage.setItem("userToken", data.token);
          }
          const finalCategory = (data?.user?.businessCategory || apiCategory).toLowerCase();
          if (finalCategory === "shop") {
            router.replace("/Shop" as any);
          } else if (finalCategory === "supplier" || finalCategory === "suppliers") {
            router.replace("/supplier" as any);
          } else {
            router.replace("/home" as any);
          }
        } else {
          Alert.alert("Error", data.message || "Failed to complete profile");
        }
      } catch (error) {
        console.error("Profile completion error:", error);
        Alert.alert("Error", "Network error. Please try again later.");
      }
    }
  };

  const isFormValid = name.trim() && businessName.trim() && category;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Help us set up your business account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter business name"
                placeholderTextColor="#999"
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Category</Text>
              <View style={styles.categoryContainer}>
                {CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.categoryChip,
                      category === item && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === item && styles.categoryTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                isFormValid ? styles.buttonActive : styles.buttonDisabled,
              ]}
              onPress={handleStart}
              disabled={!isFormValid}
            >
              <Text style={styles.buttonText}>Save & Start Exploring</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    backgroundColor: "#fcfcfc",
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#eee",
    backgroundColor: "#fff",
    flex: 1,
    alignItems: "center",
  },
  categoryChipActive: {
    backgroundColor: "#0c831f",
    borderColor: "#0c831f",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  categoryTextActive: {
    color: "#fff",
  },
  button: {
    height: 58,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  buttonActive: {
    backgroundColor: "#0c831f",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});

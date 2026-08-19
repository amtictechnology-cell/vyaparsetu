import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { BASE_URL } from "../constants/Config";
import { FontAwesome6 } from '@expo/vector-icons';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CATEGORIES = [
  { name: "Hotel", icon: "hotel" },
  { name: "Shop", icon: "shop" },
  { name: "Supplier", icon: "truck" },
  { name: "Printing", icon: "print" },
  { name: "Builder", icon: "person-digging" }
];

export default function CategorySelectScreen() {
  const [category, setCategory] = useState("");
  const router = useRouter();
  const { userId, name, businessName } = useLocalSearchParams<{ userId?: string, name?: string, businessName?: string }>();

  const handleStart = async () => {
    if (category) {
      try {
        const apiCategory = category.toLowerCase() === "supplier" ? "supplier" : category.toLowerCase();

        const response = await fetch(`${BASE_URL}/user/complete-profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId || "",
            businessCategory: apiCategory,
            name: name || "",
            businessName: businessName || ""
          }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data?.token) {
            await AsyncStorage.setItem("userToken", data.token);
          }
          const finalCategory = (data?.user?.businessCategory || apiCategory).toLowerCase().trim();
          const isSubscribed = await AsyncStorage.getItem("isSubscribed");
          if (isSubscribed === "true") {
            if (finalCategory === "shop") {
              router.replace("/Shop" as any);
            } else if (finalCategory === "supplier" || finalCategory === "suppliers") {
              router.replace("/supplier" as any);
            } else if (finalCategory === "printing") {
              router.replace("/printing" as any);
            } else if (finalCategory === "builder") {
              router.replace("/builder" as any);
            } else {
              router.replace("/home" as any);
            }
          } else {
            router.replace("/plans" as any);
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

  const isFormValid = !!category;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Select <Text style={{ color: "#ff6600" }}>Category</Text></Text>
            <Text style={styles.subtitle}>What kind of business do you run?</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Category</Text>
              <View style={styles.categoryContainer}>
                {CATEGORIES.map((item) => {
                  const isActive = category === item.name;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.categoryChip,
                        isActive && styles.categoryChipActive,
                      ]}
                      onPress={() => setCategory(item.name)}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          isActive && styles.categoryTextActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <FontAwesome6 
                        name={item.icon as any} 
                        size={20} 
                        color={isActive ? "#fff" : "#ff6600"} 
                      />
                    </TouchableOpacity>
                  );
                })}
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
  categoryContainer: {
    flexDirection: "column",
    gap: 12,
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ff6600",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryChipActive: {
    backgroundColor: "#ff6600",
    borderColor: "#ff6600",
  },
  categoryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ff6600",
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
    backgroundColor: "#ff6600",
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

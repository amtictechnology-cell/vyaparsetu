import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function InformationScreen() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const handleContinue = () => {
    if (name.trim() && businessName.trim()) {
      router.push({
        pathname: "/category-select",
        params: {
          userId: userId || "",
          name: name.trim(),
          businessName: businessName.trim()
        }
      });
    }
  };

  const isFormValid = name.trim() && businessName.trim();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your <Text style={{ color: "#ff6600" }}>Profile</Text></Text>
            <Text style={styles.subtitle}>Help us set up your business account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={[styles.input, name.trim().length > 0 && { borderColor: "#ff6600" }]}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name</Text>
              <TextInput
                style={[styles.input, businessName.trim().length > 0 && { borderColor: "#ff6600" }]}
                placeholder="Enter business name"
                placeholderTextColor="#999"
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                isFormValid ? styles.buttonActive : styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!isFormValid}
            >
              <Text style={styles.buttonText}>Continue</Text>
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

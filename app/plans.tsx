import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { SERVER_URL } from "../constants/Config";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";



interface Plan {
  planId: string;
  name: string;
  category: string;
  price: number;
  durationInDays: number;
  features: string[];
  description: string;
  status: string;
}

export default function PlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        router.replace("/signup");
        return;
      }

      // Fetch plans from backend using JWT token for category inference
      const response = await fetch(`${SERVER_URL}/api/v1/plans/app/my-plans`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const fetchedPlans = data.data || [];
        setPlans(fetchedPlans);
        if (fetchedPlans.length > 0) {
          setCategory(fetchedPlans[0].category);
        } else {
          // No plans found in this category - set subscribed bypass and route directly to dashboard
          await AsyncStorage.setItem("isSubscribed", "true");

          const profileResponse = await fetch(`${SERVER_URL}/api/v1/user/profile`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const profileData = await profileResponse.json();

          if (profileResponse.ok && profileData.user) {
            const userCategory = (profileData.user.businessCategory || "").toLowerCase().trim();
            if (userCategory === "shop") {
              router.replace("/Shop" as any);
            } else if (userCategory === "supplier" || userCategory === "suppliers") {
              router.replace("/supplier" as any);
            } else if (userCategory === "printing") {
              router.replace("/printing" as any);
            } else if (userCategory === "builder") {
              router.replace("/builder" as any);
            } else {
              router.replace("/home" as any);
            }
          } else {
            router.replace("/home" as any);
          }
          return;
        }
      } else {
        Alert.alert("Error", data.message || "Failed to fetch plans.");
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      Alert.alert("Network Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
  };

  const handleProceed = async () => {
    if (!selectedPlanId) {
      Alert.alert("Select Plan", "Please select a plan to proceed.");
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        router.replace("/signup");
        return;
      }

      // 1. Activate subscription in database
      const subscribeResponse = await fetch(`${SERVER_URL}/api/v1/plans/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: selectedPlanId }),
      });

      const subscribeData = await subscribeResponse.json();

      if (!subscribeResponse.ok) {
        Alert.alert("Subscription Failed", subscribeData.message || "Failed to activate subscription.");
        return;
      }

      // 2. Mark as subscribed in local storage
      await AsyncStorage.setItem("isSubscribed", "true");
      await AsyncStorage.setItem("selectedPlanId", selectedPlanId);
      
      const chosenPlan = plans.find((p) => p.planId === selectedPlanId);
      if (chosenPlan) {
        await AsyncStorage.setItem("selectedPlan", JSON.stringify(chosenPlan));
        await AsyncStorage.setItem("planActivatedAt", new Date().toISOString());
      }

      // 2. Fetch profile to know where to redirect
      const profileResponse = await fetch(`${SERVER_URL}/api/v1/user/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const profileData = await profileResponse.json();

      if (profileResponse.ok && profileData.user) {
        const userCategory = (profileData.user.businessCategory || "").toLowerCase().trim();
        
        if (userCategory === "shop") {
          router.replace("/Shop" as any);
        } else if (userCategory === "supplier" || userCategory === "suppliers") {
          router.replace("/supplier" as any);
        } else if (userCategory === "printing") {
          router.replace("/printing" as any);
        } else if (userCategory === "builder") {
          router.replace("/builder" as any);
        } else {
          router.replace("/home" as any);
        }
      } else {
        // Fallback redirection based on plans category if profile call fails
        const fallbackCat = category.toLowerCase();
        if (fallbackCat === "shop") {
          router.replace("/Shop" as any);
        } else if (fallbackCat === "supplier" || fallbackCat === "suppliers") {
          router.replace("/supplier" as any);
        } else if (fallbackCat === "printing") {
          router.replace("/printing" as any);
        } else if (fallbackCat === "builder") {
          router.replace("/builder" as any);
        } else {
          router.replace("/home" as any);
        }
      }
    } catch (error) {
      console.error("Error activating plan:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0c831f" />
        <Text style={styles.loadingText}>Fetching available plans...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vyapar Setu Plans</Text>
        <Text style={styles.headerSubtitle}>
          Choose a plan that fits your business needs.
        </Text>
        {category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              Category: {category.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={styles.noPlansContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#999" />
            <Text style={styles.noPlansText}>No plans available for this category.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPlans}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map((plan) => {
            const isSelected = selectedPlanId === plan.planId;
            return (
              <TouchableOpacity
                key={plan.planId}
                activeOpacity={0.8}
                style={[
                  styles.planCard,
                  isSelected && styles.planCardSelected,
                ]}
                onPress={() => handleSelectPlan(plan.planId)}
              >
                {/* Recommended Badge */}
                {plan.planId.toLowerCase().includes("gold") && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>RECOMMENDED</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>
                  <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                    {isSelected && <View style={styles.radioButtonInner} />}
                  </View>
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.duration}>/{plan.durationInDays} Days</Text>
                </View>

                <View style={styles.divider} />

                {/* Plan Features */}
                <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>Included Features</Text>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <View style={styles.checkIconWrapper}>
                        <Ionicons name="checkmark" size={12} color="#0c831f" style={styles.checkIcon} />
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.proceedButton,
            !selectedPlanId && styles.proceedButtonDisabled,
          ]}
          onPress={handleProceed}
          disabled={!selectedPlanId || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.proceedButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#ffb703",
    paddingTop: Platform.OS === "android" ? 40 : 15,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#222",
    marginTop: 6,
    fontWeight: "600",
    opacity: 0.8,
  },
  categoryBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  noPlansContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noPlansText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#0c831f",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#eef0f2",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  planCardSelected: {
    borderColor: "#0c831f",
    backgroundColor: "#f7fcf8",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  recommendedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#ffb703",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomLeftRadius: 15,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#000",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e1e1e",
  },
  planDescription: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
    fontWeight: "500",
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: "#0c831f",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0c831f",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 18,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e1e1e",
  },
  price: {
    fontSize: 36,
    fontWeight: "900",
    color: "#1e1e1e",
  },
  duration: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f3f5",
    marginVertical: 20,
  },
  featuresContainer: {
    gap: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#444",
    marginBottom: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  checkIcon: {
    fontWeight: "bold",
  },
  featureText: {
    fontSize: 14,
    color: "#495057",
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  proceedButton: {
    height: 56,
    backgroundColor: "#0c831f",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  proceedButtonDisabled: {
    backgroundColor: "#c8e6c9",
    elevation: 0,
    shadowOpacity: 0,
  },
  proceedButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});

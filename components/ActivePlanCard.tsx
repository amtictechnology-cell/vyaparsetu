import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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

interface ActivePlanCardProps {
  plan: Plan | null;
  activatedAtString: string | null;
}

export default function ActivePlanCard({ plan, activatedAtString }: ActivePlanCardProps) {
  if (!plan) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="alert-circle-outline" size={24} color="#d32f2f" />
          <Text style={[styles.title, { color: "#d32f2f" }]}>No Active Plan</Text>
        </View>
        <Text style={styles.subtitle}>{"You haven't selected a subscription plan yet."}</Text>
      </View>
    );
  }

  const duration = plan.durationInDays || 30;
  let remainingDays = duration;
  let elapsedDays = 0;

  if (activatedAtString) {
    const activatedAt = new Date(activatedAtString);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - activatedAt.getTime());
    elapsedDays = diffTime / (1000 * 60 * 60 * 24);
    remainingDays = Math.max(0, duration - elapsedDays);
  }

  // Calculate percentage of remaining days (for the progress line)
  const remainingPercent = Math.min(100, Math.max(0, (remainingDays / duration) * 100));

  // Human-friendly representation of remaining days
  const displayRemaining = remainingDays >= 1 ? Math.floor(remainingDays) : remainingDays > 0 ? "Less than 1" : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.planInfo}>
          <Text style={styles.badge}>ACTIVE PLAN</Text>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.description}>{plan.description}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{plan.price}</Text>
          <Text style={styles.durationText}>/{duration} Days</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>Subscription Period</Text>
          <Text style={styles.daysText}>
            {displayRemaining} of {duration} days left
          </Text>
        </View>
        
        {/* Progress Line */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${remainingPercent}%` }]} />
        </View>

        <View style={styles.progressScaleRow}>
          <Text style={styles.scaleText}>0 days</Text>
          <Text style={styles.scaleText}>{duration} days</Text>
        </View>
      </View>

      {/* Plan Status Row */}
      <View style={styles.featuresRow}>
        <Ionicons name="shield-checkmark" size={18} color="#ff6600" style={{ marginRight: 6 }} />
        <Text style={styles.statusText}>Secure Commercial Business License</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "#fff0e6",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
    lineHeight: 18,
  },
  planInfo: {
    flex: 1,
  },
  badge: {
    fontSize: 9,
    fontWeight: "900",
    color: "#ff6600",
    backgroundColor: "#fff0e6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  planName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1e1e1e",
  },
  description: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
    fontWeight: "500",
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ff6600",
  },
  durationText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  progressSection: {
    marginTop: 18,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },
  daysText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ff6600",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#ff6600",
    borderRadius: 4,
  },
  progressScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  scaleText: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
  },
  featuresRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f3f5",
  },
  statusText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
});

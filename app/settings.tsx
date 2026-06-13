import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import LogoutModal from "../components/LogoutModal";

const BASE_URL = "http://192.168.31.192:6000/api/v1";

export default function SettingsScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                if (token) {
                    const response = await fetch(`${BASE_URL}/user/profile`, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    const data = await response.json();
                    if (response.ok && data.user) {
                        setProfile(data.user);
                    }
                }
            } catch (error) {
                console.error("Error fetching profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleConfirmLogout = async () => {
        try {
            await AsyncStorage.removeItem("userToken");
            setShowLogoutModal(false);
            router.replace("/signup");
        } catch (error) {
            console.error("Error clearing token:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#0c831f" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{profile?.businessName || "Hotel"}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hotel Name Banner (Edge-to-Edge) */}
                <View style={styles.hotelBanner}>
                    <View style={styles.bannerRow}>
                        <View style={styles.avatarContainer}>
                            <Ionicons name="business" size={32} color="#ffb703" />
                        </View>
                        <View style={styles.profileDetails}>
                            <Text style={styles.businessName}>{profile?.businessName || "Your Hotel"}</Text>
                            <Text style={styles.categoryBadge}>{(profile?.businessCategory || "Hotel").toUpperCase()}</Text>
                        </View>
                    </View>
                </View>

                {/* Management Section (Edge-to-Edge) */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Management</Text>
                    <TouchableOpacity style={styles.edgeRow} onPress={() => router.push("/additem")}>
                        <View style={[styles.infoIconWrapper, { backgroundColor: "#e0f2f1" }]}>
                            <Ionicons name="restaurant-outline" size={20} color="#00695c" />
                        </View>
                        <View style={styles.actionTextWrapper}>
                            <Text style={styles.actionLabel}>Hotel Items</Text>
                            <Text style={styles.actionSubtitle}>Add and manage hotel items/rates</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={18} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.edgeRow} onPress={() => router.push("/trackrecord")}>
                        <View style={[styles.infoIconWrapper, { backgroundColor: "#e8eaf6" }]}>
                            <Ionicons name="analytics-outline" size={20} color="#3f51b5" />
                        </View>
                        <View style={styles.actionTextWrapper}>
                            <Text style={styles.actionLabel}>Track Record</Text>
                            <Text style={styles.actionSubtitle}>View room bookings and billing analytics</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={18} color="#999" />
                    </TouchableOpacity>
                </View>

                {/* Actions Section (Edge-to-Edge) */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Actions</Text>
                    <TouchableOpacity style={styles.edgeRow} onPress={() => setShowLogoutModal(true)}>
                        <View style={[styles.infoIconWrapper, { backgroundColor: "#ffebee" }]}>
                            <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
                        </View>
                        <View style={styles.actionTextWrapper}>
                            <Text style={[styles.actionLabel, { color: "#d32f2f" }]}>Logout</Text>
                            <Text style={styles.actionSubtitle}>Sign out of your account</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={18} color="#d32f2f" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <LogoutModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleConfirmLogout}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
        backgroundColor: "#ffb703",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#000",
    },
    scrollContent: {
        paddingVertical: 0,
    },
    hotelBanner: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderColor: "#eee",
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    bannerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarContainer: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#fffdf0",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
        borderWidth: 1,
        borderColor: "#ffe082",
    },
    profileDetails: {
        flex: 1,
    },
    businessName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#333",
    },
    categoryBadge: {
        fontSize: 10,
        fontWeight: "800",
        color: "#f57c00",
        backgroundColor: "#fff3e0",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: "flex-start",
        marginTop: 6,
    },
    sectionContainer: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: "#888",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    edgeRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    infoIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    actionTextWrapper: {
        flex: 1,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: "800",
        color: "#333",
    },
    actionSubtitle: {
        fontSize: 12,
        color: "#999",
        fontWeight: "500",
        marginTop: 2,
    },
});

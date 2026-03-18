import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import LogoutModal from "../components/LogoutModal";

const MENU_ITEMS = [
    {
        id: "driver",
        title: "Driver\nManagement",
        icon: "car-outline",
        color: "#e8f5e9",
        iconColor: "#2e7d32",
        route: "/Drivermanagment",
    },
    {
        id: "staff",
        title: "Staff\nManagement",
        icon: "people-outline",
        color: "#fff3e0",
        iconColor: "#ef6c00",
        route: "/staffmanagment",
    },
    {
        id: "customer",
        title: "Regular\nCustomer",
        icon: "person-add-outline",
        color: "#e3f2fd",
        iconColor: "#1565c0",
        route: "/regularcustomer",
    },
    {
        id: "khatabook",
        title: "Khatabook",
        icon: "book-outline",
        color: "#fce4ec",
        iconColor: "#c2185b",
        route: "/khatabook",
    },
    {
        id: "booking",
        title: "Booking\nRooms",
        icon: "bed-outline",
        color: "#f3e5f5",
        iconColor: "#7b1fa2",
        route: "/bookingrooms",
    },
];

export default function HomeScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState("Good Morning");
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                if (token) {
                    const response = await fetch("http://192.168.31.192:6000/api/v1/user/profile", {
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

        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) setGreeting("Good Morning");
            else if (hour < 18) setGreeting("Good Afternoon");
            else setGreeting("Good Evening");
        };

        fetchProfile();
        updateGreeting();
    }, []);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        try {
            await AsyncStorage.removeItem("userToken");
            setShowLogoutModal(false);
            router.replace("/signup");
        } catch (error) {
            console.error("Error clearing token:", error);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0c831f" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{greeting}</Text>
                    <Text style={styles.businessName}>{profile?.businessName || "Your Business"}</Text>
                    <View style={styles.locationContainer}>
                        <Ionicons name="person" size={14} color="#0c831f" />
                        <Text style={styles.locationText}>{profile?.name || "User Name"}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#d32f2f" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Menu Grid */}
                <View style={styles.grid}>
                    {MENU_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.card}
                            onPress={() => router.push(item.route as any)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                <Ionicons name={item.icon as any} size={32} color={item.iconColor} />
                            </View>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Dashboard Type Info */}
                <View style={styles.banner}>
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>Hotel Dashboard</Text>
                        <Text style={styles.bannerSubtitle}>This component opened because you selected 'Hotel' as your business category.</Text>
                    </View>
                    <Ionicons name="business" size={40} color="#0c831f" />
                </View>

                {/* Quick Stats or Additional Info can go here */}
                <View style={styles.banner}>
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>Business Insights</Text>
                        <Text style={styles.bannerSubtitle}>Track your daily earnings and expenses here.</Text>
                    </View>
                    <MaterialCommunityIcons name="trending-up" size={40} color="#0c831f" />
                </View>
            </ScrollView>

            <LogoutModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
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
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 40,
        backgroundColor: "#ffb703",
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    greeting: {
        fontSize: 14,
        color: "#333",
        fontWeight: "700",
        opacity: 0.8,
    },
    businessName: {
        fontSize: 16,
        fontWeight: "900",
        color: "#000",
        marginTop: 2,
        letterSpacing: -0.5,
    },
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        gap: 4,
    },
    locationText: {
        fontSize: 12,
        color: "#444",
        fontWeight: "700",
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffebee",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    logoutText: {
        color: "#d32f2f",
        fontSize: 12,
        fontWeight: "700",
    },
    scrollContent: {
        padding: 20,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 16,
    },
    card: {
        width: "47%",
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        alignItems: "flex-start",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#333",
        lineHeight: 20,
    },
    banner: {
        marginTop: 24,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#e8f5e9",
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#000",
    },
    bannerSubtitle: {
        fontSize: 13,
        color: "#666",
        marginTop: 4,
    },
});

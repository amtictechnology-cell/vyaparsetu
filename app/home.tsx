import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
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

    // Powered By Animation
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
    const [logoIndex, setLogoIndex] = useState(0);

    // Floating Animation for Banners
    const floatAnim = React.useRef(new Animated.Value(0)).current;
    
    // Fade in for Menu Items
    const menuFadeAnim = React.useRef(new Animated.Value(0)).current;

    const logos = [
        require("../assets/images/Amul-Logo-removebg-preview.png"),
        require("../assets/images/balaji.png"),
    ];

    useEffect(() => {
        // Menu Fade In
        Animated.timing(menuFadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        // Floating loop for banners
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -10,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        const runAnimation = () => {
            // Faster switch (Blink)
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setLogoIndex((prev) => (prev === 0 ? 1 : 0));
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 3,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    setTimeout(runAnimation, 2000);
                });
            });
        };

        runAnimation();
    }, []);

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
                {/* Top Row: Info + Logout */}
                <View style={styles.headerTop}>
                    <View style={styles.headerLeft}>
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

                {/* Bottom Row: Animated Powered By */}
                <View style={styles.headerPoweredBy}>
                    <View style={styles.pillContainer}>
                        <Text style={styles.poweredByLabel}>Powered by</Text>
                        
                        <View style={styles.pillDivider} />

                        <Animated.View style={[
                            styles.headerLogoContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}>
                            <Image
                                source={logos[logoIndex]}
                                style={styles.headerLogo}
                                resizeMode="contain"
                            />
                        </Animated.View>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Menu Grid */}
                <Animated.View style={[styles.grid, { opacity: menuFadeAnim }]}>
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
                </Animated.View>

                {/* Dashboard Type Info */}
                <Animated.View style={[
                    styles.banner,
                    { transform: [{ translateY: floatAnim }] }
                ]}>
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>Hotel Dashboard</Text>
                        <Text style={styles.bannerSubtitle}>This component opened because you selected 'Hotel' as your business category.</Text>
                    </View>
                    <Ionicons name="business" size={40} color="#0c831f" />
                </Animated.View>

                {/* Quick Stats or Additional Info can go here */}
                <Animated.View style={[
                    styles.banner,
                    { transform: [{ translateY: floatAnim }] }
                ]}>
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>Business Insights</Text>
                        <Text style={styles.bannerSubtitle}>Track your daily earnings and expenses here.</Text>
                    </View>
                    <MaterialCommunityIcons name="trending-up" size={40} color="#0c831f" />
                </Animated.View>
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
        backgroundColor: "#ffb703",
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    headerLeft: {
        flex: 1,
    },
    headerPoweredBy: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
        width: "100%",
    },
    pillContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.4)",
        paddingVertical: 6,
        paddingHorizontal: 15,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.5)",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    tickerContainer: {
        height: 24,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    pillDivider: {
        width: 1,
        height: 20,
        backgroundColor: "rgba(0,0,0,0.1)",
        marginHorizontal: 10,
    },
    poweredByLabel: {
        fontSize: 12,
        fontWeight: "900",
        color: "#1a1a1a",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    headerLogoContainer: {
        width: 60,
        height: 30,
        justifyContent: "center",
        alignItems: "center",
    },
    headerLogo: {
        width: "100%",
        height: "100%",
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

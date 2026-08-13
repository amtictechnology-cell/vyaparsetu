import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResizeMode, Video } from 'expo-av';
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
import { BASE_URL, SERVER_URL } from "../constants/Config";


const MENU_ITEMS = [
    {
        id: "customer",
        title: "Bill\nGenerate",
        icon: "receipt-outline",
        color: "#fff0e6",
        iconColor: "#ff6600",
        route: "/billgenerate",
    },
    {
        id: "booking",
        title: "Booking\nRooms",
        icon: "bed-outline",
        color: "#e6f0ff",
        iconColor: "#0059ff",
        route: "/bookingrooms",
    },
    {
        id: "staff",
        title: "Staff\nManagement",
        icon: "people-outline",
        color: "#f5f5f5",
        iconColor: "#333333",
        route: "/staffmanagment",
    },
    {
        id: "driver",
        title: "Driver\nManagement",
        icon: "car-outline",
        color: "#fff0e6",
        iconColor: "#ff6600",
        route: "/Drivermanagment",
    },
];

export default function HomeScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState("Good Morning");

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
        const fetchSettings = async (categoryName: string) => {
            try {
                const response = await fetch(`${BASE_URL}/settings/app/${categoryName.toLowerCase()}`);
                const data = await response.json();
                if (response.ok && data.success) {
                    const settingsData = Array.isArray(data.data) ? data.data[0] : data.data;
                    setSettings(settingsData);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };

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
                        const categoryName = (data.user.businessCategory || "hotel").toLowerCase();
                        fetchSettings(categoryName);
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

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0c831f" />
            </SafeAreaView>
        );
    }

    const isCustomHeader = !!settings?.headerColor;
    const headerBgColor = settings?.headerColor || "#ffb703";
    const textPrimary = isCustomHeader ? "#ffffff" : "#000000";
    const textSecondary = isCustomHeader ? "rgba(255,255,255,0.75)" : "#333333";
    const settingsIconColor = isCustomHeader ? "#ffffff" : "#000000";
    const hasVideo = settings?.isFestivalActive && settings?.festivalVideo;
    const headerBorderRadius = hasVideo ? 0 : 35;

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isCustomHeader ? "light-content" : "dark-content"} backgroundColor={headerBgColor} />

            {/* Header */}
            <View style={[
                styles.header,
                { 
                    backgroundColor: headerBgColor,
                    borderBottomLeftRadius: headerBorderRadius, 
                    borderBottomRightRadius: headerBorderRadius 
                }
            ]}>
                {/* Top Row: Info + Settings */}
                <View style={styles.headerTop}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.greeting, { color: textSecondary }]}>{greeting}</Text>
                        <Text style={[styles.businessName, { color: textPrimary }]}>{profile?.businessName || settings?.headerTitle || "Your Business"}</Text>
                        <View style={styles.locationContainer}>
                            <Ionicons name="person" size={14} color={isCustomHeader ? "#ffffff" : "#0c831f"} />
                            <Text style={[styles.locationText, { color: textSecondary }]}>{profile?.name || "User Name"}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.settingsButton} onPress={() => router.push("/settings")}>
                        <Ionicons name="settings-outline" size={26} color={settingsIconColor} />
                    </TouchableOpacity>
                </View>

                {/* Bottom Row: Animated Powered By (Only show if not playing a video to keep header compact) */}
                {!hasVideo && (
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
                )}
            </View>

            {/* Festival Video Header (Conditional) */}
            {hasVideo ? (
                <View style={styles.videoHeaderContainer}>
                    <Video
                        source={{ uri: `${SERVER_URL}/${settings.festivalVideo}` }}
                        style={styles.festivalVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping
                        isMuted
                        useNativeControls={false}
                    />
                </View>
            ) : null}

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


        </View>
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
        borderBottomWidth: 1,
        borderBottomColor: '#4e4e4d',
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
    settingsButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.35)",
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
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#333",
        lineHeight: 18,
        textAlign: "center",
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
    videoHeaderContainer: {
        width: "100%",
        height: 200,
        backgroundColor: "#000",
        overflow: "hidden",
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#ffffff',
    },
    festivalVideo: {
        width: "100%",
        height: "100%",
    },
});

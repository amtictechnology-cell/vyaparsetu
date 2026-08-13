import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { SERVER_URL } from '../constants/Config';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Animated, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Video, ResizeMode } from 'expo-av';
import LogoutModal from '../components/LogoutModal';

export default function BuilderScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [greeting, setGreeting] = useState("Good Morning");

    const fetchSettings = async (categoryName: string) => {
        try {
            const response = await fetch(`${SERVER_URL}/api/v1/settings/app/${categoryName.toLowerCase()}`);
            const data = await response.json();
            if (response.ok && data.success) {
                setSettings(data.data);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                if (token) {
                    const response = await fetch(`${SERVER_URL}/api/v1/user/profile`, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    const data = await response.json();
                    if (response.ok && data.user) {
                        setProfile(data.user);
                        const categoryName = (data.user.businessCategory || "builder").toLowerCase();
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
            if (hour >= 5 && hour < 12) {
                setGreeting("Good Morning");
            } else if (hour >= 12 && hour < 17) {
                setGreeting("Good Afternoon");
            } else if (hour >= 17 && hour < 21) {
                setGreeting("Good Evening");
            } else {
                setGreeting("Good Night");
            }
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
            await AsyncStorage.removeItem("isSubscribed");
            setShowLogoutModal(false);
            router.replace("/signup");
        } catch (error) {
            console.error("Error clearing token:", error);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['bottom', 'left', 'right']}>
                <ActivityIndicator size="large" color="#0c831f" />
            </SafeAreaView>
        );
    }

    const isCustomHeader = !!settings?.headerColor;
    const headerBgColor = settings?.headerColor || "#ffb703";
    const textPrimary = isCustomHeader ? "#ffffff" : "#000000";
    const textSecondary = isCustomHeader ? "rgba(255,255,255,0.75)" : "#333333";
    const logoutBtnBg = isCustomHeader ? "rgba(255, 255, 255, 0.25)" : "#ffebee";
    const logoutIconColor = isCustomHeader ? "#ffffff" : "#d32f2f";
    const logoutTextColor = isCustomHeader ? "#ffffff" : "#d32f2f";

    const hasVideo = settings?.isFestivalActive && settings?.festivalVideo;
    const headerBorderRadius = hasVideo ? 0 : 30;

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <StatusBar barStyle={isCustomHeader ? "light-content" : "dark-content"} backgroundColor={headerBgColor} />
            
            {/* Header Part 1: Branding Header */}
            <View style={[
                styles.header, 
                { 
                    backgroundColor: headerBgColor,
                    borderBottomLeftRadius: headerBorderRadius,
                    borderBottomRightRadius: headerBorderRadius,
                }
            ]}>
                <View style={styles.headerTop}>
                    <View style={styles.headerLeftContainer}>
                        {settings?.headerLogo ? (
                            <Image 
                                source={{ uri: `${SERVER_URL}/${settings.headerLogo}` }} 
                                style={styles.headerLogoImage} 
                                resizeMode="cover"
                            />
                        ) : null}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.greetingText, { color: textSecondary }]} numberOfLines={1}>
                                {greeting}
                            </Text>
                            <Text style={[styles.headerSettingsTitle, { color: textPrimary, textAlign: "left" }]} numberOfLines={1}>
                                {profile?.businessName || settings?.headerTitle || (profile?.businessCategory ? profile.businessCategory.charAt(0).toUpperCase() + profile.businessCategory.slice(1) : "Builder")}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={[styles.logoutButton, { backgroundColor: logoutBtnBg }]} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color={logoutIconColor} />
                        <Text style={[styles.logoutText, { color: logoutTextColor }]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Header Part 2: Festival Video Header (Conditional) */}
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
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.dashboardGrid}>
                    <TouchableOpacity 
                        style={styles.card} 
                        onPress={() => router.push('/builder/clients' as any)}
                    >
                        <View style={styles.cardIconContainer}>
                            <Ionicons name="people-outline" size={32} color="#ff6600" />
                        </View>
                        <Text style={styles.cardTitle}>Clients</Text>
                        <Text style={styles.cardSubtitle}>Manage your clients</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.card} 
                        onPress={() => router.push('/builder/rate-list' as any)}
                    >
                        <View style={styles.cardIconContainer}>
                            <Ionicons name="list-outline" size={32} color="#ff6600" />
                        </View>
                        <Text style={styles.cardTitle}>Work Rate List</Text>
                        <Text style={styles.cardSubtitle}>Manage service prices</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.card} 
                        onPress={() => router.push('/builder/masons' as any)}
                    >
                        <View style={styles.cardIconContainer}>
                            <Ionicons name="hammer-outline" size={32} color="#ff6600" />
                        </View>
                        <Text style={styles.cardTitle}>Masons</Text>
                        <Text style={styles.cardSubtitle}>Manage workers & attendance</Text>
                    </TouchableOpacity>
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
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#ffb703', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeftContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 12,
    },
    headerLogoImage: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.6)",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4 },
    logoutText: { color: '#d32f2f', fontSize: 12, fontWeight: '700' },
    greetingText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    headerSettingsTitle: {
        fontSize: 18,
        fontWeight: "900",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    videoHeaderContainer: {
        width: "100%",
        height: 200,
        backgroundColor: "#000",
        overflow: "hidden",
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    festivalVideo: {
        width: "100%",
        height: "100%",
    },
    content: { padding: 20 },
    dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { 
        width: '48%', 
        backgroundColor: '#fff', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 16,
        elevation: 4, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 6,
        alignItems: 'center'
    },
    cardIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff3e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
    cardSubtitle: { fontSize: 12, color: '#666', textAlign: 'center' }
});

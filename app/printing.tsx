import React, { useEffect, useState } from 'react';
import { SERVER_URL } from '../constants/Config';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Animated, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Video, ResizeMode } from 'expo-av';
import LogoutModal from '../components/LogoutModal';

export default function PrintingScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [greeting, setGreeting] = useState("Good Morning");

    const fetchSettings = async (categoryName: string) => {
        try {
            const cacheKey = `settings_${categoryName}`;
            const timeKey = `settings_${categoryName}_time`;
            
            const cachedData = await AsyncStorage.getItem(cacheKey);
            const cachedTime = await AsyncStorage.getItem(timeKey);
            
            if (cachedData) {
                setSettings(JSON.parse(cachedData));
            }

            const now = Date.now();
            if (!cachedData || !cachedTime || (now - parseInt(cachedTime)) > 3600000) {
                const response = await fetch(`${SERVER_URL}/api/v1/settings/app/${categoryName.toLowerCase()}`);
                const data = await response.json();
                if (response.ok && data.success) {
                    setSettings(data.data);
                    await AsyncStorage.setItem(cacheKey, JSON.stringify(data.data));
                    await AsyncStorage.setItem(timeKey, now.toString());
                }
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const cachedProfileStr = await AsyncStorage.getItem('cachedProfile');
                if (cachedProfileStr) {
                    const parsedProfile = JSON.parse(cachedProfileStr);
                    setProfile(parsedProfile);
                    setLoading(false);
                    const categoryName = (parsedProfile.businessCategory || "printing").toLowerCase();
                    fetchSettings(categoryName);
                }

                const timeKey = `profile_time`;
                const cachedTime = await AsyncStorage.getItem(timeKey);
                const now = Date.now();

                if (!cachedProfileStr || !cachedTime || (now - parseInt(cachedTime)) > 300000) {
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
                            await AsyncStorage.setItem('cachedProfile', JSON.stringify(data.user));
                            await AsyncStorage.setItem(timeKey, now.toString());
                            const categoryName = (data.user.businessCategory || "printing").toLowerCase();
                            fetchSettings(categoryName);
                        }
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
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0c831f" />
            </View>
        );
    }

    const isCustomHeader = !!settings?.headerColor;
    const headerBgColor = settings?.headerColor || "#ffb703";
    const textPrimary = isCustomHeader ? "#ffffff" : "#000000";
    const textSecondary = isCustomHeader ? "rgba(255,255,255,0.75)" : "#333333";

    const hasVideo = settings?.isFestivalActive && settings?.festivalVideo;
    const headerBorderRadius = hasVideo ? 0 : 30;

    return (
        <View style={styles.container}>
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
                                {profile?.businessName || settings?.headerTitle || (profile?.businessCategory ? profile.businessCategory.charAt(0).toUpperCase() + profile.businessCategory.slice(1) : "Printing")}
                            </Text>
                        </View>
                    </View>
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
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {profile ? (
                    <View style={styles.profileCard}>
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarContainer}>
                                <Ionicons name="print" size={32} color="#ffb703" />
                            </View>
                            <View style={styles.profileTitleContainer}>
                                <Text style={styles.profileName}>{profile.name || "User Name"}</Text>
                                <Text style={styles.profileUserId}>ID: {profile.userId}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.divider} />
                        
                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Ionicons name="call" size={18} color="#ffb703" />
                            </View>
                            <View>
                                <Text style={styles.infoLabel}>Mobile Number</Text>
                                <Text style={styles.infoText}>{profile.mobileNo}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Ionicons name="business" size={18} color="#ffb703" />
                            </View>
                            <View>
                                <Text style={styles.infoLabel}>Business Name</Text>
                                <Text style={styles.infoText}>{profile.businessName} ({profile.businessCategory})</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Ionicons name="shield-checkmark" size={18} color={profile.status === 'active' ? '#0c831f' : '#d32f2f'} />
                            </View>
                            <View>
                                <Text style={styles.infoLabel}>Account Status</Text>
                                <Text style={[styles.infoText, { color: profile.status === 'active' ? '#0c831f' : '#d32f2f', textTransform: 'capitalize', fontWeight: 'bold' }]}>{profile.status}</Text>
                            </View>
                        </View>
                        
                        {profile.address && (profile.address.city || profile.address.state) ? (
                            <View style={styles.infoRow}>
                                <View style={styles.iconBox}>
                                    <Ionicons name="location" size={18} color="#ffb703" />
                                </View>
                                <View>
                                    <Text style={styles.infoLabel}>Address</Text>
                                    <Text style={styles.infoText}>{profile.address.city}{profile.address.city && profile.address.state ? ', ' : ''}{profile.address.state}</Text>
                                </View>
                            </View>
                        ) : null}
                    </View>
                ) : (
                    <View style={styles.content}>
                        <Ionicons name="print-outline" size={80} color="#ffb703" />
                        <Text style={styles.message}>Loading profile data...</Text>
                    </View>
                )}
            </ScrollView>

            <LogoutModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
            />

        </View>
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
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    message: { fontSize: 16, textAlign: 'center', marginVertical: 20, color: '#444' },
    scrollContent: { padding: 20, paddingBottom: 100 },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff8e1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffb703',
    },
    profileTitleContainer: {
        marginLeft: 15,
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    profileUserId: {
        fontSize: 13,
        color: '#888',
        marginTop: 4,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff8e1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    infoLabel: {
        fontSize: 12,
        color: '#888',
        fontWeight: '600',
        marginBottom: 2,
    },
    infoText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
});

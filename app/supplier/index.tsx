import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { SERVER_URL } from '../../constants/Config';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Animated,
    Image,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';



export default function SupplierScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
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
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                    const response = await fetch(
                        `${SERVER_URL}/api/v1/user/profile`,
                        {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    const data = await response.json();
                    if (response.ok && data.user) {
                        setProfile(data.user);
                        const categoryName = (data.user.businessCategory || "supplier").toLowerCase();
                        fetchSettings(categoryName);
                    }
                }
            } catch (error) {
                console.error('Error fetching profile', error);
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
    const menuBtnBg = isCustomHeader ? "rgba(255, 255, 255, 0.25)" : "transparent";
    const menuIconColor = isCustomHeader ? "#ffffff" : "#0c831f";

    const hasVideo = settings?.isFestivalActive && settings?.festivalVideo;
    const headerBorderRadius = hasVideo ? 0 : 30;

    return (
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
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
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.greetingText, { color: textSecondary }]} numberOfLines={1}>
                                {greeting}
                            </Text>
                            <Text style={[styles.headerSettingsTitle, { color: textPrimary, textAlign: "left" }]} numberOfLines={1}>
                                {profile?.businessName || settings?.headerTitle || (profile?.businessCategory ? profile.businessCategory.charAt(0).toUpperCase() + profile.businessCategory.slice(1) : "Supplier")}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.menuButton, { backgroundColor: menuBtnBg, borderRadius: 24 }]}
                        onPress={() => router.push('/supplier/menu')}
                    >
                        <Ionicons name="person-circle-outline" size={38} color={menuIconColor} />
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

            {/* ── Content ── */}
            <View style={styles.content}>
                <ScrollView contentContainerStyle={styles.cardContainer} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity 
                        style={styles.actionGridCard} 
                        activeOpacity={0.8}
                        onPress={() => router.push('/supplier/customer')}
                    >
                        <View style={[styles.gridIconBox, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="add-circle-outline" size={36} color="#0c831f" />
                        </View>
                        <Text style={styles.gridCardTitle}>Create Bill</Text>
                        <Text style={styles.gridCardSubtitle} numberOfLines={2}>Manage customers & bills</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionGridCard} 
                        activeOpacity={0.8}
                        onPress={() => router.push('/supplier/rate-list')}
                    >
                        <View style={[styles.gridIconBox, { backgroundColor: '#e3f2fd' }]}>
                            <Ionicons name="list-outline" size={36} color="#1565c0" />
                        </View>
                        <Text style={styles.gridCardTitle}>My Rate List</Text>
                        <Text style={styles.gridCardSubtitle} numberOfLines={2}>Update item prices</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionGridCard} 
                        activeOpacity={0.8}
                        onPress={() => router.push('/supplier/company-bill')}
                    >
                        <View style={[styles.gridIconBox, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="document-text-outline" size={36} color="#e65100" />
                        </View>
                        <Text style={styles.gridCardTitle}>Company Bill</Text>
                        <Text style={styles.gridCardSubtitle} numberOfLines={2}>View & manage bills</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionGridCard} 
                        activeOpacity={0.8}
                        onPress={() => router.push('/supplier/all-bills')}
                    >
                        <View style={[styles.gridIconBox, { backgroundColor: '#f3e5f5' }]}>
                            <Ionicons name="receipt-outline" size={36} color="#8e24aa" />
                        </View>
                        <Text style={styles.gridCardTitle}>Customer Bills</Text>
                        <Text style={styles.gridCardSubtitle} numberOfLines={2}>View generated bills</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },

    /* Header */
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#ffb703',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
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
    menuButton: {
        padding: 4,
    },
    greetingText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    headerSettingsTitle: {
        fontSize: 14,
        fontWeight: "900",
        letterSpacing: 0.5,
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



    /* Content */
    content: { 
        flex: 1,
        backgroundColor: '#f4f6f9',
    },
    cardContainer: {
        padding: 16,
        paddingTop: 36, // Increased top padding to move cards lower from the header
        gap: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionGridCard: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    gridIconBox: {
        width: 60,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
        textAlign: 'center',
    },
    gridCardSubtitle: {
        fontSize: 12,
        color: '#777',
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 16,
    },
});



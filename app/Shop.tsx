import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import LogoutModal from '../components/LogoutModal';

export default function ShopScreen() {
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
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{greeting}</Text>
                    <Text style={styles.businessName}>{profile?.businessName || "Shop Dashboard"}</Text>
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
            <View style={styles.content}>
                <Ionicons name="storefront" size={80} color="#0c831f" />
                <Text style={styles.message}>This component opened because you selected 'Shop' as your business category.</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('/signup')}>
                    <Text style={styles.buttonText}>Go to Signup</Text>
                </TouchableOpacity>
            </View>

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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, backgroundColor: '#ffb703', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    greeting: { fontSize: 14, color: '#333', fontWeight: '700', opacity: 0.8 },
    businessName: { fontSize: 22, fontWeight: '900', color: '#000', marginTop: 2, letterSpacing: -0.5 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    locationText: { fontSize: 12, color: '#444', fontWeight: '700' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4 },
    logoutText: { color: '#d32f2f', fontSize: 12, fontWeight: '700' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    message: { fontSize: 16, textAlign: 'center', marginVertical: 20, color: '#444' },
    button: { backgroundColor: '#0c831f', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

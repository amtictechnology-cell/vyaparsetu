import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SupplierDashboard from './dashboard';
import SupplierCustomer from './customer';

type TabType = 'dashboard' | 'bill';

export default function SupplierScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState('Good Morning');
    const [activeTab, setActiveTab] = useState<TabType>('bill');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                    const response = await fetch(
                        'http://192.168.31.192:6000/api/v1/user/profile',
                        {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    const data = await response.json();
                    if (response.ok && data.user) setProfile(data.user);
                }
            } catch (error) {
                console.error('Error fetching profile', error);
            } finally {
                setLoading(false);
            }
        };

        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) setGreeting('Good Morning');
            else if (hour < 18) setGreeting('Good Afternoon');
            else setGreeting('Good Evening');
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

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{greeting}</Text>
                    <Text style={styles.businessName}>
                        {profile?.businessName || 'Supplier Portal'}
                    </Text>
                    <View style={styles.locationContainer}>
                        <Ionicons name="person" size={14} color="#0c831f" />
                        <Text style={styles.locationText}>
                            {profile?.name || 'User Name'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => router.push('/supplier/menu')}
                >
                    <Ionicons name="person-circle-outline" size={38} color="#0c831f" />
                </TouchableOpacity>
            </View>

            {/* ── Tab Switcher ── */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'bill' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('bill')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="receipt-outline"
                        size={18}
                        color={activeTab === 'bill' ? '#fff' : '#0c831f'}
                    />
                    <Text style={[styles.tabText, activeTab === 'bill' && styles.tabTextActive]}>
                        Create Bill
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'dashboard' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('dashboard')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="grid-outline"
                        size={18}
                        color={activeTab === 'dashboard' ? '#fff' : '#0c831f'}
                    />
                    <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
                        Dashboard
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Active Component ── */}
            <View style={styles.content}>
                {activeTab === 'dashboard' ? <SupplierDashboard /> : <SupplierCustomer />}
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },

    /* Header */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 24,
        backgroundColor: '#ffb703',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    greeting: { fontSize: 13, color: '#333', fontWeight: '700', opacity: 0.8 },
    businessName: { fontSize: 22, fontWeight: '900', color: '#000', marginTop: 2, letterSpacing: -0.5 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    locationText: { fontSize: 12, color: '#444', fontWeight: '700' },
    menuButton: {
        padding: 4,
    },

    /* Tab bar */
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 20,
        backgroundColor: '#e8f5e9',
        borderRadius: 16,
        padding: 5,
        elevation: 3,
        shadowColor: '#0c831f',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 12,
        borderRadius: 12,
    },
    tabBtnActive: {
        backgroundColor: '#0c831f',
        elevation: 4,
        shadowColor: '#0c831f',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    tabText: { fontSize: 14, fontWeight: '700', color: '#0c831f' },
    tabTextActive: { color: '#fff' },

    /* Content */
    content: { flex: 1 },
});

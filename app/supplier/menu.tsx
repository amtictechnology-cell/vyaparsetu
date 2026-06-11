import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SupplierMenu() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0)).current;

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
        fetchProfile();
    }, []);

    useEffect(() => {
        if (showLogoutModal) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 6,
                tension: 40,
            }).start();
        } else {
            Animated.timing(scaleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [showLogoutModal]);

    const confirmLogout = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            setShowLogoutModal(false);
            router.replace('/signup');
        } catch (error) {
            console.error('Error clearing token:', error);
        }
    };

    const menuItems = [
        {
            id: 'balance',
            label: 'App Balance',
            subtitle: 'View your wallet & transactions',
            icon: 'wallet-outline' as const,
            iconBg: '#e3f2fd',
            iconColor: '#1565c0',
            route: '/Appblance',
        },
        {
            id: 'help',
            label: 'Help & Support',
            subtitle: 'Get assistance anytime',
            icon: 'headset-outline' as const,
            iconBg: '#e8f5e9',
            iconColor: '#2e7d32',
            route: '/HelpSupport',
        },
        {
            id: 'insights',
            label: 'Business Insights',
            subtitle: 'Analytics & performance',
            icon: 'bar-chart-outline' as const,
            iconBg: '#fff3e0',
            iconColor: '#e65100',
            route: '/supplier/business-insights',
        },
        {
            id: 'about',
            label: 'About Us',
            subtitle: 'Know more about VyparSetu',
            icon: 'information-circle-outline' as const,
            iconBg: '#f3e5f5',
            iconColor: '#6a1b9a',
            route: '/Appaboutus',
        },
    ];

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0c831f" />
            </SafeAreaView>
        );
    }

    const initials = (profile?.name || 'S')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ── Profile + Info merged card ── */}
                <View style={styles.profileCard}>
                    {/* Top: Avatar + Company + Mobile */}
                    <View style={styles.profileTop}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.companyName}>
                                {profile?.businessName || 'Business Name'}
                            </Text>
                            <View style={styles.mobileRow}>
                                <Ionicons name="call-outline" size={13} color="#0c831f" />
                                <Text style={styles.mobileText}>
                                    {profile?.mobile || profile?.phone || '+91 0000000000'}
                                </Text>
                                <View style={styles.supplierBadge}>
                                    <Text style={styles.supplierBadgeText}>Supplier</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Your Information row */}
                    <Text style={styles.infoSectionLabel}>Your Information</Text>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Ionicons name="person-outline" size={18} color="#0c831f" />
                        </View>
                        <View>
                            <Text style={styles.infoLabel}>Full Name</Text>
                            <Text style={styles.infoValue}>{profile?.name || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Quick Access ── */}
                <Text style={styles.sectionTitle}>Quick Access</Text>

                <View style={styles.menuList}>
                    {menuItems.map((item, idx) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuRow,
                                idx < menuItems.length - 1 && styles.menuRowBorder,
                            ]}
                            activeOpacity={0.75}
                            onPress={() => router.push(item.route as any)}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
                                <Ionicons name={item.icon} size={22} color={item.iconColor} />
                            </View>
                            <View style={styles.menuTextWrap}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#ccc" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Logout ── */}
                <TouchableOpacity
                    style={styles.logoutRow}
                    activeOpacity={0.75}
                    onPress={() => setShowLogoutModal(true)}
                >
                    <View style={[styles.menuIconBox, { backgroundColor: '#ffebee' }]}>
                        <Ionicons name="log-out-outline" size={22} color="#d32f2f" />
                    </View>
                    <View style={styles.menuTextWrap}>
                        <Text style={[styles.menuLabel, { color: '#d32f2f' }]}>Logout</Text>
                        <Text style={styles.menuSubtitle}>Sign out of your account</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#d32f2f" />
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Logout Modal ── */}
            <Modal
                transparent
                visible={showLogoutModal}
                animationType="fade"
                onRequestClose={() => setShowLogoutModal(false)}
            >
                <View style={styles.overlay}>
                    <Animated.View style={[styles.modalBox, { transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.modalIconWrap}>
                            <Ionicons name="log-out-outline" size={48} color="#d32f2f" />
                        </View>
                        <Text style={styles.modalTitle}>Confirm Logout</Text>
                        <Text style={styles.modalMsg}>
                            Are you sure you want to log out from your account?
                        </Text>
                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setShowLogoutModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={confirmLogout}>
                                <Text style={styles.confirmBtnText}>Yes, Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 52,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111' },

    /* Profile Card (merged with info) */
    profileCard: {
        backgroundColor: '#fff',
        marginBottom: 10,
        paddingVertical: 20,
        paddingHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    profileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarCircle: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#0c831f',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
    profileInfo: { flex: 1 },
    companyName: { fontSize: 17, fontWeight: '900', color: '#111', marginBottom: 5 },
    mobileRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    mobileText: { fontSize: 13, color: '#555', fontWeight: '600' },
    supplierBadge: {
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
    },
    supplierBadgeText: { fontSize: 10, fontWeight: '700', color: '#0c831f' },
    cardDivider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 14 },
    infoSectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#aaa',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', marginBottom: 2 },
    infoValue: { fontSize: 14, color: '#222', fontWeight: '700' },

    /* Section Title */
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#999',
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },

    /* Menu List */
    menuList: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        marginBottom: 10,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
    },
    menuRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f2f2f2',
    },
    menuIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTextWrap: { flex: 1 },
    menuLabel: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 2 },
    menuSubtitle: { fontSize: 12, color: '#aaa', fontWeight: '500' },

    /* Logout Row */
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#d32f2f',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },

    /* Modal */
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    modalIconWrap: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#ffebee',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 8 },
    modalMsg: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 26,
        lineHeight: 21,
    },
    modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: {
        flex: 1,
        height: 50,
        backgroundColor: '#f5f5f5',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#333' },
    confirmBtn: {
        flex: 1,
        height: 50,
        backgroundColor: '#d32f2f',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

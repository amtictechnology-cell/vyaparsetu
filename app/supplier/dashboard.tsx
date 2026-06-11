import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

import SupplierCompanyBill from './company-bill';
import SupplierRateList from './rate-list';

export default function SupplierDashboard() {
    const [rateListModal, setRateListModal] = useState(false);
    const [companyBillModal, setCompanyBillModal] = useState(false);

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

            {/* ── Welcome Banner ── */}
            <View style={styles.banner}>
                <View>
                    <Text style={styles.bannerGreeting}>Namaste 👋</Text>
                    <Text style={styles.bannerTitle}>Supplier Dashboard</Text>
                    <Text style={styles.bannerSub}>Apna business manage karo</Text>
                </View>
                <View style={styles.bannerIcon}>
                    <Ionicons name="storefront-outline" size={36} color="#fff" />
                </View>
            </View>

            {/* ── Quick Access Heading ── */}
            <Text style={styles.sectionTitle}>Quick Access</Text>

            {/* ── Card 1: Rate List ── */}
            <TouchableOpacity
                style={[styles.card, styles.cardGreen]}
                onPress={() => setRateListModal(true)}
                activeOpacity={0.88}
            >
                <View style={styles.cardIconBox}>
                    <Ionicons name="pricetags-outline" size={32} color="#0c831f" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>My Rate List</Text>
                    <Text style={styles.cardDesc}>Apni items aur prices dekhein, add ya edit karein</Text>
                </View>
                <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={22} color="#0c831f" />
                </View>
            </TouchableOpacity>

            {/* ── Card 2: Company Bill ── */}
            <TouchableOpacity
                style={[styles.card, styles.cardBlue]}
                onPress={() => setCompanyBillModal(true)}
                activeOpacity={0.88}
            >
                <View style={[styles.cardIconBox, styles.cardIconBoxBlue]}>
                    <Ionicons name="receipt-outline" size={32} color="#1565c0" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: '#1565c0' }]}>Company Bills</Text>
                    <Text style={styles.cardDesc}>Customer ke bills banao aur manage karo</Text>
                </View>
                <View style={[styles.cardArrow, styles.cardArrowBlue]}>
                    <Ionicons name="chevron-forward" size={22} color="#1565c0" />
                </View>
            </TouchableOpacity>

            {/* ══ Rate List Modal ══ */}
            <Modal
                visible={rateListModal}
                animationType="slide"
                onRequestClose={() => setRateListModal(false)}
            >
                <SafeAreaView style={styles.modalSafe}>
                    {/* Back Header */}
                    <View style={styles.modalTopBar}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => setRateListModal(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="arrow-back" size={22} color="#111" />
                        </TouchableOpacity>
                        <Text style={styles.modalTopTitle}>My Rate List</Text>
                        <View style={{ width: 36 }} />
                    </View>
                    <SupplierRateList />
                </SafeAreaView>
            </Modal>

            {/* ══ Company Bill Modal ══ */}
            <Modal
                visible={companyBillModal}
                animationType="slide"
                onRequestClose={() => setCompanyBillModal(false)}
            >
                <SafeAreaView style={styles.modalSafe}>
                    {/* Back Header */}
                    <View style={styles.modalTopBar}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => setCompanyBillModal(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="arrow-back" size={22} color="#111" />
                        </TouchableOpacity>
                        <Text style={styles.modalTopTitle}>Company Bills</Text>
                        <View style={{ width: 36 }} />
                    </View>
                    <SupplierCompanyBill />
                </SafeAreaView>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { paddingBottom: 60, backgroundColor: '#f7f8fa' },

    /* Banner */
    banner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0c831f',
        padding: 20,
        marginBottom: 8,
        elevation: 6,
        shadowColor: '#0c831f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    bannerGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    bannerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2 },
    bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
    bannerIcon: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },

    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#888', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 16, marginTop: 16 },

    /* Card */
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 0,
        padding: 18,
        marginBottom: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        borderLeftWidth: 5,
    },
    cardGreen: { borderLeftColor: '#0c831f' },
    cardBlue: { borderLeftColor: '#1565c0' },
    cardIconBox: {
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 14,
    },
    cardIconBoxBlue: { backgroundColor: '#e3f2fd' },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '900', color: '#0c831f', marginBottom: 4 },
    cardDesc: { fontSize: 12, color: '#888', fontWeight: '500', lineHeight: 17 },
    cardArrow: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center', alignItems: 'center',
    },
    cardArrowBlue: { backgroundColor: '#e3f2fd' },

    /* Modal */
    modalSafe: { flex: 1, backgroundColor: '#f7f8fa' },
    modalTopBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center', alignItems: 'center',
    },
    modalTopTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
});

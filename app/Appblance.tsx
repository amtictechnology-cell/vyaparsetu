import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Appblance() {
    const router = useRouter();

    const transactions = [
        { id: 1, label: 'Order Payment Received', amount: '+₹1,200', date: 'Today, 10:30 AM', type: 'credit' },
        { id: 2, label: 'Platform Fee', amount: '-₹50', date: 'Today, 10:30 AM', type: 'debit' },
        { id: 3, label: 'Order Payment Received', amount: '+₹850', date: 'Yesterday, 4:15 PM', type: 'credit' },
        { id: 4, label: 'Withdrawal to Bank', amount: '-₹2,000', date: 'Apr 20, 2:00 PM', type: 'debit' },
        { id: 5, label: 'Order Payment Received', amount: '+₹3,400', date: 'Apr 19, 12:45 PM', type: 'credit' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>App Balance</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.walletIconWrap}>
                        <Ionicons name="wallet-outline" size={32} color="#fff" />
                    </View>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceAmount}>₹ 3,400.00</Text>
                    <TouchableOpacity style={styles.withdrawBtn}>
                        <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
                        <Text style={styles.withdrawBtnText}>Withdraw</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { borderLeftColor: '#0c831f' }]}>
                        <Text style={styles.statValue}>₹5,450</Text>
                        <Text style={styles.statLabel}>Total Earned</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#d32f2f' }]}>
                        <Text style={[styles.statValue, { color: '#d32f2f' }]}>₹2,050</Text>
                        <Text style={styles.statLabel}>Total Withdrawn</Text>
                    </View>
                </View>

                {/* Transaction History */}
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <View style={styles.txCard}>
                    {transactions.map((tx, idx) => (
                        <View key={tx.id}>
                            <View style={styles.txRow}>
                                <View style={[styles.txIconBox, { backgroundColor: tx.type === 'credit' ? '#e8f5e9' : '#ffebee' }]}>
                                    <Ionicons
                                        name={tx.type === 'credit' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                                        size={22}
                                        color={tx.type === 'credit' ? '#0c831f' : '#d32f2f'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.txLabel}>{tx.label}</Text>
                                    <Text style={styles.txDate}>{tx.date}</Text>
                                </View>
                                <Text style={[styles.txAmount, { color: tx.type === 'credit' ? '#0c831f' : '#d32f2f' }]}>
                                    {tx.amount}
                                </Text>
                            </View>
                            {idx < transactions.length - 1 && <View style={styles.txDivider} />}
                        </View>
                    ))}
                </View>
                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
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
    content: { padding: 16 },
    balanceCard: {
        backgroundColor: '#0c831f',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 6,
        shadowColor: '#0c831f',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    walletIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 6 },
    balanceAmount: { fontSize: 38, fontWeight: '900', color: '#fff', marginBottom: 20 },
    withdrawBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
    },
    withdrawBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 4,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    statValue: { fontSize: 20, fontWeight: '900', color: '#0c831f', marginBottom: 4 },
    statLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#888',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 4,
    },
    txCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    txIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    txLabel: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 2 },
    txDate: { fontSize: 11, color: '#aaa', fontWeight: '500' },
    txAmount: { fontSize: 15, fontWeight: '900' },
    txDivider: { height: 1, backgroundColor: '#f0f0f0' },
});

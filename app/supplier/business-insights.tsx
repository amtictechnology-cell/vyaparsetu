import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function Supplierbuisnessingights() {
    const router = useRouter();

    const stats = [
        { label: 'Total Bills', value: '124', icon: 'receipt-outline' as const, color: '#1565c0', bg: '#e3f2fd' },
        { label: 'Total Revenue', value: '₹48,200', icon: 'trending-up-outline' as const, color: '#0c831f', bg: '#e8f5e9' },
        { label: 'Active Customers', value: '38', icon: 'people-outline' as const, color: '#e65100', bg: '#fff3e0' },
        { label: 'Pending Payments', value: '₹6,500', icon: 'hourglass-outline' as const, color: '#6a1b9a', bg: '#f3e5f5' },
    ];

    const topItems = [
        { name: 'Rice (25 kg)', sales: 42, revenue: '₹12,600' },
        { name: 'Wheat Flour (10 kg)', sales: 35, revenue: '₹8,750' },
        { name: 'Sugar (5 kg)', sales: 28, revenue: '₹5,040' },
        { name: 'Cooking Oil (5 L)', sales: 21, revenue: '₹6,300' },
        { name: 'Dal (1 kg)', sales: 18, revenue: '₹3,060' },
    ];

    const months = ['Jan', 'Feb', 'Mar', 'Apr'];
    const revenues = [28000, 35000, 42000, 48200];
    const maxRev = Math.max(...revenues);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Business Insights</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Hero */}
                <View style={styles.heroBanner}>
                    <Ionicons name="bar-chart-outline" size={36} color="#fff" />
                    <View style={{ marginLeft: 14 }}>
                        <Text style={styles.heroTitle}>April 2026</Text>
                        <Text style={styles.heroSub}>Your performance overview</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <Text style={styles.sectionTitle}>Key Metrics</Text>
                <View style={styles.statsGrid}>
                    {stats.map((s, i) => (
                        <View key={i} style={[styles.statCard, { borderTopColor: s.color }]}>
                            <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>
                                <Ionicons name={s.icon} size={22} color={s.color} />
                            </View>
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Revenue Chart (bar) */}
                <Text style={styles.sectionTitle}>Monthly Revenue</Text>
                <View style={styles.chartCard}>
                    <View style={styles.chartBars}>
                        {revenues.map((rev, i) => {
                            const barH = (rev / maxRev) * 120;
                            return (
                                <View key={i} style={styles.barCol}>
                                    <Text style={styles.barValue}>
                                        {rev >= 1000 ? `₹${(rev / 1000).toFixed(0)}k` : `₹${rev}`}
                                    </Text>
                                    <View style={[styles.bar, { height: barH, backgroundColor: i === revenues.length - 1 ? '#0c831f' : '#a5d6a7' }]} />
                                    <Text style={styles.barLabel}>{months[i]}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Top Items */}
                <Text style={styles.sectionTitle}>Top Selling Items</Text>
                <View style={styles.topCard}>
                    {topItems.map((item, idx) => (
                        <View key={idx}>
                            <View style={styles.topRow}>
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>#{idx + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemSales}>{item.sales} units sold</Text>
                                </View>
                                <Text style={styles.itemRevenue}>{item.revenue}</Text>
                            </View>
                            {idx < topItems.length - 1 && <View style={styles.divider} />}
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
    heroBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0c831f',
        borderRadius: 20,
        padding: 22,
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#0c831f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginTop: 2 },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#888',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 4,
    },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statCard: {
        width: (width - 44) / 2,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        borderTopWidth: 3,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    statIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statValue: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
    statLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20,
        marginBottom: 24,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 160 },
    barCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
    bar: { width: 40, borderRadius: 8 },
    barValue: { fontSize: 11, fontWeight: '700', color: '#555' },
    barLabel: { fontSize: 12, fontWeight: '700', color: '#888' },
    topCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: { fontSize: 12, fontWeight: '800', color: '#0c831f' },
    itemName: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 2 },
    itemSales: { fontSize: 11, color: '#aaa', fontWeight: '500' },
    itemRevenue: { fontSize: 14, fontWeight: '900', color: '#0c831f' },
    divider: { height: 1, backgroundColor: '#f0f0f0' },
});

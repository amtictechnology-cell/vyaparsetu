import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';
import { BASE_URL } from '../../constants/Config';

interface BillSummary {
    totalAmount: number;
    totalBills: number;
    date: string; // e.g. "2026-08-01"
    customerCount: number;
}

export default function AllBillsScreen() {
    const router = useRouter();
    
    const [summaries, setSummaries] = useState<BillSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'custom' | ''>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Date Picker States
    const [showPicker, setShowPicker] = useState(false);
    const [dateValue, setDateValue] = useState(new Date());

    const fetchSummaries = useCallback(async (isRefresh = false, activeDateFilter = dateFilter, start = startDate, end = endDate) => {
        try {
            if (isRefresh) setRefreshing(true); else setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            
            let url = `${BASE_URL}/supplier/customer-bill-summary`;
            const params = [];
            
            if (activeDateFilter === 'today' || activeDateFilter === 'yesterday') {
                params.push(`dateFilter=${activeDateFilter}`);
            } else if (start && end) {
                params.push(`startDate=${start}`);
                params.push(`endDate=${end}`);
            }
            
            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && data.success && data.data) {
                setSummaries(data.data);
            } else {
                setSummaries([]);
            }
        } catch (e) {
            console.error('Fetch summaries error:', e);
            setSummaries([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateFilter, startDate, endDate]);

    useEffect(() => {
        fetchSummaries();
    }, [fetchSummaries]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDateValue(selectedDate);
            // Format YYYY-MM-DD
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            
            setDateFilter('custom');
            setStartDate(formattedDate);
            setEndDate(formattedDate);
            fetchSummaries(false, 'custom', formattedDate, formattedDate);
        }
    };

    const setQuickFilter = (filter: 'today' | 'yesterday' | '') => {
        setDateFilter(filter);
        setStartDate('');
        setEndDate('');
        fetchSummaries(false, filter, '', '');
    };

    const formatDateStr = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const renderSummary = ({ item }: { item: BillSummary }) => (
        <View style={styles.summaryCard}>
            <View style={styles.cardHeader}>
                <View style={styles.dateBadge}>
                    <Ionicons name="calendar" size={14} color="#ff6600" style={{ marginRight: 6 }} />
                    <Text style={styles.dateText}>{formatDateStr(item.date)}</Text>
                </View>
                <Text style={styles.amountText}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Bills</Text>
                    <Text style={styles.statValue}>{item.totalBills}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Customers</Text>
                    <Text style={styles.statValue}>{item.customerCount}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Full Bleed Orange Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : 40 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bill Summary</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Date Filters */}
            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    <TouchableOpacity 
                        style={[styles.filterPill, dateFilter === 'today' && styles.filterPillActive]}
                        onPress={() => setQuickFilter('today')}
                    >
                        <Text style={[styles.filterPillText, dateFilter === 'today' && styles.filterPillTextActive]}>Today</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.filterPill, dateFilter === 'yesterday' && styles.filterPillActive]}
                        onPress={() => setQuickFilter('yesterday')}
                    >
                        <Text style={[styles.filterPillText, dateFilter === 'yesterday' && styles.filterPillTextActive]}>Yesterday</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.filterPill, dateFilter === 'custom' && styles.filterPillActive]}
                        onPress={() => setShowPicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={14} color={dateFilter === 'custom' ? '#fff' : '#666'} style={{ marginRight: 4 }} />
                        <Text style={[styles.filterPillText, dateFilter === 'custom' && styles.filterPillTextActive]}>
                            {dateFilter === 'custom' && startDate ? startDate : 'Select Date'}
                        </Text>
                    </TouchableOpacity>
                    
                    {(dateFilter !== '') && (
                        <TouchableOpacity 
                            style={[styles.filterPill, { backgroundColor: '#ffebee', borderColor: '#ffcdd2' }]}
                            onPress={() => setQuickFilter('')}
                        >
                            <Text style={[styles.filterPillText, { color: '#d32f2f' }]}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>

            {/* List Section */}
            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#ff6600" />
                </View>
            ) : (
                <FlatList
                    data={summaries}
                    keyExtractor={(item, index) => item.date + index}
                    renderItem={renderSummary}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    onRefresh={() => fetchSummaries(true)}
                    refreshing={refreshing}
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <Ionicons name="document-text-outline" size={60} color="#ddd" />
                            <Text style={styles.emptyText}>No summaries found</Text>
                        </View>
                    }
                />
            )}

            {/* Date Picker */}
            {showPicker && (
                <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f9f6' },
    
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingBottom: 15, 
        backgroundColor: '#ff6600',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        zIndex: 10
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    backBtn: { padding: 4 },
    
    filtersContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    filterPillActive: {
        backgroundColor: '#ff6600',
        borderColor: '#ff6600',
    },
    filterPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    filterPillTextActive: {
        color: '#fff',
    },
    
    listContainer: {
        padding: 15,
        paddingBottom: 100,
    },
    
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5eb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffe0b2'
    },
    dateText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ff6600',
    },
    amountText: {
        fontSize: 22,
        fontWeight: '900',
        color: '#111',
    },
    cardBody: {
        flexDirection: 'row',
        backgroundColor: '#fafafa',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#eee',
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        fontWeight: '600',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#333',
    },
    
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 50,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#999',
        marginTop: 15,
    },
});

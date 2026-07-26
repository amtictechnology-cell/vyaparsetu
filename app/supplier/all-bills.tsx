import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';
import { BASE_URL } from '../../constants/Config';

interface BillItem {
    _id: string;
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    amount: number;
}

interface Bill {
    _id: string;
    supplierId: string;
    customerId: string;
    customerSR: string;
    customerName: string;
    mobileNumber: string;
    shopName: string;
    billNumber: string;
    items: BillItem[];
    grandTotal: number;
    paymentStatus: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export default function AllBillsScreen() {
    const router = useRouter();
    
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Filters
    const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'custom' | ''>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Date Picker States
    const [showPicker, setShowPicker] = useState(false);
    const [dateValue, setDateValue] = useState(new Date());

    const fetchBills = useCallback(async (isRefresh = false, activeDateFilter = dateFilter, start = startDate, end = endDate, search = searchQuery) => {
        try {
            if (isRefresh) setRefreshing(true); else setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            
            let url = `${BASE_URL}/supplier/customer-bill`;
            const params = [];
            
            if (activeDateFilter === 'today' || activeDateFilter === 'yesterday') {
                params.push(`dateFilter=${activeDateFilter}`);
            } else if (start && end) {
                params.push(`startDate=${start}`);
                params.push(`endDate=${end}`);
            }
            
            if (search.trim()) {
                if (search.toUpperCase().includes('BILL')) {
                    params.push(`billNumber=${encodeURIComponent(search.trim())}`);
                } else {
                    params.push(`customerName=${encodeURIComponent(search.trim())}`);
                }
            }

            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && data.success && data.data) {
                setBills(data.data);
            } else {
                setBills([]);
            }
        } catch (e) {
            console.error('Fetch bills error:', e);
            setBills([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateFilter, startDate, endDate, searchQuery]);

    useEffect(() => {
        // Default filter to today
        setDateFilter('today');
        fetchBills(false, 'today', '', '', '');
    }, []);

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
            setEndDate(formattedDate); // Single day selection
            fetchBills(false, 'custom', formattedDate, formattedDate, searchQuery);
        }
    };

    const handleSearch = () => {
        fetchBills(false, dateFilter, startDate, endDate, searchQuery);
    };

    const clearSearch = () => {
        setSearchQuery('');
        fetchBills(false, dateFilter, startDate, endDate, '');
    };

    const setQuickFilter = (filter: 'today' | 'yesterday' | '') => {
        setDateFilter(filter);
        setStartDate('');
        setEndDate('');
        fetchBills(false, filter, '', '', searchQuery);
    };

    const formatDateStr = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const renderBill = ({ item }: { item: Bill }) => (
        <View style={styles.billCard}>
            <View style={styles.billHeader}>
                <Text style={styles.billNumber}>{item.billNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.paymentStatus === 'done' ? '#e8f5e9' : '#fff3e0' }]}>
                    <Text style={[styles.statusText, { color: item.paymentStatus === 'done' ? '#2e7d32' : '#e65100' }]}>
                        {item.paymentStatus === 'done' ? 'PAID' : 'PENDING'}
                    </Text>
                </View>
            </View>
            <View style={styles.billInfo}>
                <Text style={styles.customerName}>{item.customerName || 'Unknown Customer'}</Text>
                <Text style={styles.dateText}>{formatDateStr(item.createdAt)}</Text>
            </View>
            <View style={styles.billFooter}>
                <Text style={styles.itemsText}>{item.items?.length || 0} items</Text>
                <Text style={styles.amountText}>₹{item.grandTotal || 0}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Section */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 40 : 20 }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={28} color="#111" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Customer Bills</Text>
                    <Text style={styles.headerSub}>View generated bills</Text>
                </View>
            </View>

            {/* Filters Section */}
            <View style={styles.filtersContainer}>
                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search customer or bill no..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={clearSearch}>
                            <Ionicons name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Date Filters */}
                <View style={styles.dateFilters}>
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
            </View>

            {/* List Section */}
            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#0c831f" />
                </View>
            ) : (
                <>
                    {bills.length > 0 && (
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>
                                {dateFilter === 'today' ? "Today's Total Billing" : 
                                 dateFilter === 'yesterday' ? "Yesterday's Total Billing" : 
                                 "Total Billing Amount"}
                            </Text>
                            <Text style={styles.summaryAmount}>
                                ₹{bills.reduce((sum, bill) => sum + (bill.grandTotal || 0), 0)}
                            </Text>
                        </View>
                    )}
                    <FlatList
                        data={bills}
                        keyExtractor={(item) => item._id}
                        renderItem={renderBill}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        onRefresh={() => fetchBills(true)}
                        refreshing={refreshing}
                        ListEmptyComponent={
                            <View style={styles.centerContainer}>
                                <Ionicons name="receipt-outline" size={60} color="#ddd" />
                                <Text style={styles.emptyText}>No bills found</Text>
                                <Text style={styles.emptySubText}>Try changing the date or search filters.</Text>
                            </View>
                        }
                    />
                </>
            )}

            {/* Date Picker Modal (Android overlay / iOS popup) */}
            {showPicker && (
                <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
    headerSub: { fontSize: 12, color: '#777', fontWeight: '600' },
    
    filtersContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f3f5',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 44,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
    },
    dateFilters: {
        flexDirection: 'row',
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
        backgroundColor: '#0c831f',
        borderColor: '#0c831f',
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
        backgroundColor: '#e8f5e9',
        marginHorizontal: 15,
        marginTop: 15,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#c8e6c9',
    },
    summaryTitle: {
        fontSize: 14,
        color: '#2e7d32',
        fontWeight: '600',
        marginBottom: 4,
    },
    summaryAmount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1b5e20',
    },
    billCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    billHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    billNumber: {
        fontSize: 12,
        fontWeight: '800',
        color: '#8e24aa',
        backgroundColor: '#f3e5f5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    billInfo: {
        marginBottom: 10,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    billFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 10,
    },
    itemsText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '600',
    },
    amountText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111',
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
    emptySubText: {
        fontSize: 13,
        color: '#aaa',
        marginTop: 5,
        textAlign: 'center',
    },
});

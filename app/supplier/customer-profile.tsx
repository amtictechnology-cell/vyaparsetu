import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const BASE_URL = 'http://192.168.31.192:6000/api/v1';

// ---------- Types ----------
interface BillItem {
    id: string;
    itemName: string;
    itemPrice: number | string;
    quantity: number | string;
}

interface RateItem {
    itemName: string;
    itemPrice: number;
}

interface Bill {
    _id?: string;
    billNumber: string;
    grandTotal: number;
    paymentStatus: 'pending' | 'done';
    createdAt: string;
    items?: any[];
}

// ---------- Component ----------
export default function SupplierCustomerProfile() {
    const router = useRouter();
    const { customerId } = useLocalSearchParams();
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Bill state
    const [billItems, setBillItems] = useState<BillItem[]>([
        { id: Date.now().toString(), itemName: '', itemPrice: '', quantity: '' },
    ]);
    const [notes, setNotes] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'done'>('done');
    const [creatingBill, setCreatingBill] = useState(false);

    // Bill history
    const [bills, setBills] = useState<Bill[]>([]);
    const [billsLoading, setBillsLoading] = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState(false);

    // Item picker modal
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerRowId, setPickerRowId] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [rateList, setRateList] = useState<RateItem[]>([]);
    const [rateLoading, setRateLoading] = useState(false);

    // Success animation
    const successOpacity = useRef(new Animated.Value(0)).current;

    const getToken = async () => AsyncStorage.getItem('userToken');

    // ---------- Fetch customer ----------
    useEffect(() => {
        const fetchCustomerDetail = async () => {
            if (!customerId) return;
            try {
                const token = await getToken();
                const res = await fetch(`${BASE_URL}/supplier/customer?customerId=${customerId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    const found = Array.isArray(data.data)
                        ? data.data.find((c: any) => c._id === customerId)
                        : data.data;
                    setCustomer(found);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchCustomerDetail();
    }, [customerId]);

    // ---------- Fetch bill history ----------
    const fetchBills = async () => {
        if (!customerId) return;
        setBillsLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/bill?customerId=${customerId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setBills(data.data || []);
            }
        } catch (e) {
            console.error('fetchBills error:', e);
        } finally {
            setBillsLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, [customerId]);

    // ---------- Fetch supplier rate list ----------
    const fetchRateList = async () => {
        setRateLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/rate-list`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setRateList(data.data?.items || data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setRateLoading(false);
        }
    };

    // ---------- Contact actions ----------
    const handleCall = () => {
        if (customer?.mobileNumber) Linking.openURL(`tel:${customer.mobileNumber}`);
    };
    const handleWhatsApp = () => {
        if (customer?.mobileNumber) Linking.openURL(`whatsapp://send?phone=91${customer.mobileNumber}`);
    };

    // ---------- Bill row helpers ----------
    const addRow = () => {
        setBillItems(prev => [
            ...prev,
            { id: Date.now().toString(), itemName: '', itemPrice: '', quantity: '' },
        ]);
    };

    const removeRow = (id: string) => {
        if (billItems.length === 1) return; // at least one row
        setBillItems(prev => prev.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: keyof BillItem, value: string) => {
        setBillItems(prev =>
            prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
        );
    };

    const getAmount = (item: BillItem) => {
        const p = parseFloat(String(item.itemPrice)) || 0;
        const q = parseFloat(String(item.quantity)) || 0;
        return p * q;
    };

    const grandTotal = billItems.reduce((sum, it) => sum + getAmount(it), 0);

    // ---------- Item picker ----------
    const openPicker = (rowId: string) => {
        setPickerRowId(rowId);
        setSearchText('');
        fetchRateList();
        setPickerVisible(true);
    };

    const selectItem = (item: RateItem) => {
        if (!pickerRowId) return;
        setBillItems(prev =>
            prev.map(r =>
                r.id === pickerRowId
                    ? { ...r, itemName: item.itemName, itemPrice: item.itemPrice }
                    : r
            )
        );
        setPickerVisible(false);
    };

    const confirmManualItem = () => {
        if (!pickerRowId || !searchText.trim()) return;
        setBillItems(prev =>
            prev.map(r =>
                r.id === pickerRowId ? { ...r, itemName: searchText.trim() } : r
            )
        );
        setPickerVisible(false);
    };

    const filteredRate = rateList.filter(r =>
        r.itemName.toLowerCase().includes(searchText.toLowerCase())
    );

    // ---------- Create Bill ----------
    const handleCreateBill = async () => {
        const validItems = billItems.filter(
            it => it.itemName.trim() && Number(it.quantity) > 0
        );
        if (validItems.length === 0) {
            Alert.alert('Error', 'Kam se kam ek item aur quantity daalo.');
            return;
        }

        const payload = {
            customerId,
            items: validItems.map(it => ({
                itemName: it.itemName.trim(),
                itemPrice: parseFloat(String(it.itemPrice)) || 0,
                quantity: parseFloat(String(it.quantity)),
            })),
            paymentStatus,
            notes: notes.trim() || undefined,
        };

        setCreatingBill(true);
        try {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/bill`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showSuccess();
                // reset
                setBillItems([{ id: Date.now().toString(), itemName: '', itemPrice: '', quantity: '' }]);
                setNotes('');
                setPaymentStatus('done');
                fetchBills(); // Refresh history
                Alert.alert(
                    '✅ Bill Bana Diya!',
                    `Bill No: ${data.data?.billNumber}\nTotal: ₹${data.data?.grandTotal}`,
                );
            } else {
                Alert.alert('Error', data.message || 'Bill nahi bana.');
            }
        } catch (e) {
            Alert.alert('Network Error', 'Server se connect nahi ho paya.');
        } finally {
            setCreatingBill(false);
        }
    };

    const showSuccess = () => {
        Animated.sequence([
            Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(1500),
            Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    };

    // ---------- Loading / Not found ----------
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0c831f" />
            </View>
        );
    }

    if (!customer) {
        return (
            <View style={styles.center}>
                <Text>Customer not found</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: '#0c831f', marginTop: 10 }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ---------- Render ----------
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Customer Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* Profile Card — horizontal layout */}
                    <View style={styles.profileCard}>
                        <View style={styles.profileRow}>
                            {/* Avatar */}
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {customer.customerName?.charAt(0).toUpperCase()}
                                </Text>
                            </View>

                            {/* Name / Mobile / Shop */}
                            <View style={styles.profileInfo}>
                                <Text style={styles.custName} numberOfLines={1}>{customer.customerName}</Text>
                                <View style={styles.infoRow}>
                                    <Ionicons name="call-outline" size={13} color="#888" />
                                    <Text style={styles.infoText}>+91 {customer.mobileNumber}</Text>
                                </View>
                                {customer.shopName ? (
                                    <View style={styles.infoRow}>
                                        <Ionicons name="storefront-outline" size={13} color="#888" />
                                        <Text style={styles.infoText} numberOfLines={1}>{customer.shopName}</Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Action icons */}
                            <View style={styles.profileActions}>
                                <TouchableOpacity style={styles.iconActionBtn} onPress={handleCall}>
                                    <Ionicons name="call" size={20} color="#1565c0" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: '#e8f5e9' }]} onPress={handleWhatsApp}>
                                    <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* ===== Create Bill Section ===== */}
                    <View style={styles.billSection}>
                        {/* Title row */}
                        <View style={styles.billTitleRow}>
                            <View style={styles.billTitleLeft}>
                                <Ionicons name="receipt-outline" size={20} color="#0c831f" />
                                <Text style={styles.billSectionTitle}>Naya Bill Banao</Text>
                            </View>
                            <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
                                <Ionicons name="add-circle" size={28} color="#0c831f" />
                            </TouchableOpacity>
                        </View>

                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.thText, styles.colSr]}>#</Text>
                            <Text style={[styles.thText, styles.colItem]}>Item</Text>
                            <Text style={[styles.thText, styles.colPrice]}>Price</Text>
                            <Text style={[styles.thText, styles.colQty]}>Qty</Text>
                            <Text style={[styles.thText, styles.colAmt]}>Amt</Text>
                            <Text style={[styles.thText, styles.colDel]}> </Text>
                        </View>

                        {/* Bill Rows */}
                        {billItems.map((item, idx) => (
                            <View key={item.id} style={styles.tableRow}>
                                {/* SR */}
                                <Text style={[styles.srText, styles.colSr]}>{idx + 1}</Text>

                                {/* Item Name — tap to open picker */}
                                <TouchableOpacity
                                    style={[styles.itemNameBtn, styles.colItem]}
                                    onPress={() => openPicker(item.id)}
                                >
                                    <Text
                                        style={[
                                            styles.itemNameText,
                                            !item.itemName && { color: '#bbb' },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {item.itemName || 'Tap to select'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={12} color="#aaa" />
                                </TouchableOpacity>

                                {/* Price */}
                                <TextInput
                                    style={[styles.cellInput, styles.colPrice]}
                                    value={String(item.itemPrice)}
                                    onChangeText={v => updateRow(item.id, 'itemPrice', v)}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor="#ccc"
                                />

                                {/* Quantity */}
                                <TextInput
                                    style={[styles.cellInput, styles.colQty]}
                                    value={String(item.quantity)}
                                    onChangeText={v => updateRow(item.id, 'quantity', v)}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor="#ccc"
                                />

                                {/* Amount */}
                                <Text style={[styles.amtText, styles.colAmt]}>
                                    ₹{getAmount(item).toFixed(0)}
                                </Text>

                                {/* Delete row */}
                                <TouchableOpacity
                                    style={styles.colDel}
                                    onPress={() => removeRow(item.id)}
                                >
                                    <Ionicons
                                        name="close-circle"
                                        size={20}
                                        color={billItems.length === 1 ? '#ddd' : '#ff5252'}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Grand Total */}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
                        </View>

                        {/* Payment Status Toggle */}
                        <View style={styles.statusToggleRow}>
                            <Text style={styles.statusToggleLabel}>Payment Status:</Text>
                            <View style={styles.statusToggleGroup}>
                                <TouchableOpacity
                                    style={[
                                        styles.statusToggleBtn,
                                        paymentStatus === 'pending' && styles.statusToggleBtnActivePending,
                                    ]}
                                    onPress={() => setPaymentStatus('pending')}
                                >
                                    <Ionicons
                                        name="time-outline"
                                        size={14}
                                        color={paymentStatus === 'pending' ? '#fff' : '#e65100'}
                                    />
                                    <Text style={[
                                        styles.statusToggleBtnText,
                                        paymentStatus === 'pending' && { color: '#fff' },
                                    ]}>Pending</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.statusToggleBtn,
                                        paymentStatus === 'done' && styles.statusToggleBtnActiveDone,
                                    ]}
                                    onPress={() => setPaymentStatus('done')}
                                >
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={14}
                                        color={paymentStatus === 'done' ? '#fff' : '#0c831f'}
                                    />
                                    <Text style={[
                                        styles.statusToggleBtnText,
                                        paymentStatus === 'done' && { color: '#fff' },
                                    ]}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Notes */}
                        <TextInput
                            style={styles.notesInput}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Notes (optional) — e.g. Kal tak payment ho jayegi"
                            placeholderTextColor="#bbb"
                            multiline
                            numberOfLines={2}
                        />

                        {/* Create Bill Button */}
                        <TouchableOpacity
                            style={[styles.createBillBtn, creatingBill && { opacity: 0.7 }]}
                            onPress={handleCreateBill}
                            disabled={creatingBill}
                        >
                            {creatingBill ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text style={styles.createBillText}>Bill Banao</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* ===== Bill History Section ===== */}
                    <View style={styles.historySection}>
                        {/* Expand toggle */}
                        <TouchableOpacity
                            style={styles.historyHeaderRow}
                            onPress={() => {
                                if (!historyExpanded) fetchBills();
                                setHistoryExpanded(v => !v);
                            }}
                        >
                            <View style={styles.historyHeaderLeft}>
                                <Ionicons name="document-text-outline" size={20} color="#0c831f" />
                                <Text style={styles.historyTitle}>Bill History</Text>
                                {bills.length > 0 && (
                                    <View style={styles.billCountBadge}>
                                        <Text style={styles.billCountText}>{bills.length}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {billsLoading && <ActivityIndicator size="small" color="#0c831f" />}
                                <Ionicons
                                    name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color="#0c831f"
                                />
                            </View>
                        </TouchableOpacity>

                        {historyExpanded && (
                            <>
                                {billsLoading ? (
                                    <ActivityIndicator color="#0c831f" style={{ marginVertical: 20 }} />
                                ) : bills.length === 0 ? (
                                    <View style={styles.emptyHistory}>
                                        <Ionicons name="receipt-outline" size={36} color="#ddd" />
                                        <Text style={styles.emptyHistoryText}>Koi bill nahi mila</Text>
                                    </View>
                                ) : (
                                    bills.map((bill) => (
                                        <View key={bill.billNumber} style={styles.billCard}>
                                            {/* Top row: bill number + total + whatsapp */}
                                            <View style={styles.billCardTopRow}>
                                                <View style={styles.billCardLeft}>
                                                    <Text style={styles.billNumber}>{bill.billNumber}</Text>
                                                    <Text style={styles.billDate}>
                                                        {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric'
                                                        })}
                                                    </Text>
                                                </View>
                                                <View style={styles.billCardRight}>
                                                    <Text style={styles.billTotal}>₹{bill.grandTotal}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <View style={[
                                                            styles.billStatusBadge,
                                                            { backgroundColor: bill.paymentStatus === 'done' ? '#e8f5e9' : '#fff3e0' }
                                                        ]}>
                                                            <View style={[
                                                                styles.billStatusDot,
                                                                { backgroundColor: bill.paymentStatus === 'done' ? '#0c831f' : '#e65100' }
                                                            ]} />
                                                            <Text style={[
                                                                styles.billStatusText,
                                                                { color: bill.paymentStatus === 'done' ? '#0c831f' : '#e65100' }
                                                            ]}>
                                                                {bill.paymentStatus === 'done' ? 'Done' : 'Pending'}
                                                            </Text>
                                                        </View>
                                                        {/* WhatsApp share */}
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                const itemLines = (bill.items || []).map((it: any) =>
                                                                    `• ${it.itemName} x${it.quantity} = ₹${it.itemPrice * it.quantity}`
                                                                ).join('\n');
                                                                const msg = `*Bill: ${bill.billNumber}*\nCustomer: ${customer.customerName}\n\n${itemLines}\n\n*Total: ₹${bill.grandTotal}*\nStatus: ${bill.paymentStatus === 'done' ? '✅ Done' : '⏳ Pending'}`;
                                                                Linking.openURL(`whatsapp://send?phone=91${customer.mobileNumber}&text=${encodeURIComponent(msg)}`);
                                                            }}
                                                        >
                                                            <Ionicons name="logo-whatsapp" size={22} color="#25d366" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                            {/* Items list */}
                                            {(bill.items || []).length > 0 && (
                                                <View style={styles.billItemsList}>
                                                    {(bill.items || []).map((it: any, i: number) => (
                                                        <View key={i} style={styles.billItemRow}>
                                                            <Text style={styles.billItemName} numberOfLines={1}>{it.itemName}</Text>
                                                            <Text style={styles.billItemDetail}>x{it.quantity}  ₹{it.itemPrice * it.quantity}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    ))
                                )}
                            </>
                        )}
                    </View>

                    <View style={{ height: 30 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Success Toast */}
            <Animated.View style={[styles.successToast, { opacity: successOpacity }]}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.successToastText}>Bill Successfully Created!</Text>
            </Animated.View>

            {/* ===== Item Picker Modal ===== */}
            <Modal
                visible={pickerVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Item Chuniye</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Search / Manual Input */}
                        <View style={styles.searchRow}>
                            <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.searchInput}
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholder="Naam likhiye ya neeche se chuniye..."
                                placeholderTextColor="#bbb"
                                autoFocus
                            />
                        </View>

                        {/* Confirm manual entry button */}
                        {searchText.trim().length > 0 && (
                            <TouchableOpacity
                                style={styles.manualConfirmBtn}
                                onPress={confirmManualItem}
                            >
                                <Ionicons name="add-circle-outline" size={18} color="#0c831f" />
                                <Text style={styles.manualConfirmText}>
                                    "{searchText.trim()}" use karo
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Rate list */}
                        <Text style={styles.rateListLabel}>Aapke Items:</Text>

                        {rateLoading ? (
                            <ActivityIndicator color="#0c831f" style={{ marginTop: 20 }} />
                        ) : filteredRate.length === 0 ? (
                            <Text style={styles.emptyRate}>Koi item nahi mila. Upar naam likhke add karein.</Text>
                        ) : (
                            <FlatList
                                data={filteredRate}
                                keyExtractor={(_, i) => String(i)}
                                style={{ maxHeight: 320 }}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.rateCard}
                                        onPress={() => selectItem(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rateItemName}>{item.itemName}</Text>
                                        </View>
                                        <View style={styles.ratePriceBadge}>
                                            <Text style={styles.rateItemPrice}>₹{item.itemPrice}</Text>
                                        </View>
                                        <Ionicons name="add-circle-outline" size={20} color="#0c831f" style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 10,
        backgroundColor: '#ffae00ff',
    },
    backBtn: { padding: 8 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

    // Profile card
    profileCard: {
        backgroundColor: '#fff',
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0c831f20',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0c831f',
        flexShrink: 0,
    },
    avatarText: { fontSize: 22, fontWeight: '900', color: '#0c831f' },
    profileInfo: { flex: 1, gap: 3 },
    custName: { fontSize: 17, fontWeight: '900', color: '#111' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    infoText: { fontSize: 13, color: '#666', fontWeight: '600', flex: 1 },
    profileActions: { flexDirection: 'column', gap: 8, alignItems: 'center' },
    iconActionBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ===== Bill Section =====
    billSection: {
        marginTop: 20,
        backgroundColor: '#fff',
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    billTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    billTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    billSectionTitle: { fontSize: 16, fontWeight: '800', color: '#0c831f' },
    addRowBtn: { padding: 2 },

    // Table
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0faf2',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginBottom: 4,
    },
    thText: { fontSize: 11, fontWeight: '800', color: '#0c831f', textTransform: 'uppercase' },

    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },

    // Columns
    colSr: { width: 22, textAlign: 'center' },
    colItem: { flex: 2, marginHorizontal: 4 },
    colPrice: { width: 56, textAlign: 'center' },
    colQty: { width: 44, textAlign: 'center' },
    colAmt: { width: 52, textAlign: 'right' },
    colDel: { width: 28, alignItems: 'center' },

    srText: { fontSize: 13, color: '#888', fontWeight: '700', textAlign: 'center' },

    itemNameBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#eee',
        gap: 4,
    },
    itemNameText: { fontSize: 13, color: '#333', fontWeight: '600', flex: 1 },

    cellInput: {
        fontSize: 13,
        color: '#333',
        fontWeight: '700',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        paddingHorizontal: 6,
        paddingVertical: 6,
        textAlign: 'center',
    },

    amtText: { fontSize: 13, color: '#0c831f', fontWeight: '800', textAlign: 'right' },

    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: '#e8f5e9',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    totalLabel: { fontSize: 14, fontWeight: '800', color: '#333' },
    totalValue: { fontSize: 18, fontWeight: '900', color: '#0c831f' },

    notesInput: {
        marginTop: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        color: '#444',
        minHeight: 56,
        textAlignVertical: 'top',
    },

    createBillBtn: {
        marginTop: 14,
        backgroundColor: '#0c831f',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        elevation: 3,
    },
    createBillText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    // Payment Status Toggle
    statusToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 10,
    },
    statusToggleLabel: { fontSize: 13, fontWeight: '700', color: '#555' },
    statusToggleGroup: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end' },
    statusToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#ddd',
        backgroundColor: '#f9f9f9',
    },
    statusToggleBtnActivePending: {
        backgroundColor: '#e65100',
        borderColor: '#e65100',
    },
    statusToggleBtnActiveDone: {
        backgroundColor: '#0c831f',
        borderColor: '#0c831f',
    },
    statusToggleBtnText: { fontSize: 13, fontWeight: '800', color: '#555' },

    // Bill History Section
    historySection: {
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: '#fff',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    historyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        borderBottomWidth: 0,
    },
    historyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyTitle: { fontSize: 15, fontWeight: '800', color: '#0c831f' },
    billCountBadge: {
        backgroundColor: '#e8f5e9',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    billCountText: { fontSize: 12, fontWeight: '800', color: '#0c831f' },
    emptyHistory: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyHistoryText: { fontSize: 13, color: '#bbb', fontWeight: '600' },
    billCard: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    billCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    billCardLeft: { gap: 3 },
    billCardRight: { alignItems: 'flex-end', gap: 5 },
    billItemsList: {
        marginTop: 8,
        backgroundColor: '#f8fbf8',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 4,
    },
    billItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    billItemName: { fontSize: 12, color: '#444', fontWeight: '600', flex: 1 },
    billItemDetail: { fontSize: 12, color: '#0c831f', fontWeight: '700' },
    billNumber: { fontSize: 14, fontWeight: '800', color: '#222' },
    billDate: { fontSize: 12, color: '#888', fontWeight: '600' },
    billTotal: { fontSize: 16, fontWeight: '900', color: '#0c831f' },
    billStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
    },
    billStatusDot: { width: 7, height: 7, borderRadius: 4 },
    billStatusText: { fontSize: 11, fontWeight: '800' },

    // Success Toast
    successToast: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: '#0c831f',
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        elevation: 8,
    },
    successToastText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    // ===== Item Picker Modal =====
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 30,
        paddingTop: 16,
        minHeight: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#111' },

    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e8f5e9',
    },
    searchInput: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },

    manualConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#e8f5e9',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
    },
    manualConfirmText: { fontSize: 14, color: '#0c831f', fontWeight: '700', flex: 1 },

    rateListLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#aaa',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 4,
    },
    rateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    rateItemName: { fontSize: 15, fontWeight: '700', color: '#222' },
    ratePriceBadge: {
        backgroundColor: '#e8f5e9',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    rateItemPrice: { fontSize: 13, fontWeight: '800', color: '#0c831f' },
    emptyRate: { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 20, fontWeight: '600' },
});

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BASE_URL } from '../../constants/Config';

interface CustomerDetail { _id: string; shopName: string; ownerName: string; srNumber: string; mobileNumber: string; status: string; }
interface RateItem { _id: string; itemName: string; itemPrice: number; }
interface CartItem { item: RateItem; quantity: number; }

export default function CustomerProfile() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const customerId = (params.customerId || params.id) as string;

    const [custDetail, setCustDetail] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Bill creation states
    const [addBillModalVisible, setAddBillModalVisible] = useState(false);
    const [cartMode, setCartMode] = useState(false); // false = select items, true = view cart
    const [rateList, setRateList] = useState<RateItem[]>([]);
    const [rateLoading, setRateLoading] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    
    // Payment & Notes
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'done'>('pending');
    const [notes, setNotes] = useState('');
    const [creatingBill, setCreatingBill] = useState(false);

    // Bill history
    const [bills, setBills] = useState<any[]>([]);
    const [billsLoading, setBillsLoading] = useState(false);
    
    // Payments
    const [payments, setPayments] = useState<any[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    
    // Payment Modal
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [creatingPayment, setCreatingPayment] = useState(false);
    // Toast
    const [showToast, setShowToast] = useState(false);

    const getToken = async () => AsyncStorage.getItem('userToken');

    const fetchCustomerDetail = useCallback(async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/customer?customerId=${customerId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.success) {
                const found = Array.isArray(data.data) ? data.data.find((c: any) => c._id === customerId) : data.data;
                setCustDetail(found);
            }
        } catch { } finally { setLoading(false); }
    }, [customerId]);

    const fetchBills = async () => {
        try {
            setBillsLoading(true);
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/customer-bill?customerId=${customerId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.success) setBills(Array.isArray(data.data) ? data.data : []);
        } catch { } finally { setBillsLoading(false); }
    };

    const fetchPayments = async () => {
        try {
            setPaymentsLoading(true);
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/customer-payment?customerId=${customerId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.success) setPayments(Array.isArray(data.data) ? data.data : []);
        } catch { } finally { setPaymentsLoading(false); }
    };

    useEffect(() => { if (customerId) { fetchCustomerDetail(); fetchBills(); fetchPayments(); } }, [customerId, fetchCustomerDetail]);

    // Open Modal and Fetch Rate List
    const handleOpenBillModal = async () => {
        setCart([]); // reset cart
        setCartMode(false);
        setNotes('');
        setPaymentStatus('pending');
        setAddBillModalVisible(true);
        setRateLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/rate-list`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) setRateList(data.data?.items || []);
        } catch (e) { Alert.alert('Error', 'Could not load rate list'); }
        finally { setRateLoading(false); }
    };

    const handleAddToCart = (item: RateItem, qtyChange: number) => {
        setCart(prev => {
            const existing = prev.find(c => c.item._id === item._id);
            if (existing) {
                const newQty = existing.quantity + qtyChange;
                if (newQty <= 0) return prev.filter(c => c.item._id !== item._id);
                return prev.map(c => c.item._id === item._id ? { ...c, quantity: newQty } : c);
            }
            if (qtyChange > 0) return [...prev, { item, quantity: qtyChange }];
            return prev;
        });
    };

    const getCartQty = (itemId: string) => {
        return cart.find(c => c.item._id === itemId)?.quantity || 0;
    };

    const cartTotalAmount = cart.reduce((acc, c) => acc + (c.item.itemPrice * c.quantity), 0);
    const cartTotalItems = cart.reduce((acc, c) => acc + c.quantity, 0);

    const handleMakePayment = async () => {
        if (!paymentAmount.trim()) { Alert.alert('Error', 'Amount dalna zaroori hai'); return; }
        setCreatingPayment(true);
        try {
            const token = await getToken();
            const payload = {
                customerId,
                amount: Number(paymentAmount),
                paymentMode: paymentMode,
                notes: paymentNotes.trim() || undefined,
                date: paymentDate.toISOString()
            };
            const res = await fetch(`${BASE_URL}/supplier/customer-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setPaymentModalVisible(false);
                setPaymentAmount('');
                setPaymentNotes('');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2500);
                fetchPayments(); // Refresh payments
            } else {
                Alert.alert('Error', data.message || 'Payment fail ho gayi.');
            }
        } catch { Alert.alert('Network Error', 'Server error'); }
        finally { setCreatingPayment(false); }
    };

    const handleCreateBill = async () => {
        if (cart.length === 0) { Alert.alert('Error', 'Cart is empty'); return; }
        setCreatingBill(true);
        try {
            const token = await getToken();
            const payload = {
                customerId,
                items: cart.map(c => ({ itemName: c.item.itemName, itemPrice: c.item.itemPrice, quantity: c.quantity })),
                paymentStatus,
                notes: notes.trim() || undefined
            };
            const res = await fetch(`${BASE_URL}/supplier/customer-bill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAddBillModalVisible(false);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2500);
                fetchBills();
            } else {
                Alert.alert('Error', data.message || 'Bill generate nahi hua.');
            }
        } catch { Alert.alert('Network Error', 'Server error'); }
        finally { setCreatingBill(false); }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
                <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 40 : 50 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity>
                    <Text style={styles.headerTitle}>Loading...</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#ff6600" /></View>
            </SafeAreaView>
        );
    }

    if (!custDetail) {
        return (
            <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
                <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 40 : 50 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity>
                    <Text style={styles.headerTitle}>Not Found</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Customer not found.</Text></View>
            </SafeAreaView>
        );
    }

    // Calculations
    const totalBill = bills.reduce((acc, bill) => acc + (bill.grandTotal || 0), 0);
    const pendingBillTotal = bills.filter(b => b.paymentStatus === 'pending').reduce((acc, bill) => acc + (bill.grandTotal || 0), 0);
    const totalReceived = payments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
    const outstanding = pendingBillTotal - totalReceived;

    const mixedFeed = [
        ...bills.map(b => ({ ...b, feedType: 'bill' })),
        ...payments.map(p => ({ ...p, feedType: 'payment' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 40 : 50 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={28} color="#fff" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{(custDetail.ownerName || custDetail.shopName || 'Customer')}'s Profile</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}><Text style={styles.avatarText}>{(custDetail.ownerName || custDetail.shopName || 'C').charAt(0).toUpperCase()}</Text></View>
                        <View style={styles.infoCol}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.ownerName}>{custDetail.ownerName || custDetail.shopName || 'Customer'}</Text>
                                <View style={styles.srBadge}><Text style={styles.srBadgeText}>SR: {custDetail.srNumber}</Text></View>
                            </View>
                            <Text style={styles.shopName}><Ionicons name="storefront-outline" size={13} color="#666" /> {custDetail.shopName}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.contactRow}>
                        <View style={styles.contactItem}>
                            <Ionicons name="call" size={16} color="#ff6600" />
                            <Text style={styles.mobileText}>{custDetail.mobileNumber}</Text>
                        </View>
                        <View style={[styles.statusBadge, custDetail.status === 'active' ? { backgroundColor: '#fff5eb' } : { backgroundColor: '#ffebee' }]}>
                            <Text style={[styles.statusText, custDetail.status === 'active' ? { color: '#ff6600' } : { color: '#d32f2f' }]}>
                                {custDetail.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Summary Section */}
                <View style={[styles.summaryContainer, { paddingHorizontal: 10 }]}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total</Text>
                        <Text style={[styles.summaryValue, { color: '#333' }]}>₹{totalBill}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Pending</Text>
                        <Text style={[styles.summaryValue, { color: '#ff9800' }]}>₹{pendingBillTotal}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Received</Text>
                        <Text style={[styles.summaryValue, { color: '#4caf50' }]}>₹{totalReceived}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Outstand</Text>
                        <Text style={[styles.summaryValue, { color: outstanding > 0 ? '#d32f2f' : '#333' }]}>₹{outstanding}</Text>
                    </View>
                </View>

                {/* ===== History Section ===== */}
                <View style={styles.historySection}>
                    <View style={styles.historyHeaderRow}>
                        <View style={styles.historyHeaderLeft}>
                            <Ionicons name="document-text-outline" size={20} color="#ff6600" />
                            <Text style={styles.historyTitle}>Khata History</Text>
                        </View>
                        <TouchableOpacity style={styles.paymentBtn} onPress={() => setPaymentModalVisible(true)}>
                            <Ionicons name="wallet-outline" size={16} color="#fff" />
                            <Text style={styles.paymentBtnText}>Make Payment</Text>
                        </TouchableOpacity>
                    </View>

                    <View>
                            {billsLoading || paymentsLoading ? (
                                <ActivityIndicator style={{ padding: 20 }} color="#ff6600" />
                            ) : mixedFeed.length === 0 ? (
                                <View style={styles.emptyHistory}>
                                    <Ionicons name="receipt-outline" size={40} color="#eee" />
                                    <Text style={styles.emptyHistoryText}>Koi hisaab nahi mila</Text>
                                </View>
                            ) : (
                                mixedFeed.map((item, i) => (
                                    item.feedType === 'bill' ? (
                                        <View key={'b'+(item._id || i)} style={styles.billCard}>
                                            <View style={styles.billCardTopRow}>
                                                <View style={styles.billCardLeft}>
                                                    <Text style={styles.billNumber}>Bill #{item.billNumber || '---'}</Text>
                                                    <Text style={styles.billDate}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                                                </View>
                                                <View style={styles.billCardRight}>
                                                    <Text style={[styles.billTotal, { color: '#ff6600' }]}>+₹{item.grandTotal}</Text>
                                                    <Text style={styles.itemNotes}>{item.notes || 'Goods given'}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ) : (
                                        <View key={'p'+(item._id || i)} style={[styles.billCard, { backgroundColor: '#f0fdf4' }]}>
                                            <View style={styles.billCardTopRow}>
                                                <View style={styles.billCardLeft}>
                                                    <Text style={[styles.billNumber, { color: '#166534' }]}>Payment Received</Text>
                                                    <Text style={styles.billDate}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                                                </View>
                                                <View style={styles.billCardRight}>
                                                    <Text style={[styles.billTotal, { color: '#16a34a' }]}>-₹{item.amount}</Text>
                                                    <Text style={styles.itemNotes}>{item.paymentMode ? item.paymentMode.toUpperCase() : (item.notes || 'Cash/Online')}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )
                                ))
                            )}
                        </View>
                </View>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={handleOpenBillModal}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* ===== Add Bill Modal ===== */}
            <Modal visible={addBillModalVisible} animationType="slide" transparent onRequestClose={() => setAddBillModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, cartMode ? { height: '80%' } : { height: '90%' }]}>
                        <View style={styles.handleBar} />
                        
                        <View style={styles.modalHeader}>
                            {cartMode ? (
                                <TouchableOpacity onPress={() => setCartMode(false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="arrow-back" size={24} color="#333" />
                                    <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Cart Summary</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.modalTitle}>Select Items</Text>
                            )}
                            <TouchableOpacity onPress={() => setAddBillModalVisible(false)}>
                                <Ionicons name="close-circle" size={28} color="#ccc" />
                            </TouchableOpacity>
                        </View>

                        {/* SELECT ITEMS MODE */}
                        {!cartMode && (
                            <>
                                {rateLoading ? (
                                    <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#ff6600" /></View>
                                ) : (
                                    <ScrollView contentContainerStyle={styles.itemGrid}>
                                        {rateList.map(item => {
                                            const qty = getCartQty(item._id);
                                            return (
                                                <View key={item._id} style={styles.itemCard}>
                                                    <View style={styles.itemCardImgPlaceholder}><Ionicons name="image-outline" size={32} color="#ddd" /></View>
                                                    <Text style={styles.itemCardPrice}>₹{item.itemPrice}</Text>
                                                    <Text style={styles.itemCardName} numberOfLines={2}>{item.itemName}</Text>
                                                    
                                                    {qty === 0 ? (
                                                        <TouchableOpacity style={styles.itemAddBtn} onPress={() => handleAddToCart(item, 1)}>
                                                            <Text style={styles.itemAddBtnText}>ADD</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <View style={styles.qtyControls}>
                                                            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAddToCart(item, -1)}><Ionicons name="remove" size={18} color="#fff" /></TouchableOpacity>
                                                            <Text style={styles.qtyText}>{qty}</Text>
                                                            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAddToCart(item, 1)}><Ionicons name="add" size={18} color="#fff" /></TouchableOpacity>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                                
                                {/* Bottom Bar for View Cart */}
                                {cartTotalItems > 0 && (
                                    <View style={styles.viewCartBar}>
                                        <View>
                                            <Text style={styles.viewCartItems}>{cartTotalItems} item{cartTotalItems > 1 ? 's' : ''}</Text>
                                            <Text style={styles.viewCartTotal}>Total: ₹{cartTotalAmount}</Text>
                                        </View>
                                        <TouchableOpacity style={styles.viewCartBtn} onPress={() => setCartMode(true)}>
                                            <Text style={styles.viewCartBtnText}>View Cart</Text>
                                            <Ionicons name="arrow-forward" size={18} color="#ff6600" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}

                        {/* CART / SUMMARY MODE */}
                        {cartMode && (
                            <View style={{ flex: 1, justifyContent: 'space-between' }}>
                                <ScrollView style={{ flex: 1 }}>
                                    <View style={styles.cartList}>
                                        {cart.map(c => (
                                            <View key={c.item._id} style={styles.cartRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.cartItemName}>{c.item.itemName}</Text>
                                                    <Text style={styles.cartItemPrice}>₹{c.item.itemPrice} x {c.quantity}</Text>
                                                </View>
                                                <Text style={styles.cartItemTotal}>₹{c.item.itemPrice * c.quantity}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    
                                    <View style={styles.cartDivider} />
                                    
                                    <View style={styles.cartTotalRow}>
                                        <Text style={styles.cartTotalLabel}>Total Amount</Text>
                                        <Text style={styles.cartTotalValue}>₹{cartTotalAmount}</Text>
                                    </View>

                                    {/* Payment Status & Notes */}
                                    <Text style={[styles.label, { marginTop: 20 }]}>Payment Status</Text>
                                    <View style={styles.statusToggleGroup}>
                                        <TouchableOpacity style={[styles.statusToggleBtn, paymentStatus === 'pending' && styles.statusToggleBtnActivePending]} onPress={() => setPaymentStatus('pending')}>
                                            <Ionicons name="time-outline" size={16} color={paymentStatus === 'pending' ? '#fff' : '#888'} />
                                            <Text style={[styles.statusToggleBtnText, paymentStatus === 'pending' && { color: '#fff' }]}>Pending</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.statusToggleBtn, paymentStatus === 'done' && styles.statusToggleBtnActiveDone]} onPress={() => setPaymentStatus('done')}>
                                            <Ionicons name="checkmark-circle-outline" size={16} color={paymentStatus === 'done' ? '#fff' : '#888'} />
                                            <Text style={[styles.statusToggleBtnText, paymentStatus === 'done' && { color: '#fff' }]}>Done</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TextInput 
                                        style={styles.notesInput} 
                                        placeholder="Add note (optional)" 
                                        value={notes} 
                                        onChangeText={setNotes} 
                                        multiline 
                                    />
                                </ScrollView>
                                
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setAddBillModalVisible(false)}><Text style={styles.actionBtnOutlineText}>Cancel</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtnOutline} onPress={() => Alert.alert('Coming Soon', 'Print feature will be added soon')}><Text style={styles.actionBtnOutlineText}>Print</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleCreateBill} disabled={creatingBill}>
                                        {creatingBill ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnPrimaryText}>Save</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Success Toast */}
            {showToast && (
                <View style={styles.successToast}>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.successToastText}>Saved Successfully!</Text>
                </View>
            )}

            {/* Make Payment Modal */}
            <Modal visible={paymentModalVisible} animationType="slide" transparent onRequestClose={() => setPaymentModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => !creatingPayment && setPaymentModalVisible(false)} />
                    <View style={[styles.modalSheet, { height: 'auto', maxHeight: '70%' }]}>
                        <View style={styles.handleBar} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Receive Payment</Text>
                            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}><Ionicons name="close-circle" size={28} color="#ccc" /></TouchableOpacity>
                        </View>
                        
                        <View style={styles.paymentInputWrapper}>
                            <Text style={styles.rupeePrefix}>₹</Text>
                            <TextInput 
                                style={styles.paymentAmountInput} 
                                placeholder="0" 
                                placeholderTextColor="#ccc"
                                keyboardType="numeric" 
                                value={paymentAmount} 
                                onChangeText={setPaymentAmount} 
                                autoFocus 
                            />
                        </View>
                        <View style={[styles.statusToggleGroup, { marginBottom: 20 }]}>
                            <TouchableOpacity 
                                style={[styles.statusToggleBtn, paymentMode === 'cash' && { backgroundColor: '#ff9800' }]} 
                                onPress={() => setPaymentMode('cash')}
                            >
                                <Ionicons name="cash-outline" size={16} color={paymentMode === 'cash' ? '#fff' : '#888'} />
                                <Text style={[styles.statusToggleBtnText, paymentMode === 'cash' && { color: '#fff' }]}>Cash</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.statusToggleBtn, paymentMode === 'online' && { backgroundColor: '#2196f3' }]} 
                                onPress={() => setPaymentMode('online')}
                            >
                                <Ionicons name="phone-portrait-outline" size={16} color={paymentMode === 'online' ? '#fff' : '#888'} />
                                <Text style={[styles.statusToggleBtnText, paymentMode === 'online' && { color: '#fff' }]}>Online</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity 
                            style={styles.datePickerBtn} 
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={18} color="#ff6600" />
                            <Text style={styles.datePickerBtnText}>
                                {paymentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={paymentDate}
                                mode="date"
                                display="default"
                                onChange={(event: DateTimePickerEvent, date?: Date) => {
                                    setShowDatePicker(false);
                                    if (date) setPaymentDate(date);
                                }}
                            />
                        )}

                        <TextInput 
                            style={styles.notesInput} 
                            placeholder="Payment notes (e.g. UPI ID, Check No)" 
                            value={paymentNotes} 
                            onChangeText={setPaymentNotes} 
                        />
                        <View style={[styles.actionRow, { marginBottom: 20 }]}>
                            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setPaymentModalVisible(false)}><Text style={styles.actionBtnOutlineText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleMakePayment} disabled={creatingPayment}>
                                {creatingPayment ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnPrimaryText}>SAVE PAYMENT</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f9f6' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#ff6600' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    backBtn: { padding: 4 },
    content: { padding: 15 },
    
    profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    
    // Summary
    summaryContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginTop: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    summaryBox: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, backgroundColor: '#eee' },
    summaryLabel: { fontSize: 10, fontWeight: '800', color: '#888', marginBottom: 4 },
    summaryValue: { fontSize: 15, fontWeight: '900' },
    
    paymentBtn: { flexDirection: 'row', backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center', gap: 5 },
    paymentBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    itemNotes: { fontSize: 12, color: '#666', fontWeight: '600', marginTop: 4 },
    
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5eb', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, marginBottom: 20, gap: 10, borderWidth: 1, borderColor: '#ffe0b2' },
    datePickerBtnText: { fontSize: 14, fontWeight: '700', color: '#ff6600' },

    paymentInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5eb', borderWidth: 2, borderColor: '#ffe0b2', borderRadius: 16, paddingHorizontal: 20, marginVertical: 20 },
    rupeePrefix: { fontSize: 30, fontWeight: '900', color: '#ff6600', marginRight: 10 },
    paymentAmountInput: { flex: 1, fontSize: 32, fontWeight: '900', color: '#111', paddingVertical: 15 },

    profileHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff5eb', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 24, fontWeight: '900', color: '#ff6600' },
    infoCol: { marginLeft: 16, flex: 1 },
    ownerName: { fontSize: 18, fontWeight: '900', color: '#111' },
    srBadge: { backgroundColor: '#fff5eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    srBadgeText: { fontSize: 11, fontWeight: '900', color: '#ff6600' },
    shopName: { fontSize: 13, color: '#666', marginTop: 4, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
    contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    mobileText: { fontSize: 14, fontWeight: '700', color: '#444' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '900' },

    historySection: { marginTop: 16, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2 },
    historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
    historyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
    emptyHistory: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyHistoryText: { fontSize: 14, color: '#bbb', fontWeight: '600' },
    billCard: { paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    billCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    billCardLeft: { gap: 3 },
    billCardRight: { alignItems: 'flex-end', gap: 5 },
    billNumber: { fontSize: 14, fontWeight: '800', color: '#222' },
    billDate: { fontSize: 12, color: '#888', fontWeight: '600' },
    billTotal: { fontSize: 16, fontWeight: '900', color: '#222' },
    billStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    billStatusDot: { width: 7, height: 7, borderRadius: 4 },
    billStatusText: { fontSize: 11, fontWeight: '800' },

    // FAB
    fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#ff6600', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#ff6600', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 },
    handleBar: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#111' },

    // Item Grid
    itemGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 80 },
    itemCard: { width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 1 },
    itemCardImgPlaceholder: { height: 60, backgroundColor: '#f9f9f9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    itemCardPrice: { fontSize: 18, fontWeight: '900', color: '#222' },
    itemCardName: { fontSize: 13, fontWeight: '700', color: '#555', height: 35, marginBottom: 10 },
    itemAddBtn: { borderWidth: 1, borderColor: '#ff6600', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
    itemAddBtnText: { color: '#ff6600', fontWeight: '900', fontSize: 12 },
    qtyControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ff6600', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 4 },
    qtyBtn: { padding: 4 },
    qtyText: { color: '#fff', fontWeight: '900', fontSize: 14 },

    // View Cart Bar
    viewCartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ff6600', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    viewCartItems: { color: '#fff', fontSize: 12, fontWeight: '700', opacity: 0.9 },
    viewCartTotal: { color: '#fff', fontSize: 18, fontWeight: '900' },
    viewCartBtn: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, gap: 6 },
    viewCartBtnText: { color: '#ff6600', fontWeight: '900', fontSize: 14 },

    // Cart Mode UI
    cartList: { marginTop: 10 },
    cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cartItemName: { fontSize: 15, fontWeight: '700', color: '#222' },
    cartItemPrice: { fontSize: 13, color: '#777', marginTop: 2, fontWeight: '600' },
    cartItemTotal: { fontSize: 16, fontWeight: '900', color: '#ff6600' },
    cartDivider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
    cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cartTotalLabel: { fontSize: 16, fontWeight: '800', color: '#333' },
    cartTotalValue: { fontSize: 22, fontWeight: '900', color: '#111' },

    label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
    statusToggleGroup: { flexDirection: 'row', gap: 10 },
    statusToggleBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f0f0f0' },
    statusToggleBtnActivePending: { backgroundColor: '#ff9800' },
    statusToggleBtnActiveDone: { backgroundColor: '#4caf50' },
    statusToggleBtnText: { fontSize: 14, fontWeight: '800', color: '#888' },
    
    notesInput: { marginTop: 20, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    actionBtnOutline: { flex: 1, borderWidth: 1.5, borderColor: '#ddd', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    actionBtnOutlineText: { fontSize: 14, fontWeight: '800', color: '#666' },
    actionBtnPrimary: { flex: 2, backgroundColor: '#ff6600', paddingVertical: 14, borderRadius: 12, alignItems: 'center', elevation: 4 },
    actionBtnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },

    successToast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#4caf50', borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, elevation: 8 },
    successToastText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});














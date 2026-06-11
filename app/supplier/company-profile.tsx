import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BASE_URL = 'http://192.168.31.192:6000/api/v1';

interface Transaction {
    _id: string;
    type: 'taken' | 'given';
    amount: number;
    date: string;
    billNumber?: string;
    description?: string;
    imageUrl?: string;
    createdAt: string;
    runningBalance?: number;
}

interface Summary {
    totalTaken: number;
    totalGiven: number;
    balance: number;
}

export default function SupplierCompanyProfile() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string; name: string; mobile: string; status: string }>();
    const { id, name, mobile, status } = params;

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalTaken: 0, totalGiven: 0, balance: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal State
    const [transModal, setTransModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Form State
    const [transType, setTransType] = useState<'taken' | 'given'>('taken');
    const [amount, setAmount] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const getToken = async () => AsyncStorage.getItem('userToken');

    // ── Calculate Running Balances ────────────────────────────────────
    const processTransactions = (data: Transaction[]) => {
        const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let currentBalance = 0;
        const withBalance = sorted.map(t => {
            if (t.type === 'taken') currentBalance += Number(t.amount);
            else currentBalance -= Number(t.amount);
            return { ...t, runningBalance: currentBalance };
        });
        return withBalance.reverse();
    };

    // ── GET Transactions ──────────────────────────────────────────────
    const fetchTransactions = useCallback(async (isRefresh = false) => {
        if (!id) return;
        try {
            if (isRefresh) setRefreshing(true); else setLoading(true);
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/transaction?companyId=${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                const processed = processTransactions(data.data || []);
                setTransactions(processed);
                if (data.summary) setSummary(data.summary);
            }
        } catch (e) { console.error('Fetch trans error', e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [id]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const handleSaveTransaction = async () => {
        if (!amount.trim()) { Alert.alert('Zaruri', 'Amount daalo'); return; }
        setSaving(true);
        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append('companyId', id as string);
            formData.append('type', transType);
            formData.append('amount', amount.trim());
            formData.append('date', date.toISOString());
            if (billNumber.trim()) formData.append('billNumber', billNumber.trim());
            if (description.trim()) formData.append('description', description.trim());
            if (isEdit && editId) formData.append('transactionId', editId);

            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(`${BASE_URL}/supplier/transaction`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData as any,
            });
            const data = await res.json();
            if (res.ok && data.success) {
                Alert.alert('✅ Success', isEdit ? 'Entry update ho gayi!' : 'Entry save ho gayi!');
                setTransModal(false);
                resetForm();
                fetchTransactions();
            } else { Alert.alert('Error', data.message || 'Error aa gaya.'); }
        } catch (e) { Alert.alert('Network Error', 'Server se connect nahi ho pa raha.'); }
        finally { setSaving(false); }
    };

    const resetForm = () => {
        setAmount(''); setBillNumber(''); setDescription('');
        setDate(new Date()); setIsEdit(false); setEditId(null);
    };

    const openEdit = (t: Transaction) => {
        setTransType(t.type);
        setAmount(String(t.amount));
        setBillNumber(t.billNumber || '');
        setDescription(t.description || '');
        setDate(new Date(t.date));
        setEditId(t._id);
        setIsEdit(true);
        setTransModal(true);
    };

    // ── Render Card UI (Exact Image Style) ───────────────────────────
    const renderTransaction = ({ item }: { item: Transaction }) => {
        const transDate = new Date(item.date);
        const formattedDate = transDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
        const formattedTime = transDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

        return (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.8}>
                {/* Left Side: Info */}
                <View style={styles.cardLeft}>
                    <Text style={styles.cardDate}>{formattedDate} • {formattedTime}</Text>
                    <View style={styles.balanceBadge}>
                        <Text style={styles.balanceBadgeText}>Bal. ₹ {item.runningBalance?.toLocaleString('en-IN')}</Text>
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.description || (item.type === 'taken' ? 'Maal Liya' : 'Paise Diye')}
                    </Text>
                </View>

                {/* Right Side: Columns for Taken/Given */}
                <View style={styles.cardRight}>
                    {/* Middle Column: Taken (Red) */}
                    <View style={[styles.amountCell, item.type === 'taken' && styles.takenBg]}>
                        {item.type === 'taken' && (
                            <Text style={styles.takenText}>₹ {item.amount.toLocaleString('en-IN')}</Text>
                        )}
                    </View>
                    {/* Far Right Column: Given (Green) */}
                    <View style={styles.amountCell}>
                        {item.type === 'given' && (
                            <Text style={styles.givenText}>₹ {item.amount.toLocaleString('en-IN')}</Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Company Khata'}</Text>
                    <Text style={styles.headerSub}>+91 {mobile}</Text>
                </View>
                <TouchableOpacity style={styles.headerIconBtn}>
                    <Ionicons name="search-outline" size={22} color="#111" />
                </TouchableOpacity>
            </View>

            {/* Summary Bar */}
            <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>YOU GOT (MAAL)</Text>
                    <Text style={[styles.summaryValue, { color: '#d32f2f' }]}>₹{summary.totalTaken.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>YOU GAVE (PAY)</Text>
                    <Text style={[styles.summaryValue, { color: '#0c831f' }]}>₹{summary.totalGiven.toLocaleString('en-IN')}</Text>
                </View>
            </View>

            <View style={styles.netBalanceRow}>
                <Text style={styles.netBalanceText}>
                    NET BALANCE: <Text style={{ color: summary.balance >= 0 ? '#d32f2f' : '#0c831f', fontWeight: '900' }}>
                        ₹{Math.abs(summary.balance).toLocaleString('en-IN')} {summary.balance >= 0 ? 'YOU OWE' : 'YOU GET'}
                    </Text>
                </Text>
            </View>

            {/* List Header */}
            <View style={styles.listHeader}>
                <Text style={[styles.listHeaderText, { flex: 2 }]}>DATE/REMARK</Text>
                <Text style={[styles.listHeaderText, { flex: 1, textAlign: 'center', color: '#d32f2f' }]}>YOU GOT</Text>
                <Text style={[styles.listHeaderText, { flex: 1, textAlign: 'center', color: '#0c831f' }]}>YOU GAVE</Text>
            </View>

            <FlatList
                data={transactions}
                keyExtractor={(item) => item._id}
                renderItem={renderTransaction}
                contentContainerStyle={styles.listContent}
                onRefresh={() => fetchTransactions(true)}
                refreshing={refreshing}
            />

            {/* Bottom Buttons */}
            <View style={styles.bottomButtons}>
                <TouchableOpacity style={[styles.bottomBtn, styles.btnGiven]} onPress={() => { resetForm(); setTransType('given'); setTransModal(true); }}>
                    <Text style={[styles.btnText, { color: '#0c831f' }]}>YOU GAVE ₹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.bottomBtn, styles.btnTaken]} onPress={() => { resetForm(); setTransType('taken'); setTransModal(true); }}>
                    <Text style={[styles.btnText, { color: '#d32f2f' }]}>YOU GOT ₹</Text>
                </TouchableOpacity>
            </View>

            {/* Modal */}
            <Modal visible={transModal} animationType="slide" transparent onRequestClose={() => setTransModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => !saving && setTransModal(false)} />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: transType === 'taken' ? '#d32f2f' : '#0c831f' }]}>
                                {isEdit ? 'Edit Entry' : `Add Entry (${transType === 'taken' ? 'Maal Liya' : 'Paise Diye'})`}
                            </Text>
                            <TouchableOpacity onPress={() => setTransModal(false)}><Ionicons name="close" size={24} color="#888" /></TouchableOpacity>
                        </View>
                        <ScrollView>
                            <View style={styles.amountInputBox}>
                                <Text style={styles.modalCurrency}>₹</Text>
                                <TextInput style={styles.modalAmountInput} placeholder="0" keyboardType="numeric" value={amount} onChangeText={setAmount} autoFocus />
                            </View>
                            <TouchableOpacity style={styles.inputBox} onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={20} color="#888" style={{ marginRight: 10 }} />
                                <Text style={styles.modalDateText}>{date.toLocaleDateString('en-IN')}</Text>
                            </TouchableOpacity>
                            <View style={styles.inputBox}>
                                <Ionicons name="document-text-outline" size={20} color="#888" style={{ marginRight: 10 }} />
                                <TextInput style={styles.modalTextInput} placeholder="Description (Tyre becha, etc.)" value={description} onChangeText={setDescription} />
                            </View>
                            <View style={styles.inputBox}>
                                <Ionicons name="barcode-outline" size={20} color="#888" style={{ marginRight: 10 }} />
                                <TextInput style={styles.modalTextInput} placeholder="Bill No. (Optional)" value={billNumber} onChangeText={setBillNumber} />
                            </View>
                            {showDatePicker && <DateTimePicker value={date} mode="date" onChange={onDateChange} />}
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: transType === 'taken' ? '#d32f2f' : '#0c831f' }]} onPress={handleSaveTransaction} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE ENTRY</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 0 : 40,
        paddingBottom: 15,
        backgroundColor: '#ffd103ff',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerInfo: { flex: 1, marginLeft: 8 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
    headerSub: { fontSize: 12, color: '#888', fontWeight: '700' },
    headerIconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

    summaryBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 10, color: '#888', fontWeight: '800' },
    summaryValue: { fontSize: 16, fontWeight: '900', marginTop: 2 },
    summaryDivider: { width: 1, height: '70%', backgroundColor: '#eee', alignSelf: 'center' },

    netBalanceRow: { paddingVertical: 8, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    netBalanceText: { fontSize: 12, fontWeight: '800', color: '#666' },

    listHeader: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#f0f2f5' },
    listHeaderText: { fontSize: 9, fontWeight: '900', color: '#aaa' },

    listContent: { padding: 8, paddingBottom: 100 },

    /* Card UI (Exact Image Style) */
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 4,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    cardLeft: { flex: 2, padding: 12 },
    cardDate: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6 },
    balanceBadge: {
        backgroundColor: '#f1f3f4',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 8,
    },
    balanceBadgeText: { fontSize: 11, color: '#5f6368', fontWeight: '700' },
    cardDesc: { fontSize: 15, fontWeight: '700', color: '#202124' },

    cardRight: { flex: 1.5, flexDirection: 'row' },
    amountCell: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    takenBg: { backgroundColor: '#fff5f5' }, // Light pink for taken
    takenText: { fontSize: 16, fontWeight: '900', color: '#d32f2f', textAlign: 'center' },
    givenText: { fontSize: 16, fontWeight: '900', color: '#0c831f', textAlign: 'center' },

    bottomButtons: { flexDirection: 'row', position: 'absolute', bottom: 0, width: '100%', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', gap: 10 },
    bottomBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    btnGiven: { backgroundColor: '#fff', borderColor: '#0c831f' },
    btnTaken: { backgroundColor: '#fff', borderColor: '#d32f2f' },
    btnText: { fontSize: 15, fontWeight: '900' },

    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        justifyContent: 'center', // Center the modal
        paddingHorizontal: 20, 
    },
    modalSheet: { 
        backgroundColor: '#fff', 
        borderRadius: 0, // No border radius
        padding: 24, 
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900' },
    amountInputBox: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#f0f0f0', marginBottom: 20, paddingBottom: 10 },
    modalCurrency: { fontSize: 24, fontWeight: '900', marginRight: 10 },
    modalAmountInput: { flex: 1, fontSize: 32, fontWeight: '900' },
    inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f8f9', padding: 15, borderRadius: 10, marginBottom: 15 },
    modalDateText: { fontSize: 15, fontWeight: '700' },
    modalTextInput: { flex: 1, fontSize: 15, fontWeight: '700' },
    saveBtn: { paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, color: '#bbb', fontWeight: '700' }
});

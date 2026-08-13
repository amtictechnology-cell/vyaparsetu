const fs = require('fs');
let content = fs.readFileSync('app/supplier/customer-profile.tsx', 'utf8');

// 1. Add states for payments and make payment modal
const statesInjection = 
    const [payments, setPayments] = useState<any[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    
    // Make Payment states
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [creatingPayment, setCreatingPayment] = useState(false);
;
content = content.replace(/const \[bills, setBills\] = useState<any\[\]>\(\[\]\);/, const [bills, setBills] = useState<any[]>([]);\n + statesInjection);

// 2. Fetch payments
const fetchPaymentsLogic = 
    const fetchPayments = async () => {
        try {
            setPaymentsLoading(true);
            const token = await getToken();
            const res = await fetch(\\/supplier/customer-payment?customerId=\\, { headers: { Authorization: \Bearer \\ } });
            const data = await res.json();
            if (res.ok && data.success) setPayments(Array.isArray(data.data) ? data.data : []);
        } catch { } finally { setPaymentsLoading(false); }
    };
;
content = content.replace(/const fetchBills = async \(\) => \{/, fetchPaymentsLogic + \n    const fetchBills = async () => {);

// 3. Update useEffect to fetch both
content = content.replace(/fetchBills\(\); \} \}, \[customerId, fetchCustomerDetail\]\);/, etchBills(); fetchPayments(); } }, [customerId, fetchCustomerDetail]););

// 4. Handle Make Payment Submit
const makePaymentLogic = 
    const handleMakePayment = async () => {
        if (!paymentAmount.trim()) { Alert.alert('Error', 'Amount dalna zaroori hai'); return; }
        setCreatingPayment(true);
        try {
            const token = await getToken();
            const payload = {
                customerId,
                amount: Number(paymentAmount),
                notes: paymentNotes.trim() || undefined
            };
            const res = await fetch(\\/supplier/customer-payment\, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: \Bearer \\ },
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
;
content = content.replace(/const handleCreateBill = async \(\) => \{/, makePaymentLogic + \n    const handleCreateBill = async () => {);

// 5. Calculate Summary & Mixed Feed
const mixedFeedLogic = 
    // Calculations
    const totalBill = bills.reduce((acc, bill) => acc + (bill.grandTotal || 0), 0);
    const totalReceived = payments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
    const outstanding = totalBill - totalReceived;

    const mixedFeed = [
        ...bills.map(b => ({ ...b, feedType: 'bill' })),
        ...payments.map(p => ({ ...p, feedType: 'payment' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
;
content = content.replace(/return \(\n\s*<SafeAreaView style=\{styles.container\}/, mixedFeedLogic + \n    return (\n        <SafeAreaView style={styles.container});

// 6. Inject Summary UI
const summaryUI = 
                {/* Summary Section */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Bill</Text>
                        <Text style={[styles.summaryValue, { color: '#ff6600' }]}>₹{totalBill}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Received</Text>
                        <Text style={[styles.summaryValue, { color: '#4caf50' }]}>₹{totalReceived}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Pending</Text>
                        <Text style={[styles.summaryValue, { color: outstanding > 0 ? '#d32f2f' : '#333' }]}>₹{outstanding}</Text>
                    </View>
                </View>
;
content = content.replace(/<View style=\{styles\.historySection\}>/, summaryUI + \n                <View style={styles.historySection}>);

// 7. Make Payment Button & Mixed Feed Render
content = content.replace(/<View style=\{styles\.historyHeaderRow\}>[\s\S]*?<\/View>/, 
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
);

const feedRenderLogic = 
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
                                                    <Text style={styles.itemNotes}>{item.notes || 'Cash/Online'}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )
                                ))
                            )}
                        </View>
;
content = content.replace(/<View>\s*\{billsLoading \? \([\s\S]*?\)\s*<\/View>/, feedRenderLogic);

// 8. Payment Modal UI Injection
const paymentModalUI = 
            {/* Make Payment Modal */}
            <Modal visible={paymentModalVisible} animationType="slide" transparent onRequestClose={() => setPaymentModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => !creatingPayment && setPaymentModalVisible(false)} />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Receive Payment</Text>
                            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}><Ionicons name="close" size={24} color="#888" /></TouchableOpacity>
                        </View>
                        <View style={styles.inputBox}>
                            <Text style={styles.modalCurrency}>₹</Text>
                            <TextInput style={styles.modalAmountInput} placeholder="Amount" keyboardType="numeric" value={paymentAmount} onChangeText={setPaymentAmount} autoFocus />
                        </View>
                        <TextInput style={styles.notesInput} placeholder="Payment notes (e.g. Cash, UPI)" value={paymentNotes} onChangeText={setPaymentNotes} />
                        <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleMakePayment} disabled={creatingPayment}>
                            {creatingPayment ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnPrimaryText}>SAVE PAYMENT</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
;
content = content.replace(/<\/SafeAreaView>/, paymentModalUI + \n        </SafeAreaView>);

// 9. Add Styles
const newStyles = 
    summaryContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginTop: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    summaryBox: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, backgroundColor: '#eee' },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 4 },
    summaryValue: { fontSize: 17, fontWeight: '900' },
    
    paymentBtn: { flexDirection: 'row', backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center', gap: 5 },
    paymentBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    itemNotes: { fontSize: 11, color: '#777', fontWeight: '600', marginTop: 2 },
;
content = content.replace(/profileHeader: \{/, newStyles + \n    profileHeader: {);

fs.writeFileSync('app/supplier/customer-profile.tsx', content, 'utf8');

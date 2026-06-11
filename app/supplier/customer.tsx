import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    ActivityIndicator,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.31.192:6000/api/v1';

interface Customer {
    _id: string;
    customerSR: string;
    customerName: string;
    mobileNumber: string;
    shopName?: string;
    status: string;
    createdAt: string;
}

export default function SupplierCustomer() {
    const router = useRouter();
    
    // --- Data States ---
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Modal & Form States ---
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Success Popup States
    const [successPopup, setSuccessPopup] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Form Fields
    const [formSR, setFormSR] = useState('');
    const [formName, setFormName] = useState('');
    const [formMobile, setFormMobile] = useState('');
    const [formShop, setFormShop] = useState('');
    const [formStatus, setFormStatus] = useState('active');

    const getToken = async () => AsyncStorage.getItem('userToken');

    const fetchCustomers = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/customer`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setCustomers(data.data);
            }
        } catch (e) {
            console.error('Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const resetForm = () => {
        setFormSR('');
        setFormName('');
        setFormMobile('');
        setFormShop('');
        setFormStatus('active');
        setIsEditing(false);
        setEditingId('');
    };

    const handleAdd = () => {
        resetForm();
        setModalVisible(true);
    };

    const handleEdit = (cust: Customer) => {
        setFormSR(cust.customerSR);
        setFormName(cust.customerName);
        setFormMobile(cust.mobileNumber);
        setFormShop(cust.shopName || '');
        setFormStatus(cust.status);
        setIsEditing(true);
        setEditingId(cust._id);
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!formName.trim() || !formMobile.trim() || !formSR.trim()) {
            Alert.alert('Validation Error', 'Please fill name, mobile and SR.');
            return;
        }

        setSubmitting(true);
        try {
            const token = await getToken();
            const method = isEditing ? 'PUT' : 'POST';
            const body: any = {
                customerSR: formSR.trim(),
                customerName: formName.trim(),
                mobileNumber: formMobile.trim(),
                shopName: formShop.trim(),
            };

            if (isEditing) {
                body.customerId = editingId;
                body.status = formStatus;
            }

            const res = await fetch(`${BASE_URL}/supplier/customer`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setFormName(''); setFormMobile(''); setFormSR(''); setFormShop(''); // Clear form
                setModalVisible(false);
                setSuccessMsg(isEditing ? 'Customer Updated Successfully!' : 'Customer Added Successfully!');
                setSuccessPopup(true);
                fetchCustomers();
                
                // Hide popup after 2 seconds
                setTimeout(() => {
                    setSuccessPopup(false);
                }, 2000);
            } else {
                Alert.alert('Error', data.message || 'Operation failed');
            }
        } catch (e) {
            Alert.alert('Error', 'Network request failed');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.shopName && c.shopName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.mobileNumber.includes(searchQuery)
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header Section */}
                <View style={[styles.header, { paddingHorizontal: 20 }]}>
                    <View>
                        <Text style={styles.headerTitle}>My Customers</Text>
                        <Text style={styles.headerSub}>Manage your party list</Text>
                    </View>
                    <TouchableOpacity style={styles.addMainBtn} onPress={handleAdd}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { marginHorizontal: 20 }]}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search by name, shop or mobile..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Customer List */}
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchCustomers(true)} />
                    }
                >
                    {loading && !refreshing ? (
                        <ActivityIndicator style={{ marginTop: 50 }} color="#0c831f" />
                    ) : filteredCustomers.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={80} color="#eee" />
                            <Text style={styles.emptyText}>No customers found</Text>
                            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAdd}>
                                <Text style={styles.emptyAddBtnText}>Add Your First Customer</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        filteredCustomers.map((cust) => (
                            <TouchableOpacity 
                                key={cust._id} 
                                style={styles.custCard}
                                onPress={() => router.push({
                                    pathname: '/supplier/customer-profile',
                                    params: { customerId: cust._id }
                                })}
                            >
                                <View style={[styles.custAvatar, { backgroundColor: cust.status === 'active' ? '#0c831f15' : '#eee' }]}>
                                    <Text style={[styles.avatarText, { color: cust.status === 'active' ? '#0c831f' : '#666' }]}>
                                        {cust.customerName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.custInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.custName}>{cust.customerName}</Text>
                                        <Text style={styles.custSR}>{cust.customerSR}</Text>
                                    </View>
                                    <Text style={styles.shopName} numberOfLines={1}>
                                        {cust.shopName || 'No Shop Name'}
                                    </Text>
                                    <View style={styles.bottomRow}>
                                        <Text style={styles.mobileText}>📞 {cust.mobileNumber}</Text>
                                        <View style={[styles.statusTag, { backgroundColor: cust.status === 'active' ? '#e8f5e9' : '#fafafa' }]}>
                                            <Text style={[styles.statusTagText, { color: cust.status === 'active' ? '#0c831f' : '#888' }]}>
                                                {cust.status}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.editIconBtn} onPress={() => handleEdit(cust)}>
                                    <Ionicons name="create-outline" size={20} color="#666" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>

            {/* Add / Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Edit Customer' : 'Add New Customer'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Customer SR / ID (Unique)*</Text>
                                <TextInput 
                                    style={styles.formInput}
                                    placeholder="e.g. CUST001"
                                    value={formSR}
                                    onChangeText={setFormSR}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Customer Name*</Text>
                                <TextInput 
                                    style={styles.formInput}
                                    placeholder="Enter full name"
                                    value={formName}
                                    onChangeText={setFormName}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mobile Number*</Text>
                                <TextInput 
                                    style={styles.formInput}
                                    placeholder="10 digit mobile number"
                                    keyboardType="phone-pad"
                                    value={formMobile}
                                    onChangeText={setFormMobile}
                                    maxLength={10}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Shop / Business Name (Optional)</Text>
                                <TextInput 
                                    style={styles.formInput}
                                    placeholder="e.g. Verma Kirana Store"
                                    value={formShop}
                                    onChangeText={setFormShop}
                                />
                            </View>

                            {isEditing && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Account Status</Text>
                                    <View style={styles.statusPicker}>
                                        <TouchableOpacity 
                                            style={[styles.statusOpt, formStatus === 'active' && styles.statusOptActive]}
                                            onPress={() => setFormStatus('active')}
                                        >
                                            <Text style={[styles.statusOptText, formStatus === 'active' && styles.statusOptTextActive]}>Active</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.statusOpt, formStatus === 'inactive' && styles.statusOptInactive]}
                                            onPress={() => setFormStatus('inactive')}
                                        >
                                            <Text style={[styles.statusOptText, formStatus === 'inactive' && styles.statusOptTextActive]}>Inactive</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity 
                                style={styles.submitBtn} 
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{isEditing ? 'Update Detail' : 'Save Customer'}</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Success Popup Modal */}
            <Modal visible={successPopup} transparent animationType="fade">
                <View style={styles.successOverlay}>
                    <View style={styles.successBox}>
                        <View style={styles.checkCircle}>
                            <Ionicons name="checkmark" size={40} color="#fff" />
                        </View>
                        <Text style={styles.successTitle}>Success!</Text>
                        <Text style={styles.successMessage}>{successMsg}</Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fdfdfd' },
    content: { flex: 1, paddingTop: 20 },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#111' },
    headerSub: { fontSize: 13, color: '#888', fontWeight: '600' },
    addMainBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0c831f', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#0c831f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f5', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 10, marginBottom: 20 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333' },

    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 20 },
    emptyText: { fontSize: 16, fontWeight: '700', color: '#bbb', marginTop: 10 },
    emptyAddBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0c831f', borderRadius: 20 },
    emptyAddBtnText: { color: '#fff', fontWeight: '700' },

    custCard: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        padding: 18, 
        borderBottomWidth: 1, 
        borderBottomColor: '#f0f0f0',
        alignItems: 'center' 
    },
    custAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontWeight: '900' },
    custInfo: { flex: 1, marginLeft: 15 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    custName: { fontSize: 17, fontWeight: '800', color: '#111' },
    custSR: { 
        fontSize: 12, 
        fontWeight: '900', 
        color: '#0c831f', 
        backgroundColor: '#e8f5e9', 
        paddingHorizontal: 8, 
        paddingVertical: 3, 
        borderRadius: 6 
    },
    shopName: { fontSize: 13, color: '#888', marginTop: 2, fontWeight: '600' },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    mobileText: { fontSize: 12, fontWeight: '700', color: '#666' },
    statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    statusTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    editIconBtn: { padding: 10 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
    formInput: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 15, fontSize: 15, color: '#333' },
    submitBtn: { backgroundColor: '#0c831f', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, marginBottom: 20 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    statusPicker: { flexDirection: 'row', gap: 10 },
    statusOpt: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee', alignItems: 'center', backgroundColor: '#fcfcfc' },
    statusOptActive: { backgroundColor: '#e8f5e9', borderColor: '#0c831f' },
    statusOptInactive: { backgroundColor: '#ffebee', borderColor: '#d32f2f' },
    statusOptText: { fontWeight: '700', color: '#888' },
    statusOptTextActive: { color: '#fff', backgroundColor: 'transparent' },

    /* Success Popup */
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successBox: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    checkCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0c831f',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#111',
        marginBottom: 8,
    },
    successMessage: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
    },
});

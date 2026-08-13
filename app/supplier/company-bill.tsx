import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { BASE_URL } from '../../constants/Config';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';



interface Company {
    _id: string;
    supplierId: string;
    companyName: string;
    mobile: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

export default function SupplierCompanyBill() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Search filter
    const [searchQuery, setSearchQuery] = useState('');

    // Add Modal
    const [addModal, setAddModal] = useState(false);
    const [addName, setAddName] = useState('');
    const [addMobile, setAddMobile] = useState('');
    const [adding, setAdding] = useState(false);

    // Edit Modal
    const [editModal, setEditModal] = useState(false);
    const [editCompany, setEditCompany] = useState<Company | null>(null);
    const [editName, setEditName] = useState('');
    const [editMobile, setEditMobile] = useState('');
    const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
    const [updating, setUpdating] = useState(false);

    const getToken = async () => AsyncStorage.getItem('userToken');

    // ── GET Companies ─────────────────────────────────────────────────
    const fetchCompanies = useCallback(async (isRefresh = false, name = '', mobile = '') => {
        try {
            if (isRefresh) setRefreshing(true); else setLoading(true);
            const token = await getToken();
            
            let url = `${BASE_URL}/supplier/company`;
            const queryParams = [];
            if (name.trim()) queryParams.push(`companyName=${encodeURIComponent(name.trim())}`);
            if (mobile.trim()) queryParams.push(`mobile=${encodeURIComponent(mobile.trim())}`);
            
            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            const res = await fetch(url, { 
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                } 
            });
            const data = await res.json();
            
            if (res.ok && data.success && data.data) {
                setCompanies(data.data);
            } else {
                setCompanies([]);
            }
        } catch (e) { 
            console.error('Fetch companies error', e); 
            setCompanies([]);
        } finally { 
            setLoading(false); 
            setRefreshing(false); 
        }
    }, []);

    useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

    // ── Search handler ────────────────────────────────────────────────
    const handleSearch = () => {
        const query = searchQuery.trim();
        const isNumeric = /^\d+$/.test(query);
        if (isNumeric) {
            fetchCompanies(false, '', query);
        } else {
            fetchCompanies(false, query, '');
        }
    };
    const handleClearSearch = () => {
        setSearchQuery('');
        fetchCompanies();
    };

    // ── POST Add Company ──────────────────────────────────────────────
    const handleAdd = async () => {
        if (!addName.trim()) { Alert.alert('Zaruri', 'Company name daalo.'); return; }
        if (!addMobile.trim() || addMobile.trim().length !== 10) {
            Alert.alert('Zaruri', 'Sahi 10-digit mobile number daalo.'); return;
        }
        setAdding(true);
        try {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/company`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ companyName: addName.trim(), mobile: addMobile.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                Alert.alert('✅ Done!', data.message || 'Company add ho gayi!');
                setAddModal(false); setAddName(''); setAddMobile('');
                fetchCompanies();
            } else { Alert.alert('Error', data.message || 'Company add nahi hui.'); }
        } catch { Alert.alert('Network Error', 'Server se connect nahi ho pa raha.'); }
        finally { setAdding(false); }
    };

    // ── PUT Edit Company ──────────────────────────────────────────────
    const openEditModal = (company: Company) => {
        setEditCompany(company);
        setEditName(company.companyName);
        setEditMobile(company.mobile);
        setEditStatus(company.status);
        setEditModal(true);
    };

    const handleUpdate = async () => {
        if (!editCompany) return;
        if (!editName.trim()) { Alert.alert('Zaruri', 'Company name daalo.'); return; }
        if (!editMobile.trim() || editMobile.trim().length !== 10) {
            Alert.alert('Zaruri', 'Sahi 10-digit mobile number daalo.'); return;
        }
        setUpdating(true);
        try {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/company`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    companyId: editCompany._id,
                    companyName: editName.trim(),
                    mobile: editMobile.trim(),
                    status: editStatus,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                Alert.alert('✅ Updated!', data.message || 'Company update ho gayi!');
                setEditModal(false);
                fetchCompanies();
            } else { Alert.alert('Error', data.message || 'Update nahi hua.'); }
        } catch { Alert.alert('Network Error', 'Server se connect nahi ho pa raha.'); }
        finally { setUpdating(false); }
    };

    // ── Render company card ───────────────────────────────────────────
    const renderCompany = ({ item }: { item: Company }) => (
        <TouchableOpacity 
            style={styles.companyCard} 
            onPress={() => router.push({ 
                pathname: '/supplier/company-profile', 
                params: { 
                    id: item._id, 
                    name: item.companyName, 
                    mobile: item.mobile, 
                    status: item.status 
                } 
            })}
            activeOpacity={0.7}
        >
            <View style={styles.companyAvatar}>
                <Text style={styles.companyAvatarText}>
                    {item.companyName.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{item.companyName}</Text>
                <View style={styles.companyMobileRow}>
                    <Ionicons name="call-outline" size={13} color="#888" />
                    <Text style={styles.companyMobile}>{item.mobile}</Text>
                </View>
            </View>
            <View style={styles.companyRight}>
                <View style={[styles.statusPill, item.status === 'active' ? styles.pillActive : styles.pillInactive]}>
                    <Text style={[styles.pillText, item.status === 'active' ? styles.pillTextActive : styles.pillTextInactive]}>
                        {item.status === 'active' ? 'Active' : 'Inactive'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                    <Ionicons name="create-outline" size={18} color="#1565c0" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    // ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>

            {/* ── Top Bar ── */}
            <View style={[styles.topBar, { paddingTop: Platform.OS === 'ios' ? 40 : 50 }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle}>My Companies</Text>
                    <Text style={styles.topSub}>Apni companies manage karo</Text>
                </View>
            </View>

            {/* ── Search Bar ── */}
            <View style={styles.searchBar}>
                <View style={styles.searchInput}>
                    <Ionicons name="search-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchText}
                        placeholder="Search company or mobile..."
                        placeholderTextColor="#bbb"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                    />
                </View>
                <TouchableOpacity style={[styles.searchBtn, { backgroundColor: '#ff6600' }]} onPress={handleSearch}>
                    <Ionicons name="search" size={17} color="#fff" />
                </TouchableOpacity>
                {searchQuery ? (
                    <TouchableOpacity style={styles.clearBtn} onPress={handleClearSearch}>
                        <Ionicons name="close" size={17} color="#d32f2f" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* ── List ── */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#ff6600" />
                    <Text style={styles.loadingText}>Companies load ho rahi hain...</Text>
                </View>
            ) : companies.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="business-outline" size={56} color="#ddd" />
                    <Text style={styles.emptyTitle}>Koi company nahi mili</Text>
                    <Text style={styles.emptySub}>{"Pehli company add karne ke liye \"Add\" dabao"}</Text>
                </View>
            ) : (
                <FlatList
                    data={companies}
                    keyExtractor={(c) => c._id}
                    renderItem={renderCompany}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    onRefresh={() => fetchCompanies(true)}
                    refreshing={refreshing}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}

            {/* ── FAB ── */}
            <TouchableOpacity style={styles.fab} onPress={() => setAddModal(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* ══ Add Company Modal ══ */}
            <Modal visible={addModal} animationType="slide" transparent onRequestClose={() => setAddModal(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => !adding && setAddModal(false)} />
                    <View style={styles.modalSheet}>
                        <View style={styles.handleBar} />

                        <View style={styles.modalTitleRow}>
                            <View style={[styles.modalIconBox, { backgroundColor: '#fff5eb' }]}>
                                <Ionicons name="business-outline" size={20} color="#ff6600" />
                            </View>
                            <Text style={styles.modalTitle}>New Company Add Karo</Text>
                            <TouchableOpacity onPress={() => setAddModal(false)} disabled={adding}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={22} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Company Name</Text>
                        <View style={styles.inputBox}>
                            <Ionicons name="business-outline" size={16} color="#ff6600" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. Sharma Traders"
                                placeholderTextColor="#bbb"
                                value={addName}
                                onChangeText={setAddName}
                                autoFocus
                            />
                        </View>

                        <Text style={styles.inputLabel}>Mobile Number</Text>
                        <View style={styles.inputBox}>
                            <Ionicons name="call-outline" size={16} color="#ff6600" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="10-digit number"
                                placeholderTextColor="#bbb"
                                keyboardType="numeric"
                                maxLength={10}
                                value={addMobile}
                                onChangeText={setAddMobile}
                            />
                        </View>

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddModal(false)} disabled={adding}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAdd} disabled={adding} activeOpacity={0.85}>
                                {adding ? <ActivityIndicator size="small" color="#fff" /> : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                        <Text style={styles.modalSaveText}>Add Company</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ══ Edit Company Modal ══ */}
            <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => !updating && setEditModal(false)} />
                    <View style={styles.modalSheet}>
                        <View style={styles.handleBar} />

                        <View style={styles.modalTitleRow}>
                            <View style={[styles.modalIconBox, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="create-outline" size={20} color="#1565c0" />
                            </View>
                            <Text style={styles.modalTitle}>Company Edit Karo</Text>
                            <TouchableOpacity onPress={() => setEditModal(false)} disabled={updating}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={22} color="#888" />
                            </TouchableOpacity>
                        </View>

                        {editCompany && (
                            <View style={styles.currentChip}>
                                <Ionicons name="information-circle-outline" size={14} color="#1565c0" />
                                <Text style={styles.currentChipText}>
                                    {editCompany.companyName} · {editCompany.mobile}
                                </Text>
                            </View>
                        )}

                        <Text style={styles.inputLabel}>Company Name</Text>
                        <View style={styles.inputBox}>
                            <Ionicons name="business-outline" size={16} color="#1565c0" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Company name"
                                placeholderTextColor="#bbb"
                                value={editName}
                                onChangeText={setEditName}
                                autoFocus
                            />
                        </View>

                        <Text style={styles.inputLabel}>Mobile Number</Text>
                        <View style={styles.inputBox}>
                            <Ionicons name="call-outline" size={16} color="#1565c0" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="10-digit number"
                                placeholderTextColor="#bbb"
                                keyboardType="numeric"
                                maxLength={10}
                                value={editMobile}
                                onChangeText={setEditMobile}
                            />
                        </View>

                        {/* Status Toggle */}
                        <Text style={styles.inputLabel}>Status</Text>
                        <View style={styles.statusRow}>
                            <TouchableOpacity
                                style={[styles.statusBtn, editStatus === 'active' && styles.statusBtnActive]}
                                onPress={() => setEditStatus('active')}
                            >
                                <Ionicons name="checkmark-circle-outline" size={16}
                                    color={editStatus === 'active' ? '#fff' : '#ff6600'} />
                                <Text style={[styles.statusBtnText, editStatus === 'active' && styles.statusBtnTextActive]}>
                                    Active
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.statusBtn, editStatus === 'inactive' && styles.statusBtnInactive]}
                                onPress={() => setEditStatus('inactive')}
                            >
                                <Ionicons name="close-circle-outline" size={16}
                                    color={editStatus === 'inactive' ? '#fff' : '#888'} />
                                <Text style={[styles.statusBtnText, editStatus === 'inactive' && styles.statusBtnTextActive]}>
                                    Inactive
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModal(false)} disabled={updating}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: '#1565c0' }]}
                                onPress={handleUpdate} disabled={updating} activeOpacity={0.85}>
                                {updating ? <ActivityIndicator size="small" color="#fff" /> : (
                                    <>
                                        <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                                        <Text style={styles.modalSaveText}>Update</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7f8fa' },

    /* Top Bar */
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#ff6600', paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#ff6600',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    topTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    topSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    
    /* FAB */
    fab: {
        position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#ff6600', justifyContent: 'center', alignItems: 'center',
        elevation: 8, shadowColor: '#ff6600', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    },

    /* Search */
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    searchInput: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fafafa',
    },
    searchText: { flex: 1, fontSize: 13, color: '#333', fontWeight: '600' },
    searchBtn: {
        width: 38, height: 38, borderRadius: 10, backgroundColor: '#ff6600',
        justifyContent: 'center', alignItems: 'center',
    },
    clearBtn: {
        width: 38, height: 38, borderRadius: 10, backgroundColor: '#fdecea',
        justifyContent: 'center', alignItems: 'center',
    },

    /* Center states */
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#aaa', marginTop: 10, fontSize: 14 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#bbb', marginTop: 14 },
    emptySub: { fontSize: 12, color: '#ccc', marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },

    /* Company Card */
    companyCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    },
    companyAvatar: {
        width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff5eb',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    companyAvatarText: { fontSize: 20, fontWeight: '900', color: '#ff6600' },
    companyInfo: { flex: 1 },
    companyName: { fontSize: 15, fontWeight: '800', color: '#111' },
    companyMobileRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    companyMobile: { fontSize: 13, color: '#888', fontWeight: '600' },
    companyRight: { alignItems: 'flex-end', gap: 8 },
    statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    pillActive: { backgroundColor: '#fff5eb' },
    pillInactive: { backgroundColor: '#f5f5f5' },
    pillText: { fontSize: 11, fontWeight: '800' },
    pillTextActive: { color: '#ff6600' },
    pillTextInactive: { color: '#999' },
    editBtn: {
        width: 32, height: 32, borderRadius: 9, backgroundColor: '#e3f2fd',
        justifyContent: 'center', alignItems: 'center',
    },
    separator: { height: 1, backgroundColor: '#f0f0f0' },

    /* Modal */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 36,
    },
    handleBar: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    modalIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: '#111' },
    currentChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#e8f4fe', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14,
    },
    currentChipText: { fontSize: 13, color: '#1565c0', fontWeight: '600' },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 4 },
    inputBox: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafafa', marginBottom: 14,
    },
    modalInput: { flex: 1, fontSize: 15, color: '#222', fontWeight: '700' },

    /* Status toggle */
    statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statusBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fafafa',
    },
    statusBtnActive: { backgroundColor: '#ff6600', borderColor: '#ff6600' },
    statusBtnInactive: { backgroundColor: '#888', borderColor: '#888' },
    statusBtnText: { fontSize: 13, fontWeight: '800', color: '#666' },
    statusBtnTextActive: { color: '#fff' },

    /* Modal Buttons */
    modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    modalCancelBtn: {
        flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14,
        borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5',
    },
    modalCancelText: { fontSize: 14, fontWeight: '700', color: '#777' },
    modalSaveBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingVertical: 14, borderRadius: 14, backgroundColor: '#ff6600',
        elevation: 5, shadowColor: '#ff6600', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
    },
    modalSaveText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});




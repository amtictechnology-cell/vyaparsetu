import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { BASE_URL } from '../../constants/Config';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
    Platform, RefreshControl, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View, Image
} from 'react-native';
import { useRouter } from 'expo-router';

interface RateItem { _id: string; itemName: string; itemPrice: number; }

export default function SupplierRateList() {
    const router = useRouter();
    const [rateList, setRateList] = useState<RateItem[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Add Item Modal
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [saving, setSaving] = useState(false);

    // Edit Item Modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editItem, setEditItem] = useState<RateItem | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [updating, setUpdating] = useState(false);

    const getToken = async () => AsyncStorage.getItem('userToken');

    const RATE_CACHE_KEY = 'supplier_rate_list_cache';
    const RATE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    const fetchRateList = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                const cachedStr = await AsyncStorage.getItem(RATE_CACHE_KEY);
                if (cachedStr) {
                    const parsed = JSON.parse(cachedStr);
                    setRateList(parsed.data);
                    setLoadingList(false);
                    if (Date.now() - parsed.timestamp < RATE_CACHE_TTL) {
                        return;
                    }
                }
                setLoadingList(true);
            }
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/rate-list`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.data?.items) {
                setRateList(data.data.items);
                await AsyncStorage.setItem(RATE_CACHE_KEY, JSON.stringify({
                    data: data.data.items,
                    timestamp: Date.now()
                }));
            }
        } catch (e) { console.error('Fetch rate list error', e); }
        finally { setLoadingList(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchRateList(); }, [fetchRateList]);

    const handleSaveNewItem = async () => {
        if (!newItemName.trim() || !newItemPrice.trim()) { Alert.alert('Missing Info', 'Item name aur price dono fill karo.'); return; }
        setSaving(true);
        try {
            const token = await getToken();
            const newMapped = [{ itemName: newItemName.trim(), itemPrice: parseFloat(newItemPrice) }];
            const isExisting = rateList.length > 0;
            const method = isExisting ? 'PUT' : 'POST';
            const payload = isExisting
                ? { items: [...rateList.map((it) => ({ itemName: it.itemName, itemPrice: it.itemPrice })), ...newMapped] }
                : { items: newMapped };
            const res = await fetch(`${BASE_URL}/supplier/rate-list`, {
                method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAddModalVisible(false);
                setNewItemName('');
                setNewItemPrice('');
                Alert.alert('Saved', data.message || 'Item save ho gaya!');
                if (data.data?.items) {
                    setRateList(data.data.items);
                    await AsyncStorage.setItem(RATE_CACHE_KEY, JSON.stringify({
                        data: data.data.items,
                        timestamp: Date.now()
                    }));
                } else {
                    fetchRateList();
                }
            } else { Alert.alert('Error', data.message || 'Kuch gadbad ho gayi.'); }
        } catch { Alert.alert('Network Error', 'Server se connect nahi ho pa raha.'); }
        finally { setSaving(false); }
    };

    const openEditModal = (item: RateItem) => {
        setEditItem(item); setEditName(item.itemName);
        setEditPrice(String(item.itemPrice)); setEditModalVisible(true);
    };

    const handleUpdate = async () => {
        if (!editItem || !editName.trim() || !editPrice.trim()) { Alert.alert('Missing Info', 'Name aur price dono chahiye.'); return; }
        setUpdating(true);
        try {
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/rate-list`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ itemId: editItem._id, itemName: editName.trim(), itemPrice: parseFloat(editPrice) }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setEditModalVisible(false);
                Alert.alert('Updated', data.message || 'Item update ho gaya!');
                if (data.data?.items) {
                    setRateList(data.data.items);
                    await AsyncStorage.setItem(RATE_CACHE_KEY, JSON.stringify({
                        data: data.data.items,
                        timestamp: Date.now()
                    }));
                } else {
                    fetchRateList();
                }
            } else { Alert.alert('Error', data.message || 'Update nahi hua.'); }
        } catch { Alert.alert('Network Error', 'Server se connect nahi ho pa raha.'); }
        finally { setUpdating(false); }
    };

    return (
        <View style={styles.mainContainer}>
            {/* Orange Header */}
            <View style={[styles.sectionHeader, { paddingTop: Platform.OS === 'android' ? 40 : 20 }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15, padding: 5 }}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>My Rate List</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRateList(true)} colors={['#ff6600']} />}>
                
                {loadingList ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color="#ff6600" />
                        <Text style={styles.loadingText}>Loading Items...</Text>
                    </View>
                ) : rateList.length === 0 ? (
                    <View style={styles.centerBox}>
                        <Ionicons name="basket-outline" size={60} color="#ddd" />
                        <Text style={styles.emptyText}>No items found</Text>
                        <Text style={styles.emptySubText}>Tap the button below to add your first item.</Text>
                    </View>
                ) : (
                    <View style={styles.gridContainer}>
                        {rateList.map((item) => (
                            <View key={item._id} style={styles.card}>
                                {/* Image Placeholder Area */}
                                <View style={styles.cardImageArea}>
                                    
                                    <Ionicons name="heart-outline" size={20} color="#fff" style={styles.heartIcon} />
                                    <Ionicons name="image-outline" size={40} color="#e0e0e0" />
                                </View>
                                
                                {/* Content Area */}
                                <View style={styles.cardContent}>
                                    <Text style={styles.priceText}>₹{item.itemPrice}</Text>
                                    <Text style={styles.itemName} numberOfLines={2}>{item.itemName}</Text>
                                    
                                    <View style={styles.cardActionRow}>
                                        <TouchableOpacity style={styles.editBtnSmall} onPress={() => openEditModal(item)}>
                                            <Text style={styles.editBtnSmallText}>EDIT</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Add Item Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.bottomAddBtn} onPress={() => setAddModalVisible(true)} activeOpacity={0.85}>
                    <Ionicons name="add-circle-outline" size={24} color="#fff" />
                    <Text style={styles.bottomAddBtnText}>Add New Item</Text>
                </TouchableOpacity>
            </View>

            {/* Add Item Modal */}
            <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddModalVisible(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
                        <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                            <View style={styles.handleBar} />
                            <Text style={styles.modalTitle}>Add New Item</Text>

                            <Text style={styles.inputLabel}>Item Name</Text>
                            <View style={styles.inputBoxOrange}>
                                <Ionicons name="pricetag-outline" size={18} color="#ff6600" style={{ marginRight: 8 }} />
                                <TextInput style={styles.modalInput} placeholder="e.g. Apple" placeholderTextColor="#bbb"
                                    value={newItemName} onChangeText={setNewItemName} autoFocus />
                            </View>

                            <Text style={styles.inputLabel}>Price (₹)</Text>
                            <View style={styles.inputBoxOrange}>
                                <Ionicons name="cash-outline" size={18} color="#ff6600" style={{ marginRight: 8 }} />
                                <TextInput style={styles.modalInput} placeholder="e.g. 150" placeholderTextColor="#bbb"
                                    keyboardType="numeric" value={newItemPrice} onChangeText={setNewItemPrice} />
                            </View>

                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddModalVisible(false)} disabled={saving}>
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalSaveBtnOrange} onPress={handleSaveNewItem} disabled={saving}>
                                    {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                                        <Text style={styles.modalSaveText}>Save Item</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>

            {/* Edit Item Modal */}
            <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditModalVisible(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
                        <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                            <View style={styles.handleBar} />
                            <Text style={styles.modalTitle}>Edit Item</Text>

                            <Text style={styles.inputLabel}>Item Name</Text>
                            <View style={styles.inputBoxOrange}>
                                <Ionicons name="pricetag-outline" size={18} color="#ff6600" style={{ marginRight: 8 }} />
                                <TextInput style={styles.modalInput} placeholder="e.g. Tomato" placeholderTextColor="#bbb"
                                    value={editName} onChangeText={setEditName} autoFocus />
                            </View>

                            <Text style={styles.inputLabel}>Price (₹)</Text>
                            <View style={styles.inputBoxOrange}>
                                <Ionicons name="cash-outline" size={18} color="#ff6600" style={{ marginRight: 8 }} />
                                <TextInput style={styles.modalInput} placeholder="e.g. 60" placeholderTextColor="#bbb"
                                    keyboardType="numeric" value={editPrice} onChangeText={setEditPrice} />
                            </View>

                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)} disabled={updating}>
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalSaveBtnOrange} onPress={handleUpdate} disabled={updating}>
                                    {updating ? <ActivityIndicator size="small" color="#fff" /> : (
                                        <Text style={styles.modalSaveText}>Update Item</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#f6f9f6' }, // Slight greenish white like image
    sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ff6600', paddingHorizontal: 16, paddingBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    scrollContainer: { padding: 12, paddingBottom: 100 },
    
    // Grid Setup
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardImageArea: {
        height: 80,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#e6e6fa', // light purple like image
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#4b0082' },
    heartIcon: { position: 'absolute', top: 8, right: 8 },
    
    cardContent: { padding: 12 },
    cardActionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    weightText: { fontSize: 12, fontWeight: '800', color: '#333' },
    editBtnSmall: {
        borderWidth: 1,
        borderColor: '#ff6600',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: '#fff'
    },
    editBtnSmallText: { fontSize: 13, fontWeight: '900', color: '#ff6600' },
    
    priceText: { fontSize: 24, fontWeight: '900', color: '#222', marginBottom: 4 },
    itemName: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 12 }, // height to align rows
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: { fontSize: 11, color: '#777', fontWeight: '600' },
    
    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    bottomAddBtn: {
        backgroundColor: '#ff6600',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8
    },
    bottomAddBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
    handleBar: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 20, textAlign: 'center' },
    inputLabel: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 6 },
    inputBoxOrange: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ff6600', // orange border requested
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff', // white bg
        marginBottom: 16
    },
    modalInput: { flex: 1, fontSize: 16, color: '#222', fontWeight: '700' },
    modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    modalCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
    modalCancelText: { fontSize: 15, fontWeight: '700', color: '#777' },
    modalSaveBtnOrange: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: '#ff6600', elevation: 5, shadowColor: '#ff6600', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
    modalSaveText: { fontSize: 15, fontWeight: '900', color: '#fff' },

    centerBox: { justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
    loadingText: { fontSize: 14, color: '#ff6600', marginTop: 10, fontWeight: '700' },
    emptyText: { fontSize: 18, fontWeight: '900', color: '#aaa', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#ccc', marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
});





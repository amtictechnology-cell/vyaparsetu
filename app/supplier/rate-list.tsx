import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
    Platform, RefreshControl, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const BASE_URL = 'http://192.168.31.192:6000/api/v1';

interface RateItem { _id: string; itemName: string; itemPrice: number; }
interface NewItem { itemName: string; itemPrice: string; }

export default function SupplierRateList() {
    const [rateList, setRateList] = useState<RateItem[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newItems, setNewItems] = useState<NewItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editItem, setEditItem] = useState<RateItem | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [updating, setUpdating] = useState(false);
    const [menuItemId, setMenuItemId] = useState<string | null>(null);

    const getToken = async () => AsyncStorage.getItem('userToken');

    const fetchRateList = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true); else setLoadingList(true);
            const token = await getToken();
            const res = await fetch(`${BASE_URL}/supplier/rate-list`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.data?.items) setRateList(data.data.items);
        } catch (e) { console.error('Fetch rate list error', e); }
        finally { setLoadingList(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchRateList(); }, [fetchRateList]);

    const addNewRow = () => { setMenuItemId(null); setNewItems((prev) => [{ itemName: '', itemPrice: '' }, ...prev]); };
    const updateNewItem = (index: number, field: keyof NewItem, value: string) => {
        setNewItems((prev) => { const copy = [...prev]; copy[index] = { ...copy[index], [field]: value }; return copy; });
    };
    const removeNewRow = (index: number) => setNewItems((prev) => prev.filter((_, i) => i !== index));

    const handleSave = async () => {
        const valid = newItems.filter((it) => it.itemName.trim() && it.itemPrice.trim());
        if (valid.length === 0) { Alert.alert('Missing Info', 'Item name aur price dono fill karo.'); return; }
        setSaving(true);
        try {
            const token = await getToken();
            const newMapped = valid.map((it) => ({ itemName: it.itemName.trim(), itemPrice: parseFloat(it.itemPrice) }));
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
                setNewItems([]);
                Alert.alert('✅ Saved', data.message || 'Items save ho gaye!');
                data.data?.items ? setRateList(data.data.items) : fetchRateList();
            } else { Alert.alert('Error', data.message || 'Kuch gadbad ho gayi.'); }
        } catch { Alert.alert('Network Error', 'Server se connect nahi ho pa raha.'); }
        finally { setSaving(false); }
    };

    const openEditModal = (item: RateItem) => {
        setMenuItemId(null); setEditItem(item); setEditName(item.itemName);
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
                Alert.alert('✅ Updated', data.message || 'Item update ho gaya!');
                data.data?.items ? setRateList(data.data.items) : fetchRateList();
            } else { Alert.alert('Error', data.message || 'Update nahi hua.'); }
        } catch { Alert.alert('Network Error', 'Server se connect nahi ho pa raha.'); }
        finally { setUpdating(false); }
    };

    return (
        <>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => setMenuItemId(null)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRateList(true)} colors={['#0c831f']} />}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Rate List</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={addNewRow} activeOpacity={0.8}>
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={styles.addBtnText}>Add Item</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tableCard}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.colSr, styles.headerText]}>SR.</Text>
                        <Text style={[styles.colName, styles.headerText]}>Item Name</Text>
                        <Text style={[styles.colPrice, styles.headerText]}>Price</Text>
                        <View style={styles.colAction} />
                    </View>

                    {newItems.map((item, index) => (
                        <View key={`new-${index}`} style={[styles.tableRow, styles.inputRow]}>
                            <Text style={[styles.colSr, styles.newSr]}>●</Text>
                            <TextInput style={[styles.colName, styles.cellInput]} placeholder="Item name" placeholderTextColor="#aaa"
                                value={item.itemName} onChangeText={(v) => updateNewItem(index, 'itemName', v)} autoFocus={index === 0} />
                            <TextInput style={[styles.colPrice, styles.cellInput, { textAlign: 'right' }]} placeholder="0.00"
                                placeholderTextColor="#aaa" keyboardType="numeric" value={item.itemPrice}
                                onChangeText={(v) => updateNewItem(index, 'itemPrice', v)} />
                            <TouchableOpacity style={styles.colAction} onPress={() => removeNewRow(index)}>
                                <Ionicons name="close-circle" size={20} color="#d32f2f" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {newItems.length > 0 && rateList.length > 0 && <View style={styles.divider} />}

                    {loadingList ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="small" color="#0c831f" />
                            <Text style={styles.loadingText}>Loading...</Text>
                        </View>
                    ) : rateList.length === 0 && newItems.length === 0 ? (
                        <View style={styles.centerBox}>
                            <Ionicons name="list-outline" size={40} color="#ddd" />
                            <Text style={styles.emptyText}>Koi item nahi hai</Text>
                            <Text style={styles.emptySubText}>"Add Item" dabao aur apni rate list banao</Text>
                        </View>
                    ) : (
                        rateList.map((item, index) => (
                            <View key={item._id}>
                                <View style={[styles.tableRow, styles.dataRow, index % 2 === 0 && styles.rowEven]}>
                                    <Text style={[styles.colSr, styles.cellText]}>{index + 1}</Text>
                                    <Text style={[styles.colName, styles.cellText]} numberOfLines={1}>{item.itemName}</Text>
                                    <Text style={[styles.colPrice, styles.priceText]}>₹{item.itemPrice}</Text>
                                    <TouchableOpacity style={styles.colAction}
                                        onPress={() => setMenuItemId(menuItemId === item._id ? null : item._id)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="ellipsis-vertical" size={18} color="#888" />
                                    </TouchableOpacity>
                                </View>
                                {menuItemId === item._id && (
                                    <View style={styles.dropdownMenu}>
                                        <TouchableOpacity style={styles.menuItem} onPress={() => openEditModal(item)}>
                                            <Ionicons name="create-outline" size={16} color="#1565c0" />
                                            <Text style={styles.menuItemText}>Edit Item</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </View>

                {newItems.length > 0 && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewItems([])} activeOpacity={0.8}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                                <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                    <Text style={styles.saveBtnText}>Save Rate List</Text></>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {rateList.length > 0 && (
                    <Text style={styles.countBadge}>Total {rateList.length} item{rateList.length !== 1 ? 's' : ''} in rate list</Text>
                )}
            </ScrollView>

            <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !updating && setEditModalVisible(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                        <TouchableOpacity activeOpacity={1}>
                            <View style={styles.modalSheet}>
                                <View style={styles.handleBar} />
                                <View style={styles.modalTitleRow}>
                                    <View style={styles.modalIconBox}><Ionicons name="create-outline" size={20} color="#1565c0" /></View>
                                    <Text style={styles.modalTitle}>Edit Item</Text>
                                    <TouchableOpacity onPress={() => setEditModalVisible(false)} disabled={updating}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Ionicons name="close" size={22} color="#888" />
                                    </TouchableOpacity>
                                </View>
                                {editItem && (
                                    <View style={styles.currentChip}>
                                        <Ionicons name="information-circle-outline" size={14} color="#1565c0" />
                                        <Text style={styles.currentChipText}>Current: {editItem.itemName} — ₹{editItem.itemPrice}</Text>
                                    </View>
                                )}
                                <Text style={styles.inputLabel}>Item Name</Text>
                                <View style={styles.inputBox}>
                                    <Ionicons name="pricetag-outline" size={16} color="#0c831f" style={{ marginRight: 8 }} />
                                    <TextInput style={styles.modalInput} placeholder="e.g. Tomato" placeholderTextColor="#bbb"
                                        value={editName} onChangeText={setEditName} autoFocus />
                                </View>
                                <Text style={styles.inputLabel}>Price (₹)</Text>
                                <View style={styles.inputBox}>
                                    <Ionicons name="cash-outline" size={16} color="#0c831f" style={{ marginRight: 8 }} />
                                    <TextInput style={styles.modalInput} placeholder="e.g. 60" placeholderTextColor="#bbb"
                                        keyboardType="numeric" value={editPrice} onChangeText={setEditPrice} />
                                </View>
                                <View style={styles.modalBtnRow}>
                                    <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)} disabled={updating}>
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalSaveBtn} onPress={handleUpdate} disabled={updating} activeOpacity={0.85}>
                                        {updating ? <ActivityIndicator size="small" color="#fff" /> : (
                                            <><Ionicons name="checkmark-done-outline" size={17} color="#fff" />
                                                <Text style={styles.modalSaveText}>Update</Text></>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 60 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: '#111' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0c831f', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 5, elevation: 4, shadowColor: '#0c831f', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6 },
    addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    tableCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
    tableHeader: { backgroundColor: '#0c831f', paddingVertical: 12 },
    dataRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    inputRow: { paddingVertical: 8, backgroundColor: '#f0fff4', borderBottomWidth: 1, borderBottomColor: '#c8e6c9' },
    rowEven: { backgroundColor: '#fafafa' },
    colSr: { width: 32, textAlign: 'center' },
    colName: { flex: 1, paddingHorizontal: 6 },
    colPrice: { width: 72, textAlign: 'right' },
    colAction: { width: 36, alignItems: 'center' },
    headerText: { fontSize: 12, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
    cellText: { fontSize: 14, color: '#333', fontWeight: '600' },
    priceText: { fontSize: 14, color: '#0c831f', fontWeight: '800' },
    newSr: { fontSize: 18, color: '#0c831f', textAlign: 'center' },
    cellInput: { fontSize: 14, color: '#222', borderWidth: 1, borderColor: '#a5d6a7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff', fontWeight: '600' },
    dropdownMenu: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 4, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
    menuItemText: { fontSize: 14, fontWeight: '700', color: '#1565c0' },
    divider: { height: 2, backgroundColor: '#e8f5e9', marginVertical: 2 },
    centerBox: { justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
    loadingText: { fontSize: 13, color: '#aaa', marginTop: 8 },
    emptyText: { fontSize: 15, fontWeight: '700', color: '#aaa', marginTop: 12 },
    emptySubText: { fontSize: 12, color: '#ccc', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#ccc', backgroundColor: '#fff' },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#666' },
    saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 14, backgroundColor: '#0c831f', elevation: 5, shadowColor: '#0c831f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
    saveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
    countBadge: { textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 12, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
    handleBar: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    modalIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: '#111' },
    currentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e8f4fe', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20 },
    currentChipText: { fontSize: 13, color: '#1565c0', fontWeight: '600' },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 4 },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafafa', marginBottom: 16 },
    modalInput: { flex: 1, fontSize: 15, color: '#222', fontWeight: '700' },
    modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
    modalCancelText: { fontSize: 14, fontWeight: '700', color: '#777' },
    modalSaveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1565c0', elevation: 5, shadowColor: '#1565c0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
    modalSaveText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface HotelItem {
    _id: string;
    itemId?: string;
    itemName: string;
    unit: string;
    rate: number;
    itemImage?: string;
    category?: string;
}

import { BASE_URL } from "../constants/Config";

const FloatingLabelInput = ({ label, value, onChangeText, ...props }: any) => {
    const [isFocused, setIsFocused] = useState(false);
    const animatedIsFocused = useRef(new Animated.Value(value === "" ? 0 : 1)).current;

    useEffect(() => {
        Animated.timing(animatedIsFocused, {
            toValue: (isFocused || value !== "") ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused, value]);

    const labelStyle = {
        position: "absolute" as "absolute",
        left: 16,
        top: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [18, -10],
        }),
        fontSize: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: ["#aaa", "#ff6600"],
        }),
        backgroundColor: "#fff",
        paddingHorizontal: 4,
        zIndex: 1,
    };

    return (
        <View style={styles.inputContainer}>
            <Animated.Text style={labelStyle}>
                {label}
            </Animated.Text>
            <TextInput
                {...props}
                style={[
                    styles.input,
                    isFocused && { borderColor: "#ff6600" }
                ]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChangeText={onChangeText}
                value={value}
                blurOnSubmit
            />
        </View>
    );
};

export default function AddItemScreen() {
    const router = useRouter();
    const [items, setItems] = useState<HotelItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    // Form States
    const [itemName, setItemName] = useState("");
    const [unit, setUnit] = useState("");
    const [rate, setRate] = useState("");
    const [category, setCategory] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [batchItems, setBatchItems] = useState<{itemName: string, rate: string, unit: string}[]>([]);

    // New states for cart and filtering
    const [selectedCategory, setSelectedCategory] = useState("All");

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const fetchItems = async (isRefreshing = false) => {
        if (isRefreshing) {
            setRefreshing(true);
        } else {
            const cachedDataStr = await AsyncStorage.getItem('cachedHotelItems');
            const cachedTimeStr = await AsyncStorage.getItem('cachedHotelItemsTime');
            if (cachedDataStr && cachedTimeStr) {
                const cachedTime = parseInt(cachedTimeStr, 10);
                const now = new Date().getTime();
                const fourMinutes = 4 * 60 * 1000;
                if (now - cachedTime < fourMinutes) {
                    setItems(JSON.parse(cachedDataStr));
                    return;
                }
            }
            setLoading(true);
        }

        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                Alert.alert("Authentication Error", "Please log in again.");
                router.replace("/signup");
                return;
            }

            const response = await fetch(`${BASE_URL}/hotel/get-items`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();

            // Support success structure variations
            if (response.ok) {
                const fetchedList = data.data || data.items || (Array.isArray(data) ? data : []);
                setItems(fetchedList);
                await AsyncStorage.setItem('cachedHotelItems', JSON.stringify(fetchedList));
                await AsyncStorage.setItem('cachedHotelItemsTime', new Date().getTime().toString());
            } else {
                Alert.alert("Error", data.message || "Failed to fetch hotel items.");
            }
        } catch (error) {
            console.error("Fetch items error:", error);
            Alert.alert("Network Error", "Could not connect to the server.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleAddMoreItem = () => {
        if (!itemName || !unit || !rate) {
            Alert.alert("Error", "Please fill item name, rate, and unit first.");
            return;
        }
        setBatchItems([...batchItems, { itemName, rate, unit }]);
        setItemName("");
        setUnit("");
        setRate("");
    };

    const handleAction = async () => {
        if (!category) {
            Alert.alert("Error", "Please select a category.");
            return;
        }
        
        const itemsToSave = [...batchItems];
        if (itemName && unit && rate) {
            itemsToSave.push({ itemName, rate, unit });
        }

        if (itemsToSave.length === 0) {
            Alert.alert("Error", "Please add at least one item.");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            
            for (const item of itemsToSave) {
                const formData = new FormData();
                formData.append("itemName", item.itemName);
                formData.append("unit", item.unit);
                formData.append("rate", item.rate);
                formData.append("category", category);

                if (editingId && itemsToSave.length === 1) {
                    formData.append("itemId", editingId);
                }

                const url = (editingId && itemsToSave.length === 1) ? `${BASE_URL}/hotel/edit-item` : `${BASE_URL}/hotel/add-item`;
                const method = (editingId && itemsToSave.length === 1) ? "PATCH" : "POST";

                const response = await fetch(url, {
                    method,
                    body: formData,
                    headers: {
                        "Content-Type": "multipart/form-data",
                        "Authorization": `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                if (!response.ok && data.status !== "success" && !data.success) {
                    throw new Error(data.message || "Failed to save item");
                }
            }

            showToast(editingId ? "Item updated successfully" : "Items added successfully");
            resetForm();
            fetchItems(true); // Force refresh to get new items
        } catch (error) {
            console.error("Save items error:", error);
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to save items");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!idToDelete) return;
        setLoading(true);

        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/delete-item`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ itemId: idToDelete })
            });

            const data = await response.json();
            if (response.ok || data.status === "success" || data.success) {
                showToast("Item deleted successfully");
                setShowDeleteConfirm(false);
                setIdToDelete(null);
                fetchItems();
            } else {
                Alert.alert("Error", data.message || "Failed to delete item.");
            }
        } catch (error) {
            console.error("Delete item error:", error);
            Alert.alert("Error", "Failed to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setModalVisible(false);
        setItemName("");
        setUnit("");
        setRate("");
        setCategory("");
        setEditingId(null);
        setBatchItems([]);
    };

    const handleEdit = (item: HotelItem) => {
        setItemName(item.itemName);
        setUnit(item.unit);
        setRate(String(item.rate));
        setCategory(item.category || "");
        setBatchItems([]);

        setEditingId(item.itemId || item._id);
        setModalVisible(true);
    };

    const resolveImageUrl = (path: string) => {
        if (!path) return null;
        if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("file://")) {
            return path;
        }
        // Normalize leading slash
        const cleanPath = path.startsWith("/") ? path.substring(1) : path;
        // Check if path is absolute starting with uploads/ or direct uploads
        return `${BASE_URL.replace("/api/v1", "")}/${cleanPath}`;
    };

    const availableCategories = ["All", ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))];
    
    const filteredItems = items.filter((item) => {
        const matchesSearch = (item.itemName || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const renderItemCard = ({ item }: { item: HotelItem }) => {
        const imageUrl = resolveImageUrl(item.itemImage || "");
        const id = item.itemId || item._id;

        return (
            <View style={styles.gridCard}>
                {/* Admin controls at absolute top right */}
                <View style={styles.adminControlsOverlay}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.adminEditBtn}>
                        <Ionicons name="pencil" size={14} color="#0059ff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => {
                            setIdToDelete(id);
                            setShowDeleteConfirm(true);
                        }} 
                        style={styles.adminDeleteBtn}
                    >
                        <Ionicons name="trash" size={14} color="#d32f2f" />
                    </TouchableOpacity>
                </View>

                <View style={styles.gridImageContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.gridItemImg} />
                    ) : (
                        <Ionicons name="restaurant" size={40} color="#ffb380" />
                    )}
                </View>

                <View style={styles.gridItemInfo}>
                    <Text style={styles.gridItemName} numberOfLines={2}>{item.itemName}</Text>
                    <Text style={styles.gridUnitText}>{item.unit}</Text>
                    
                    <View style={styles.gridPriceActionRow}>
                        <Text style={styles.gridItemPrice}>₹{item.rate}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hotel Items</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        placeholder="Search items by name..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Main Content Split View */}
            <View style={styles.mainSplitContainer}>
                {/* Sidebar Categories */}
                <View style={styles.sidebar}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {availableCategories.map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.sidebarItem, selectedCategory === cat && styles.sidebarItemSelected]}
                                onPress={() => setSelectedCategory(cat as string)}
                            >
                                <Text style={[styles.sidebarItemText, selectedCategory === cat && styles.sidebarItemTextSelected]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Right Side Items Grid */}
                <View style={styles.itemsGridContainer}>
                    <FlatList
                        data={filteredItems}
                        renderItem={renderItemCard}
                        keyExtractor={(item) => item.itemId || item._id || Math.random().toString()}
                        numColumns={2}
                        columnWrapperStyle={styles.rowWrapper}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(true)} colors={["#ff6600"]} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                {loading ? (
                                    <ActivityIndicator size="large" color="#ff6600" />
                                ) : (
                                    <Text style={styles.emptyText}>No items found</Text>
                                )}
                            </View>
                        }
                    />
                </View>
            </View>



            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Add / Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={resetForm}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingId ? "Edit Item" : "New Item"}</Text>
                            <TouchableOpacity onPress={resetForm}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.form}>
                                <FloatingLabelInput
                                    label="Category Name"
                                    value={category}
                                    onChangeText={setCategory}
                                />

                                {batchItems.length > 0 && (
                                    <View style={styles.batchList}>
                                        {batchItems.map((item, index) => (
                                            <View key={index} style={styles.batchItemRow}>
                                                <Text style={styles.batchItemName}>{item.itemName}</Text>
                                                <Text style={styles.batchItemDetails}>₹{item.rate} / {item.unit}</Text>
                                                <TouchableOpacity onPress={() => setBatchItems(batchItems.filter((_, i) => i !== index))}>
                                                    <Ionicons name="close-circle" size={20} color="#ff3b30" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <FloatingLabelInput
                                    label="Item Name"
                                    value={itemName}
                                    onChangeText={setItemName}
                                />
                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <FloatingLabelInput
                                            label="Rate (₹)"
                                            value={rate}
                                            onChangeText={setRate}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                        <FloatingLabelInput
                                            label="Unit (e.g. piece)"
                                            value={unit}
                                            onChangeText={setUnit}
                                        />
                                    </View>
                                </View>

                                {!editingId && (
                                    <TouchableOpacity style={styles.addMoreBtn} onPress={handleAddMoreItem}>
                                        <Ionicons name="add" size={18} color="#ff6600" />
                                        <Text style={styles.addMoreBtnText}>Add More Items</Text>
                                    </TouchableOpacity>
                                )}

                                <View style={styles.modalActionRow}>
                                    <TouchableOpacity style={styles.cancelActionBtn} onPress={resetForm}>
                                        <Text style={styles.cancelActionBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.saveActionBtn, loading && { opacity: 0.7 }]}
                                        onPress={handleAction}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.saveActionBtnText}>
                                                {editingId ? "Save Changes" : "Save Items"}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                transparent
                visible={showDeleteConfirm}
                animationType="fade"
                onRequestClose={() => setShowDeleteConfirm(false)}
            >
                <View style={styles.centeredModalOverlay}>
                    <View style={styles.deleteConfirmBox}>
                        <Ionicons name="alert-circle" size={50} color="#d32f2f" />
                        <Text style={styles.deleteConfirmTitle}>Delete Item?</Text>
                        <Text style={styles.deleteConfirmSub}>This item will be permanently removed.</Text>
                        <View style={styles.deleteConfirmBtnRow}>
                            <TouchableOpacity 
                                style={styles.cancelBtn} 
                                onPress={() => setShowDeleteConfirm(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.confirmDeleteBtn} 
                                onPress={handleDelete}
                            >
                                <Text style={styles.confirmDeleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Toast */}
            {toastMessage && (
                <View style={styles.toast}>
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
        backgroundColor: "#ff6600",
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#fff",
    },
    searchContainer: {
        padding: 16,
        backgroundColor: "#ff6600",
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        fontWeight: "600",
    },
    listContent: {
        paddingTop: 12,
        paddingHorizontal: 8,
        paddingBottom: 100,
    },
    mainSplitContainer: {
        flex: 1,
        flexDirection: "row",
    },
    sidebar: {
        width: "25%",
        backgroundColor: "#f8f9fa",
        paddingVertical: 10,
        borderRightWidth: 1,
        borderColor: "#e0e0e0",
    },
    sidebarItem: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 8,
        alignSelf: "center",
        borderWidth: 1,
        borderColor: "#f5f5f5",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sidebarItemSelected: {
        backgroundColor: "#ff6600",
        borderColor: "#ff6600",
    },
    sidebarItemText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#666",
        textAlign: "center",
    },
    sidebarItemTextSelected: {
        color: "#fff",
        fontWeight: "900",
    },
    itemsGridContainer: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    rowWrapper: {
        justifyContent: "space-between",
        paddingHorizontal: 8,
    },
    gridCard: {
        width: "49%",
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        paddingBottom: 8,
    },
    gridImageContainer: {
        width: "100%",
        height: 100,
        backgroundColor: "#fff5eb",
        justifyContent: "center",
        alignItems: "center",
    },
    gridItemImg: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    gridItemInfo: {
        padding: 8,
        flex: 1,
    },
    gridItemName: {
        fontSize: 13,
        fontWeight: "800",
        color: "#333",
        marginBottom: 2,
    },
    gridUnitText: {
        fontSize: 11,
        color: "#777",
        fontWeight: "600",
        marginBottom: 8,
    },
    gridPriceActionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "auto",
    },
    gridItemPrice: {
        fontSize: 15,
        fontWeight: "900",
        color: "#000",
    },
    addBtn: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#0059ff",
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    addBtnText: {
        color: "#0059ff",
        fontSize: 12,
        fontWeight: "900",
    },
    qtyControlBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0059ff",
        borderRadius: 6,
    },
    qtyBtn: {
        padding: 4,
    },
    qtyText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "900",
        paddingHorizontal: 6,
    },
    adminControlsOverlay: {
        position: "absolute",
        top: 6,
        right: 6,
        zIndex: 10,
        flexDirection: "row",
        gap: 6,
    },
    adminEditBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: 6,
        borderRadius: 20,
    },
    adminDeleteBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: 6,
        borderRadius: 20,
    },
    bottomCartBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderColor: "#eee",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cartItemsCount: {
        fontSize: 12,
        color: "#666",
        fontWeight: "700",
    },
    cartTotalText: {
        fontSize: 18,
        fontWeight: "900",
        color: "#000",
    },
    viewCartBtn: {
        backgroundColor: "#ff6600",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    viewCartBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "900",
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#ff6600",
        justifyContent: "center",
        alignItems: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "900",
        color: "#000",
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        marginTop: 10,
        marginBottom: 10,
    },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderColor: "#eee",
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
        backgroundColor: "#fff",
    },
    categoryScroll: {
        marginBottom: 16,
    },
    categoryContainer: {
        gap: 10,
        paddingVertical: 4,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#ddd",
        marginRight: 8,
    },
    categoryChipSelected: {
        backgroundColor: "#fff5eb",
        borderColor: "#ff6600",
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
    },
    categoryChipTextSelected: {
        color: "#ff6600",
        fontWeight: "800",
    },
    itemCategoryBadge: {
        marginTop: 6,
        alignSelf: "flex-start",
        backgroundColor: "#e6f0ff",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    itemCategoryText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#0059ff",
    },
    imageLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#333",
        marginBottom: 6,
    },
    batchList: {
        backgroundColor: "#f9f9f9",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    batchItemRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#eee",
    },
    batchItemName: {
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
        color: "#333",
    },
    batchItemDetails: {
        fontSize: 13,
        fontWeight: "600",
        color: "#666",
        marginRight: 12,
    },
    addMoreBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#ff6600",
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 16,
    },
    addMoreBtnText: {
        color: "#ff6600",
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 6,
    },
    modalActionRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10,
        marginBottom: 30,
    },
    cancelActionBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ccc",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fafafa",
    },
    cancelActionBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#666",
    },
    saveActionBtn: {
        flex: 2,
        height: 50,
        backgroundColor: "#ff6600",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    saveActionBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: "#999",
        fontWeight: "600",
    },
    centeredModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    deleteConfirmBox: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        elevation: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
    },
    deleteConfirmTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#000",
        marginTop: 12,
    },
    deleteConfirmSub: {
        fontSize: 14,
        color: "#666",
        marginTop: 8,
        textAlign: "center",
    },
    deleteConfirmBtnRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
        width: "100%",
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#eee",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9f9f9",
    },
    cancelBtnText: {
        color: "#666",
        fontWeight: "700",
    },
    confirmDeleteBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: "#d32f2f",
        justifyContent: "center",
        alignItems: "center",
    },
    confirmDeleteBtnText: {
        color: "#fff",
        fontWeight: "700",
    },
    toast: {
        position: "absolute",
        bottom: 50,
        left: 40,
        right: 40,
        backgroundColor: "rgba(0,0,0,0.85)",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: "center",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    toastText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
});

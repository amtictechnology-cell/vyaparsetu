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
    SafeAreaView,
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
}

const BASE_URL = "http://192.168.31.192:6000/api/v1";

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
            outputRange: ["#aaa", "#0c831f"],
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
                    isFocused && { borderColor: "#0c831f" }
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
    const [itemImage, setItemImage] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const fetchItems = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

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

    const launchCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Camera permission is required to take photo.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setItemImage(result.assets[0].uri);
        }
    };

    const launchGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setItemImage(result.assets[0].uri);
        }
    };

    const pickImage = () => {
        Alert.alert(
            "Select Item Image",
            "Choose how you want to upload the photo",
            [
                { text: "Camera", onPress: launchCamera },
                { text: "Gallery", onPress: launchGallery },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleAction = async () => {
        if (!itemName || !unit || !rate) {
            Alert.alert("ValidationError", "Please fill all required fields.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("itemName", itemName);
        formData.append("unit", unit);
        formData.append("rate", rate);

        if (editingId) {
            formData.append("itemId", editingId);
        }

        if (itemImage && itemImage.startsWith("file://")) {
            const filename = itemImage.split("/").pop();
            const match = /\.(\w+)$/.exec(filename || "");
            const type = match ? `image/${match[1]}` : `image`;
            formData.append("itemImage", {
                uri: itemImage,
                name: filename,
                type,
            } as any);
        }

        try {
            const token = await AsyncStorage.getItem("userToken");
            const url = editingId ? `${BASE_URL}/hotel/edit-item` : `${BASE_URL}/hotel/add-item`;
            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                body: formData,
                headers: {
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (response.ok || data.status === "success" || data.success) {
                showToast(editingId ? "Item updated successfully" : "Item added successfully");
                resetForm();
                fetchItems();
            } else {
                Alert.alert("Error", data.message || "Failed to save item.");
            }
        } catch (error) {
            console.error("Save item error:", error);
            Alert.alert("Error", "Network request failed");
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
        setItemImage(null);
        setEditingId(null);
    };

    const handleEdit = (item: HotelItem) => {
        setItemName(item.itemName);
        setUnit(item.unit);
        setRate(String(item.rate));
        
        // Resolve image URL
        if (item.itemImage) {
            setItemImage(resolveImageUrl(item.itemImage));
        } else {
            setItemImage(null);
        }

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

    const filteredItems = items.filter((item) =>
        (item.itemName || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItemCard = ({ item }: { item: HotelItem }) => {
        const imageUrl = resolveImageUrl(item.itemImage || "");

        return (
            <View style={styles.card}>
                <View style={styles.cardContent}>
                    <View style={styles.itemImageContainer}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.itemImg} />
                        ) : (
                            <Ionicons name="restaurant" size={30} color="#ffb703" />
                        )}
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.itemName}</Text>
                        <View style={styles.priceUnitRow}>
                            <Text style={styles.itemPrice}>₹{item.rate}</Text>
                            <Text style={styles.unitText}>/ {item.unit}</Text>
                        </View>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
                            <Ionicons name="create" size={18} color="#f57c00" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => {
                                setIdToDelete(item.itemId || item._id);
                                setShowDeleteConfirm(true);
                            }} 
                            style={styles.deleteBtn}
                        >
                            <Ionicons name="trash" size={18} color="#d32f2f" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
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

            {/* Item List */}
            <FlatList
                data={filteredItems}
                renderItem={renderItemCard}
                keyExtractor={(item) => item.itemId || item._id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(true)} colors={["#0c831f"]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#0c831f" />
                        ) : (
                            <Text style={styles.emptyText}>No items found</Text>
                        )}
                    </View>
                }
            />

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
                                    label="Item Name"
                                    value={itemName}
                                    onChangeText={setItemName}
                                />
                                <FloatingLabelInput
                                    label="Unit (e.g. per plate, per piece, kg)"
                                    value={unit}
                                    onChangeText={setUnit}
                                />
                                <FloatingLabelInput
                                    label="Rate (₹)"
                                    value={rate}
                                    onChangeText={setRate}
                                    keyboardType="numeric"
                                />

                                <Text style={styles.imageLabel}>Item Image</Text>
                                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                                    {itemImage ? (
                                        <Image source={{ uri: itemImage }} style={styles.previewImg} />
                                    ) : (
                                        <>
                                            <Ionicons name="camera-outline" size={28} color="#666" />
                                            <Text style={styles.imagePickerText}>Select Photo</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.saveButton, loading && { opacity: 0.7 }]}
                                    onPress={handleAction}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>
                                            {editingId ? "Save Changes" : "Add Item"}
                                        </Text>
                                    )}
                                </TouchableOpacity>
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
        </SafeAreaView>
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
        backgroundColor: "#ffb703",
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#000",
    },
    searchContainer: {
        padding: 16,
        backgroundColor: "#ffb703",
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
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    cardContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    itemImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: "#fffdeb",
        borderWidth: 1,
        borderColor: "#ffe082",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
        overflow: "hidden",
    },
    itemImg: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "800",
        color: "#333",
    },
    priceUnitRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    itemPrice: {
        fontSize: 15,
        fontWeight: "800",
        color: "#0c831f",
    },
    unitText: {
        fontSize: 12,
        color: "#777",
        fontWeight: "600",
        marginLeft: 4,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
    },
    editBtn: {
        backgroundColor: "#fff3e0",
        padding: 10,
        borderRadius: 10,
    },
    deleteBtn: {
        backgroundColor: "#ffebee",
        padding: 10,
        borderRadius: 10,
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#0c831f",
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
    imageLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#333",
        marginBottom: 6,
    },
    imagePicker: {
        height: 120,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#eee",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: "#fafafa",
    },
    previewImg: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    imagePickerText: {
        fontSize: 12,
        color: "#666",
        marginTop: 6,
        fontWeight: "600",
    },
    saveButton: {
        height: 56,
        backgroundColor: "#0c831f",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
        marginBottom: 40,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 18,
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

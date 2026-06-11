import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
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
    Linking,
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

interface Customer {
    _id?: string;
    customerId?: string;
    customerName: string;
    mobileNumber: string;
    idNumber: string;
    address: string;
    idPhotos?: {
        front?: string;
        back?: string;
    };
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

export default function BookingRooms() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 1500);
    };

    // Form states
    const [customerName, setCustomerName] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [idNumber, setIdNumber] = useState("");
    const [address, setAddress] = useState("");
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchCustomers = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/get-all-customers`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.status === "success") {
                setBookings(data.data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            Alert.alert("Error", "Failed to fetch customers");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const launchCamera = async (type: 'front' | 'back') => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Camera permission is required to take photos.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            if (type === 'front') setFrontImage(result.assets[0].uri);
            else setBackImage(result.assets[0].uri);
        }
    };

    const launchGallery = async (type: 'front' | 'back') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            if (type === 'front') setFrontImage(result.assets[0].uri);
            else setBackImage(result.assets[0].uri);
        }
    };

    const pickImage = async (type: 'front' | 'back') => {
        Alert.alert(
            "Select Photo Source",
            "Choose how you want to upload the ID photo",
            [
                {
                    text: "Camera",
                    onPress: () => launchCamera(type),
                },
                {
                    text: "Gallery",
                    onPress: () => launchGallery(type),
                },
                {
                    text: "Cancel",
                    style: "cancel",
                },
            ]
        );
    };

    const handleAction = async () => {
        if (!customerName || !mobileNumber || !idNumber || !address) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("customerName", customerName);
        formData.append("mobileNumber", mobileNumber);
        formData.append("idNumber", idNumber);
        formData.append("address", address);
        if (editingId) formData.append("customerId", editingId);

        if (frontImage && frontImage.startsWith('file://')) {
            const filename = frontImage.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : `image`;
            formData.append("frontImage", { uri: frontImage, name: filename, type } as any);
        }
        if (backImage && backImage.startsWith('file://')) {
            const filename = backImage.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : `image`;
            formData.append("backImage", { uri: backImage, name: filename, type } as any);
        }

        try {
            const token = await AsyncStorage.getItem("userToken");
            const url = editingId ? `${BASE_URL}/hotel/edit-customer` : `${BASE_URL}/hotel/add-customer`;
            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
            });

            const data = await response.json();
            if (data.status === "success") {
                showToast(data.message);
                resetForm();
                fetchCustomers();
            } else {
                Alert.alert("Error", data.message || "Operation failed");
            }
        } catch (error) {
            console.error("Action error:", error);
            Alert.alert("Error", "Network request failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!idToDelete) return;
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/delete-customer`, {
                method: "DELETE",
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ customerId: idToDelete })
            });
            const data = await response.json();
            if (data.status === "success") {
                showToast("Deleted successfully");
                setShowDeleteConfirm(false);
                resetForm();
                fetchCustomers();
            }
        } catch (error) {
            Alert.alert("Error", "Failed to delete");
        }
    };

    const resetForm = () => {
        setModalVisible(false);
        setCustomerName("");
        setMobileNumber("");
        setIdNumber("");
        setAddress("");
        setFrontImage(null);
        setBackImage(null);
        setEditingId(null);
    };

    const handleEdit = (item: Customer) => {
        setCustomerName(item.customerName);
        setMobileNumber(item.mobileNumber);
        setIdNumber(item.idNumber);
        setAddress(item.address);
        setFrontImage(item.idPhotos?.front ? `${BASE_URL}/${item.idPhotos.front}` : null);
        setBackImage(item.idPhotos?.back ? `${BASE_URL}/${item.idPhotos.back}` : null);
        setEditingId(item.customerId || item._id || null);
        setModalVisible(true);
    };

    const handleCall = (number: string) => {
        Linking.openURL(`tel:${number}`);
    };

    const filteredBookings = bookings.filter((b) =>
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.mobileNumber.includes(searchQuery) ||
        b.idNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderBookingItem = ({ item }: { item: Customer }) => (
        <TouchableOpacity
            style={styles.card}
            onLongPress={() => {
                setIdToDelete(item.customerId || item._id || "");
                setShowDeleteConfirm(true);
            }}
            onPress={() => router.push({
                pathname: "/customerprofile",
                params: {
                    customerData: JSON.stringify({
                        id: item.customerId || item._id,
                        name: item.customerName,
                        mobile: item.mobileNumber,
                        idNumber: item.idNumber,
                        address: item.address,
                        frontPhoto: item.idPhotos?.front ? `${BASE_URL}/${item.idPhotos.front}` : null,
                        backPhoto: item.idPhotos?.back ? `${BASE_URL}/${item.idPhotos.back}` : null
                    }),
                    roomNumber: "Booking"
                }
            } as any)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    {item.idPhotos?.front ? (
                        <Image source={{ uri: `${BASE_URL}/${item.idPhotos.front}` }} style={styles.avatarImg} />
                    ) : (
                        <Ionicons name="person" size={24} color="#666" />
                    )}
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                    <Text style={styles.mobileNumber}>{item.mobileNumber}</Text>
                    <Text style={styles.idDisplay}>ID: {item.idNumber}</Text>
                </View>
                <View style={styles.actionIcons}>
                    <TouchableOpacity onPress={() => handleCall(item.mobileNumber)} style={styles.iconButtonCall}>
                        <Ionicons name="call" size={18} color="#0c831f" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButtonEdit}>
                        <Ionicons name="create" size={18} color="#f57c00" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Rooms</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        placeholder="Search name, mobile or ID..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Bookings List */}
            <FlatList
                data={filteredBookings}
                renderItem={renderBookingItem}
                keyExtractor={(item) => item.customerId || item._id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchCustomers(true)} colors={["#0c831f"]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? <ActivityIndicator size="large" color="#0c831f" /> : <Text style={styles.emptyText}>No bookings found</Text>}
                    </View>
                }
            />

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Add/Edit Booking Modal */}
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
                            <Text style={styles.modalTitle}>{editingId ? "Edit Booking" : "New Booking"}</Text>
                            <TouchableOpacity onPress={resetForm}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.form}>
                                <FloatingLabelInput
                                    label="Customer Name"
                                    value={customerName}
                                    onChangeText={setCustomerName}
                                />
                                <FloatingLabelInput
                                    label="Mobile Number"
                                    value={mobileNumber}
                                    onChangeText={setMobileNumber}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                                <FloatingLabelInput
                                    label="ID Number"
                                    value={idNumber}
                                    onChangeText={setIdNumber}
                                />
                                <FloatingLabelInput
                                    label="Address"
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                />

                                <View style={styles.imageSection}>
                                    <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('front')}>
                                        {frontImage ? (
                                            <Image source={{ uri: frontImage }} style={styles.previewImg} />
                                        ) : (
                                            <>
                                                <Ionicons name="camera-outline" size={24} color="#666" />
                                                <Text style={styles.imagePickerText}>Front ID Photo</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('back')}>
                                        {backImage ? (
                                            <Image source={{ uri: backImage }} style={styles.previewImg} />
                                        ) : (
                                            <>
                                                <Ionicons name="camera-outline" size={24} color="#666" />
                                                <Text style={styles.imagePickerText}>Back ID Photo</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveButton, loading && { opacity: 0.7 }]}
                                    onPress={handleAction}
                                    disabled={loading}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <Text style={styles.saveButtonText}>{editingId ? "Save Changes" : "Confirm Booking"}</Text>
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
                        <Text style={styles.deleteConfirmTitle}>Sure Delete?</Text>
                        <Text style={styles.deleteConfirmSub}>This action cannot be undone.</Text>
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
    container: { flex: 1, backgroundColor: "#f8f9fa" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
        backgroundColor: "#ffb703",
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: "900", color: "#000" },
    searchContainer: {
        padding: 16,
        backgroundColor: "#ffb703",
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        elevation: 2,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, fontWeight: "600" },
    listContent: { paddingBottom: 100 },
    card: {
        backgroundColor: "#f4feffff",
        padding: 16,
        marginBottom: 2,
        elevation: 3,
        shadowColor: "#f7f444ff",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: { flexDirection: "row", alignItems: "center" },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#e7f9ffff",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        overflow: 'hidden'
    },
    avatarImg: { width: '100%', height: '100%' },
    cardInfo: { flex: 1 },
    customerName: { fontSize: 20, fontWeight: "500", color: "#333" },
    mobileNumber: { fontSize: 14, color: "#666", fontWeight: "500" },
    idDisplay: { fontSize: 13, color: "#888", fontWeight: "600", marginTop: 2 },
    actionIcons: { flexDirection: 'row', gap: 10 },
    iconButtonCall: { backgroundColor: '#e8f5e9', padding: 8, borderRadius: 10 },
    iconButtonEdit: { backgroundColor: '#fff3e0', padding: 8, borderRadius: 10 },
    iconButtonDelete: { backgroundColor: '#ffebee', padding: 8, borderRadius: 10 },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#0c831f",
        justifyContent: "center",
        alignItems: "center",
        elevation: 6,
    },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    centeredModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: "90%"
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24
    },
    modalTitle: { fontSize: 24, fontWeight: "900", color: "#000" },
    form: { gap: 16 },
    inputContainer: { marginTop: 10, marginBottom: 10 },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderColor: "#eee",
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
        backgroundColor: "#fff"
    },
    imageSection: { flexDirection: 'row', gap: 12, marginTop: 10 },
    imagePicker: {
        flex: 1,
        height: 100,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#eee",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        overflow: 'hidden'
    },
    previewImg: { width: '100%', height: '100%' },
    imagePickerText: { fontSize: 12, color: "#666", marginTop: 4, fontWeight: '600' },
    saveButton: {
        height: 56,
        backgroundColor: "#0c831f",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
        marginBottom: 40
    },
    saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    emptyContainer: { alignItems: "center", marginTop: 100 },
    emptyText: { fontSize: 16, color: "#999", fontWeight: "600" },
    toast: {
        position: 'absolute',
        bottom: 100,
        left: 40,
        right: 40,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 10
    },
    toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    deleteConfirmBox: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        elevation: 20
    },
    deleteConfirmTitle: { fontSize: 20, fontWeight: "900", color: "#000", marginTop: 12 },
    deleteConfirmSub: { fontSize: 14, color: "#666", marginTop: 8, textAlign: "center" },
    deleteConfirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 24, width: "100%" },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#eee",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9f9f9"
    },
    cancelBtnText: { color: "#666", fontWeight: "700" },
    confirmDeleteBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: "#d32f2f",
        justifyContent: "center",
        alignItems: "center"
    },
    confirmDeleteBtnText: { color: "#fff", fontWeight: "700" },
});

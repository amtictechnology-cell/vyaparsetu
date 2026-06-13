import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
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
import LogoutModal from "../components/LogoutModal";

interface BillingCustomer {
    _id: string;
    customerId?: string;
    customerName: string;
    mobileNumber: string;
    shopName?: string; // Fallback
}

interface BillItem {
    itemName: string;
    qty: number;
    unit: string;
    price: number;
    amount?: number;
}

interface Bill {
    _id: string;
    billId?: string;
    customerId: string | { _id: string; customerName: string; mobileNumber?: string };
    customerName?: string;
    paymentStatus: "pending" | "done";
    items: BillItem[];
    grandTotal: number;
    createdAt?: string;
}

interface MenuItem {
    _id: string;
    itemId?: string;
    itemName: string;
    unit: string;
    rate: number;
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

export default function BillGenerateScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"customers" | "bills">("customers");
    const [customers, setCustomers] = useState<BillingCustomer[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Customer Modal Form States
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerMobile, setNewCustomerMobile] = useState("");

    // Bill Builder Screen Overlay States
    const [billModalVisible, setBillModalVisible] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<BillingCustomer | null>(null);
    const [editingBillId, setEditingBillId] = useState<string | null>(null);
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [paymentStatus, setPaymentStatus] = useState<"pending" | "done">("pending");
    const [notes, setNotes] = useState("");

    // Accordion State for Bill History
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [customerBills, setCustomerBills] = useState<Bill[]>([]);

    // Dropdown for item autocomplete suggestions per row
    const [activeRowDropdownIndex, setActiveRowDropdownIndex] = useState<number | null>(null);

    // Bill Details Modal (viewing from Bills History tab)
    const [billDetailsModalVisible, setBillDetailsModalVisible] = useState(false);
    const [viewingBill, setViewingBill] = useState<Bill | null>(null);

    // Delete Confirmation
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [billIdToDelete, setBillIdToDelete] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
    };

    // ── Fetch Operations ───────────────────────────────────────────────────

    const fetchCustomers = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/bill-customers`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCustomers(data.data || data.customers || (Array.isArray(data) ? data : []));
            } else {
                Alert.alert("Error", data.message || "Failed to fetch billing customers.");
            }
        } catch (error) {
            console.error("Fetch customers error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchBills = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/get-bills`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setBills(data.data || data.bills || (Array.isArray(data) ? data : []));
            } else {
                Alert.alert("Error", data.message || "Failed to fetch bills.");
            }
        } catch (error) {
            console.error("Fetch bills error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchMenuItems = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/get-items`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMenuItems(data.data || data.items || (Array.isArray(data) ? data : []));
            }
        } catch (error) {
            console.error("Fetch menu items error:", error);
        }
    };

    useEffect(() => {
        fetchCustomers();
        fetchBills();
        fetchMenuItems();
    }, []);

    const onRefresh = () => {
        if (activeTab === "customers") {
            fetchCustomers(true);
        } else {
            fetchBills(true);
        }
    };

    // ── Customer Actions & Calling ─────────────────────────────────────────

    const handleAddCustomer = async () => {
        if (!newCustomerName || !newCustomerMobile) {
            Alert.alert("ValidationError", "Please enter name and mobile number.");
            return;
        }
        if (newCustomerMobile.length !== 10) {
            Alert.alert("ValidationError", "Mobile number must be 10 digits.");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/bill-customer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    customerName: newCustomerName,
                    mobileNumber: newCustomerMobile
                })
            });

            const data = await response.json();
            if (response.ok) {
                showToast("Customer added successfully");
                setNewCustomerName("");
                setNewCustomerMobile("");
                setCustomerModalVisible(false);
                fetchCustomers();
            } else {
                Alert.alert("Error", data.message || "Failed to add customer.");
            }
        } catch (error) {
            Alert.alert("Error", "Network request failed");
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (number: string) => {
        Linking.openURL(`tel:${number}`);
    };

    const handleWhatsApp = (number: string, name: string) => {
        // WhatsApp link format
        const cleanNumber = number.replace(/\D/g, "");
        const formattedNumber = cleanNumber.startsWith("91") ? cleanNumber : `91${cleanNumber}`;
        const message = `Hello ${name}, your bill details are ready.`;
        Linking.openURL(`whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`).catch(() => {
            Linking.openURL(`https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`);
        });
    };

    const handleViewCustomerBills = (cust: BillingCustomer) => {
        setActiveTab("bills");
        setSearchQuery(cust.customerName);
    };

    const resetBuilderItemForm = () => {
        setBillModalVisible(false);
        setEditingBillId(null);
        setSelectedCustomer(null);
        setBillItems([]);
        setNotes("");
        setPaymentStatus("pending");
        setActiveRowDropdownIndex(null);
    };

    const fetchCustomerBillsHistory = async (cId: string) => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/get-bills?customerId=${cId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                const fetchedBills = data.data || data.bills || (Array.isArray(data) ? data : []);
                setCustomerBills(fetchedBills);
            }
        } catch (error) {
            console.error("Fetch customer bills history error:", error);
        }
    };

    // ── Bill Builder Operations ────────────────────────────────────────────

    const openBillBuilderForCreate = (cust: BillingCustomer) => {
        setSelectedCustomer(cust);
        setEditingBillId(null);
        setPaymentStatus("pending");
        setNotes("");
        setHistoryExpanded(false);
        // Default with one empty item row
        setBillItems([{ itemName: "", qty: 1, unit: "Plate", price: 0 }]);
        fetchCustomerBillsHistory(cust.customerId || cust._id);
        setBillModalVisible(true);
    };

    const openBillBuilderForEdit = (bill: Bill) => {
        const custObj = typeof bill.customerId === 'object' ? bill.customerId : { _id: bill.customerId, customerName: bill.customerName || "Customer", mobileNumber: "" };
        const cust: BillingCustomer = {
            _id: custObj._id,
            customerId: custObj._id,
            customerName: custObj.customerName,
            mobileNumber: custObj.mobileNumber || ""
        };
        setSelectedCustomer(cust);
        setEditingBillId(bill.billId || bill._id);
        setPaymentStatus(bill.paymentStatus);
        setNotes("");
        setHistoryExpanded(false);
        setBillItems(bill.items || []);
        fetchCustomerBillsHistory(custObj._id);
        setBillModalVisible(true);
    };

    const handleAddRow = () => {
        setBillItems(prev => [...prev, { itemName: "", qty: 1, unit: "Plate", price: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        if (billItems.length === 1) {
            // Keep at least one row
            setBillItems([{ itemName: "", qty: 1, unit: "Plate", price: 0 }]);
        } else {
            setBillItems(prev => prev.filter((_, i) => i !== index));
        }
        setActiveRowDropdownIndex(null);
    };

    const updateRowField = (index: number, field: keyof BillItem, value: any) => {
        setBillItems(prev => prev.map((item, i) => {
            if (i === index) {
                const updated = { ...item, [field]: value };
                if (field === "qty" || field === "price") {
                    updated.amount = (updated.qty || 0) * (updated.price || 0);
                }
                return updated;
            }
            return item;
        }));
    };

    const handleSelectRowMenuItem = (rowIndex: number, menuItem: MenuItem) => {
        setBillItems(prev => prev.map((item, i) => i === rowIndex ? {
            itemName: menuItem.itemName,
            unit: menuItem.unit,
            price: menuItem.rate,
            qty: item.qty || 1,
            amount: (item.qty || 1) * menuItem.rate
        } : item));
        setActiveRowDropdownIndex(null);
    };

    const calculateGrandTotal = () => {
        return billItems.reduce((acc, curr) => acc + ((curr.qty || 0) * (curr.price || 0)), 0);
    };

    const handleSaveBill = async () => {
        // Validation: Filter out empty rows, ensure fields are filled
        const validItems = billItems.filter(item => item.itemName.trim() !== "");
        if (validItems.length === 0) {
            Alert.alert("ValidationError", "Please enter at least one valid item name.");
            return;
        }

        for (const item of validItems) {
            if (!item.qty || item.qty <= 0) {
                Alert.alert("ValidationError", `Quantity for "${item.itemName}" must be greater than 0.`);
                return;
            }
            if (item.price === undefined || item.price < 0) {
                Alert.alert("ValidationError", `Price for "${item.itemName}" must be 0 or more.`);
                return;
            }
        }

        if (!selectedCustomer) return;

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const cId = selectedCustomer.customerId || selectedCustomer._id;

            const url = editingBillId ? `${BASE_URL}/hotel/edit-bill` : `${BASE_URL}/hotel/create-bill`;
            const method = editingBillId ? "PATCH" : "POST";

            const bodyData: any = {
                paymentStatus,
                items: validItems
            };

            if (editingBillId) {
                bodyData.billId = editingBillId;
            } else {
                bodyData.customerId = cId;
            }

            // Note: Sending notes if supported by custom backend logic, otherwise it is ignored but safe.
            if (notes) {
                bodyData.notes = notes;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(bodyData)
            });

            const data = await response.json();
            if (response.ok) {
                showToast(editingBillId ? "Bill updated successfully" : "Bill created successfully");
                setBillModalVisible(false);
                setEditingBillId(null);
                setBillItems([]);
                setNotes("");
                fetchBills();
            } else {
                Alert.alert("Error", data.message || "Failed to save bill.");
            }
        } catch (error) {
            Alert.alert("Error", "Network request failed");
        } finally {
            setLoading(false);
        }
    };

    // ── Delete Bill Operations ─────────────────────────────────────────────

    const confirmDeleteBill = (billId: string) => {
        setBillIdToDelete(billId);
        setDeleteConfirmVisible(true);
    };

    const handleDeleteBill = async () => {
        if (!billIdToDelete) return;
        setLoading(true);

        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/delete-bill`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ billId: billIdToDelete })
            });

            const data = await response.json();
            if (response.ok) {
                showToast("Bill deleted successfully");
                setDeleteConfirmVisible(false);
                setBillIdToDelete(null);
                if (viewingBill && viewingBill._id === billIdToDelete) {
                    setBillDetailsModalVisible(false);
                }
                if (selectedCustomer) {
                    fetchCustomerBillsHistory(selectedCustomer.customerId || selectedCustomer._id);
                }
                fetchBills();
            } else {
                Alert.alert("Error", data.message || "Failed to delete bill.");
            }
        } catch (error) {
            Alert.alert("Error", "Network error occurred.");
        } finally {
            setLoading(false);
        }
    };

    // ── Bill Quick Status Toggle (PATCH) ───────────────────────────────────

    const handleTogglePaymentStatus = async (bill: Bill) => {
        const newStatus = bill.paymentStatus === "done" ? "pending" : "done";
        setLoading(true);

        try {
            const token = await AsyncStorage.getItem("userToken");
            const bId = bill.billId || bill._id;

            const response = await fetch(`${BASE_URL}/hotel/edit-bill`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    billId: bId,
                    paymentStatus: newStatus
                })
            });

            const data = await response.json();
            if (response.ok) {
                showToast(`Bill marked as ${newStatus}`);
                fetchBills();
                if (viewingBill && (viewingBill.billId === bId || viewingBill._id === bId)) {
                    setViewingBill(prev => prev ? { ...prev, paymentStatus: newStatus } : null);
                }
                if (selectedCustomer) {
                    fetchCustomerBillsHistory(selectedCustomer.customerId || selectedCustomer._id);
                }
            } else {
                Alert.alert("Error", data.message || "Failed to update payment status.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // ── Render Helpers ─────────────────────────────────────────────────────

    const getCustomerDisplayName = (cust: any) => {
        if (typeof cust === 'object' && cust !== null) {
            return cust.customerName;
        }
        return cust || "Billing Customer";
    };

    const getCustomerInitial = (name: string) => {
        return name ? name.charAt(0).toUpperCase() : "?";
    };

    const filteredCustomers = customers.filter(c =>
        (c.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mobileNumber || "").includes(searchQuery)
    );

    const filteredBills = bills.filter(b => {
        const name = typeof b.customerId === 'object' ? b.customerId.customerName : (b.customerName || "");
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const renderCustomerItem = ({ item }: { item: BillingCustomer }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#1565c0" />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                    <Text style={styles.mobileNumber}>{item.mobileNumber}</Text>
                </View>
                <View style={styles.customerActions}>
                    <TouchableOpacity 
                        style={[styles.actionBtnIcon, { backgroundColor: "#e8f5e9" }]} 
                        onPress={() => openBillBuilderForCreate(item)}
                    >
                        <Ionicons name="receipt-outline" size={18} color="#0c831f" />
                        <Text style={[styles.actionBtnText, { color: "#0c831f" }]}>Bill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtnIcon, { backgroundColor: "#e3f2fd" }]} 
                        onPress={() => handleViewCustomerBills(item)}
                    >
                        <Ionicons name="eye-outline" size={18} color="#1565c0" />
                        <Text style={[styles.actionBtnText, { color: "#1565c0" }]}>History</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderBillItem = ({ item }: { item: Bill }) => {
        const custName = getCustomerDisplayName(item.customerId);
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";

        return (
            <TouchableOpacity 
                style={styles.card} 
                onPress={() => {
                    setViewingBill(item);
                    setBillDetailsModalVisible(true);
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                        <Text style={styles.customerName}>{custName}</Text>
                        <View style={styles.billMetaRow}>
                            <Text style={styles.billMetaText}>{dateStr}</Text>
                            <Text style={styles.billMetaText}>· {item.items?.length || 0} Items</Text>
                        </View>
                    </View>
                    <View style={styles.billRight}>
                        <Text style={styles.grandTotalText}>₹{item.grandTotal}</Text>
                        <TouchableOpacity 
                            onPress={() => handleTogglePaymentStatus(item)}
                            style={[
                                styles.statusBadge, 
                                item.paymentStatus === "done" ? styles.bgStatusDone : styles.bgStatusPending
                            ]}
                        >
                            <Text style={[
                                styles.statusText, 
                                item.paymentStatus === "done" ? styles.textStatusDone : styles.textStatusPending
                            ]}>
                                {item.paymentStatus.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
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
                <Text style={styles.headerTitle}>Bill Generate</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === "customers" && styles.activeTab]}
                    onPress={() => {
                        setActiveTab("customers");
                        setSearchQuery("");
                    }}
                >
                    <Ionicons name="people" size={18} color={activeTab === "customers" ? "#000" : "#666"} />
                    <Text style={[styles.tabText, activeTab === "customers" && styles.activeTabText]}>Customers</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === "bills" && styles.activeTab]}
                    onPress={() => {
                        setActiveTab("bills");
                        setSearchQuery("");
                    }}
                >
                    <Ionicons name="document-text" size={18} color={activeTab === "bills" ? "#000" : "#666"} />
                    <Text style={[styles.tabText, activeTab === "bills" && styles.activeTabText]}>Bills History</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        placeholder={activeTab === "customers" ? "Search customer name or mobile..." : "Search customer name..."}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Main Content List */}
            {activeTab === "customers" ? (
                <FlatList
                    data={filteredCustomers}
                    renderItem={renderCustomerItem}
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0c831f"]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {loading ? (
                                <ActivityIndicator size="large" color="#0c831f" />
                            ) : (
                                <Text style={styles.emptyText}>No customers found</Text>
                            )}
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={filteredBills}
                    renderItem={renderBillItem}
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0c831f"]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {loading ? (
                                <ActivityIndicator size="large" color="#0c831f" />
                            ) : (
                                <Text style={styles.emptyText}>No bills found</Text>
                            )}
                        </View>
                    }
                />
            )}

            {/* Floating Action Button (Only on Customers tab) */}
            {activeTab === "customers" && (
                <TouchableOpacity style={styles.fab} onPress={() => setCustomerModalVisible(true)}>
                    <Ionicons name="person-add" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            {/* ── Add Customer Modal ── */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={customerModalVisible}
                onRequestClose={() => setCustomerModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Customer</Text>
                            <TouchableOpacity onPress={() => setCustomerModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formContainer}>
                            <FloatingLabelInput
                                label="Customer Name"
                                value={newCustomerName}
                                onChangeText={setNewCustomerName}
                            />
                            <FloatingLabelInput
                                label="Mobile Number"
                                value={newCustomerMobile}
                                onChangeText={setNewCustomerMobile}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                            <TouchableOpacity style={styles.saveButton} onPress={handleAddCustomer}>
                                <Text style={styles.saveButtonText}>Add Customer</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* ── Bill Builder Modal (Screen Overlay - Matched to Screenshot) ── */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={billModalVisible}
                onRequestClose={resetBuilderItemForm}
            >
                <SafeAreaView style={styles.builderOverlayContainer}>
                    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

                    {/* Header bar of modal */}
                    <View style={styles.builderHeaderBar}>
                        <TouchableOpacity onPress={() => setBillModalVisible(false)} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{editingBillId ? "Edit Bill" : "Generate Bill"}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.builderScroll} showsVerticalScrollIndicator={false}>
                        {/* 1. Customer Information Card */}
                        {selectedCustomer && (
                            <View style={styles.profileCard}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarLetter}>{getCustomerInitial(selectedCustomer.customerName)}</Text>
                                </View>
                                <View style={styles.profileMeta}>
                                    <Text style={styles.profileName}>{selectedCustomer.customerName}</Text>
                                    <View style={styles.metaIconRow}>
                                        <Ionicons name="call-outline" size={14} color="#666" />
                                        <Text style={styles.profileSubText}>+91 {selectedCustomer.mobileNumber}</Text>
                                    </View>
                                    <View style={styles.metaIconRow}>
                                        <Ionicons name="business-outline" size={14} color="#666" />
                                        <Text style={styles.profileSubText}>{selectedCustomer.shopName || "Hotel/Shop"}</Text>
                                    </View>
                                </View>
                                <View style={styles.profileButtons}>
                                    <TouchableOpacity style={styles.roundCallBtn} onPress={() => handleCall(selectedCustomer.mobileNumber)}>
                                        <Ionicons name="call" size={18} color="#1565c0" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.roundWhatsappBtn} onPress={() => handleWhatsApp(selectedCustomer.mobileNumber, selectedCustomer.customerName)}>
                                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* 2. Main Billing Card Container */}
                        <View style={styles.mainBillingContainer}>
                            <View style={styles.sectionTitleRow}>
                                <View style={styles.titleWithIcon}>
                                    <Ionicons name="receipt-outline" size={20} color="#0c831f" />
                                    <Text style={styles.sectionHeadline}>Naya Bill Banao</Text>
                                </View>
                                <TouchableOpacity style={styles.roundPlusBtn} onPress={handleAddRow}>
                                    <Ionicons name="add" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Table Column Headers */}
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.headerCell, { flex: 0.3 }]}>#</Text>
                                <Text style={[styles.headerCell, { flex: 2.2 }]}>ITEM</Text>
                                <Text style={[styles.headerCell, { flex: 1, textAlign: "center" }]}>PRICE</Text>
                                <Text style={[styles.headerCell, { flex: 1, textAlign: "center" }]}>QTY</Text>
                                <Text style={[styles.headerCell, { flex: 1.2, textAlign: "right" }]}>AMT</Text>
                                <View style={{ width: 30 }} />
                            </View>

                            {/* Dynamic Bill Items list */}
                            {billItems.map((item, index) => (
                                <View key={index} style={{ zIndex: activeRowDropdownIndex === index ? 99 : 1 }}>
                                    <View style={styles.tableDataRow}>
                                        <Text style={[styles.rowCellIndex, { flex: 0.3 }]}>{index + 1}</Text>
                                        
                                        {/* Dropdown Auto-suggest input */}
                                        <View style={{ flex: 2.2, position: "relative" }}>
                                            <TouchableOpacity 
                                                style={styles.dropdownInputTrigger}
                                                onPress={() => setActiveRowDropdownIndex(activeRowDropdownIndex === index ? null : index)}
                                            >
                                                <Text style={styles.dropdownInputText} numberOfLines={1}>
                                                    {item.itemName || "Select Item..."}
                                                </Text>
                                                <Ionicons name="chevron-down" size={12} color="#666" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Price Field */}
                                        <TextInput
                                            keyboardType="numeric"
                                            style={[styles.rowCellInput, { flex: 1 }]}
                                            value={item.price ? String(item.price) : ""}
                                            onChangeText={(val) => updateRowField(index, "price", parseFloat(val) || 0)}
                                            placeholder="0"
                                        />

                                        {/* Qty Field */}
                                        <TextInput
                                            keyboardType="numeric"
                                            style={[styles.rowCellInput, { flex: 1 }]}
                                            value={item.qty ? String(item.qty) : ""}
                                            onChangeText={(val) => updateRowField(index, "qty", parseInt(val) || 0)}
                                            placeholder="1"
                                        />

                                        {/* Amount */}
                                        <Text style={[styles.rowCellAmount, { flex: 1.2 }]}>₹{((item.qty || 0) * (item.price || 0))}</Text>

                                        {/* Remove Button */}
                                        <TouchableOpacity onPress={() => handleRemoveRow(index)} style={styles.rowCellRemove}>
                                            <Ionicons name="close-circle" size={18} color="#e0e0e0" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Auto-suggest dropdown menu */}
                                    {activeRowDropdownIndex === index && (
                                        <View style={styles.rowDropdownMenu}>
                                            {/* Search bar inside suggestion menu */}
                                            <TextInput
                                                style={styles.dropdownSearchField}
                                                placeholder="Search or type item..."
                                                value={item.itemName}
                                                onChangeText={(val) => updateRowField(index, "itemName", val)}
                                            />
                                            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 120 }}>
                                                {menuItems
                                                    .filter(m => m.itemName.toLowerCase().includes(item.itemName.toLowerCase()))
                                                    .map(menuItem => (
                                                        <TouchableOpacity 
                                                            key={menuItem._id}
                                                            style={styles.dropdownMenuItemRow}
                                                            onPress={() => handleSelectRowMenuItem(index, menuItem)}
                                                        >
                                                            <Text style={styles.menuItemRowName}>{menuItem.itemName}</Text>
                                                            <Text style={styles.menuItemRowMeta}>₹{menuItem.rate} / {menuItem.unit}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                            </ScrollView>
                                            <TouchableOpacity 
                                                style={styles.dropdownCloseBtn}
                                                onPress={() => setActiveRowDropdownIndex(null)}
                                            >
                                                <Text style={styles.dropdownCloseBtnText}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ))}

                            <View style={{ height: 20 }} />

                            {/* 3. Grand Total Banner */}
                            <View style={styles.grandTotalBox}>
                                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                                <Text style={styles.grandTotalAmount}>₹{calculateGrandTotal().toFixed(2)}</Text>
                            </View>

                            {/* 4. Payment Status Picker */}
                            <View style={styles.paymentStatusRow}>
                                <Text style={styles.paymentStatusLabel}>Payment Status:</Text>
                                <View style={styles.statusButtonsContainer}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.statusOptionBtn, 
                                            paymentStatus === "pending" ? styles.optionPendingActive : styles.optionInactive
                                        ]}
                                        onPress={() => setPaymentStatus("pending")}
                                    >
                                        <Ionicons name="time" size={16} color="#e65100" />
                                        <Text style={[styles.statusOptionText, paymentStatus === "pending" && styles.textPendingActive]}>Pending</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[
                                            styles.statusOptionBtn, 
                                            paymentStatus === "done" ? styles.optionDoneActive : styles.optionInactive
                                        ]}
                                        onPress={() => setPaymentStatus("done")}
                                    >
                                        <Ionicons name="checkmark-circle" size={16} color={paymentStatus === "done" ? "#fff" : "#0c831f"} />
                                        <Text style={[styles.statusOptionText, paymentStatus === "done" && styles.textDoneActive]}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* 5. Notes Option Input */}
                            <TextInput
                                style={styles.notesTextInput}
                                placeholder="Notes (optional) — e.g. Kal tak payment ho jayegi"
                                placeholderTextColor="#aaa"
                                value={notes}
                                onChangeText={setNotes}
                            />

                            {/* 6. Generate Bill Button */}
                            <TouchableOpacity style={styles.bigGreenSubmitBtn} onPress={handleSaveBill}>
                                <View style={styles.submitBtnInner}>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text style={styles.submitBtnText}>Bill Banao</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* ── 7. Accordion Section for Bill History ── */}
                        <View style={styles.accordionSection}>
                            <TouchableOpacity 
                                style={styles.accordionHeader}
                                onPress={() => setHistoryExpanded(!historyExpanded)}
                            >
                                <View style={styles.accordionLeft}>
                                    <Ionicons name="document-text-outline" size={20} color="#0c831f" />
                                    <Text style={styles.accordionTitle}>Bill History</Text>
                                    <View style={styles.accordionBadge}>
                                        <Text style={styles.accordionBadgeText}>{customerBills.length}</Text>
                                    </View>
                                </View>
                                <Ionicons name={historyExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                            </TouchableOpacity>

                            {historyExpanded && (
                                <View style={styles.accordionContentList}>
                                    {customerBills.length === 0 ? (
                                        <Text style={styles.emptyHistoryText}>No bills found for this customer.</Text>
                                    ) : (
                                        customerBills.map(billItem => {
                                            const billDate = billItem.createdAt ? new Date(billItem.createdAt).toLocaleDateString() : "";
                                            return (
                                                <TouchableOpacity 
                                                    key={billItem._id}
                                                    style={styles.historyBillRow}
                                                    onPress={() => {
                                                        setViewingBill(billItem);
                                                        setBillDetailsModalVisible(true);
                                                    }}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.historyBillDate}>{billDate}</Text>
                                                        <Text style={styles.historyBillItems}>{billItem.items?.length || 0} items</Text>
                                                    </View>
                                                    <View style={{ alignItems: "flex-end" }}>
                                                        <Text style={styles.historyBillTotal}>₹{billItem.grandTotal}</Text>
                                                        <View style={[
                                                            styles.historyBillStatusBadge,
                                                            billItem.paymentStatus === "done" ? styles.bgStatusDone : styles.bgStatusPending
                                                        ]}>
                                                            <Text style={[
                                                                styles.statusText, 
                                                                billItem.paymentStatus === "done" ? styles.textStatusDone : styles.textStatusPending
                                                            ]}>
                                                                {billItem.paymentStatus.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* ── Bill Details Modal ── */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={billDetailsModalVisible}
                onRequestClose={() => setBillDetailsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentLarge}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Bill Details</Text>
                                <Text style={styles.modalSubtitle}>
                                    Customer: {viewingBill ? getCustomerDisplayName(viewingBill.customerId) : ""}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setBillDetailsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {viewingBill && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailsHeaderBlock}>
                                    <View>
                                        <Text style={styles.detailsLabel}>GRAND TOTAL</Text>
                                        <Text style={styles.detailsGrandTotal}>₹{viewingBill.grandTotal}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={[
                                            styles.detailsStatusBadge,
                                            viewingBill.paymentStatus === "done" ? styles.bgStatusDone : styles.bgStatusPending
                                        ]}
                                        onPress={() => handleTogglePaymentStatus(viewingBill)}
                                    >
                                        <Text style={[
                                            styles.statusText, 
                                            viewingBill.paymentStatus === "done" ? styles.textStatusDone : styles.textStatusPending
                                        ]}>
                                            {viewingBill.paymentStatus.toUpperCase()}
                                        </Text>
                                        <Ionicons name="swap-horizontal" size={14} color={viewingBill.paymentStatus === "done" ? "#0c831f" : "#d32f2f"} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.formSectionLabel}>Items ({viewingBill.items?.length || 0})</Text>
                                <View style={styles.detailsItemsBlock}>
                                    {viewingBill.items?.map((item, index) => (
                                        <View key={index} style={styles.detailsItemRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.detailsItemName}>{item.itemName}</Text>
                                                <Text style={styles.detailsItemMeta}>{item.qty} {item.unit} x ₹{item.price}</Text>
                                            </View>
                                            <Text style={styles.detailsItemAmount}>₹{item.qty * item.price}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.detailsActionsBlock}>
                                    <TouchableOpacity 
                                        style={styles.detailsEditBtn}
                                        onPress={() => {
                                            setBillDetailsModalVisible(false);
                                            openBillBuilderForEdit(viewingBill);
                                        }}
                                    >
                                        <Ionicons name="create-outline" size={20} color="#fff" />
                                        <Text style={styles.detailsActionText}>Edit Bill</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.detailsDeleteBtn}
                                        onPress={() => confirmDeleteBill(viewingBill.billId || viewingBill._id)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#fff" />
                                        <Text style={styles.detailsActionText}>Delete Bill</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── Delete Confirmation Modal ── */}
            <Modal
                transparent
                visible={deleteConfirmVisible}
                animationType="fade"
                onRequestClose={() => setDeleteConfirmVisible(false)}
            >
                <View style={styles.centeredModalOverlay}>
                    <View style={styles.deleteConfirmBox}>
                        <Ionicons name="alert-circle" size={50} color="#d32f2f" />
                        <Text style={styles.deleteConfirmTitle}>Delete Bill?</Text>
                        <Text style={styles.deleteConfirmSub}>This bill will be permanently removed.</Text>
                        <View style={styles.deleteConfirmBtnRow}>
                            <TouchableOpacity 
                                style={styles.cancelBtn} 
                                onPress={() => setDeleteConfirmVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.confirmDeleteBtn} 
                                onPress={handleDeleteBill}
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
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        gap: 6,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderColor: "#ffb703",
    },
    tabText: {
        fontSize: 14,
        color: "#666",
        fontWeight: "700",
    },
    activeTabText: {
        color: "#000",
    },
    searchContainer: {
        padding: 16,
        backgroundColor: "#f8f9fa",
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
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        fontWeight: "600",
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#e3f2fd",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    cardInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: "800",
        color: "#333",
    },
    mobileNumber: {
        fontSize: 13,
        color: "#666",
        fontWeight: "600",
        marginTop: 2,
    },
    customerActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionBtnIcon: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: "800",
    },
    billMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        gap: 6,
    },
    billMetaText: {
        fontSize: 12,
        color: "#888",
        fontWeight: "600",
    },
    billRight: {
        alignItems: "flex-end",
    },
    grandTotalText: {
        fontSize: 16,
        fontWeight: "900",
        color: "#0c831f",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "800",
    },
    bgStatusDone: {
        backgroundColor: "#e8f5e9",
    },
    bgStatusPending: {
        backgroundColor: "#ffebee",
    },
    textStatusDone: {
        color: "#0c831f",
    },
    textStatusPending: {
        color: "#d32f2f",
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
        paddingVertical: 24,
        paddingHorizontal: 0,
        maxHeight: "90%",
    },
    modalContentLarge: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingVertical: 24,
        paddingHorizontal: 0,
        height: "92%",
    },
    formContainer: {
        gap: 16,
        paddingHorizontal: 16,
    },
    formPaddingContainer: {
        gap: 8,
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
    saveButton: {
        height: 56,
        backgroundColor: "#0c831f",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
        marginBottom: 30,
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
        fontSize: 15,
        color: "#999",
        fontWeight: "600",
    },
    formSectionLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#888",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 16,
    },

    // ── Builder Modal Styled to Screenshot ──
    builderOverlayContainer: {
        flex: 1,
        backgroundColor: "#f5f6f8",
    },
    builderHeaderBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    builderScroll: {
        paddingBottom: 80,
    },
    profileCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 16,
        marginHorizontal: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        alignItems: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        marginBottom: 16,
        marginTop: 10,
    },
    avatarCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#0c831f",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    avatarLetter: {
        fontSize: 22,
        fontWeight: "800",
        color: "#fff",
    },
    profileMeta: {
        flex: 1,
        gap: 3,
    },
    profileName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#000",
    },
    metaIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    profileSubText: {
        fontSize: 12,
        color: "#666",
        fontWeight: "600",
    },
    profileButtons: {
        flexDirection: "row",
        gap: 10,
    },
    roundCallBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: "#e3f2fd",
        justifyContent: "center",
        alignItems: "center",
    },
    roundWhatsappBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: "#e8f5e9",
        justifyContent: "center",
        alignItems: "center",
    },
    mainBillingContainer: {
        backgroundColor: "#fff",
        paddingVertical: 16,
        marginHorizontal: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        marginBottom: 16,
    },
    sectionTitleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    titleWithIcon: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionHeadline: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0c831f",
    },
    roundPlusBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#0c831f",
        justifyContent: "center",
        alignItems: "center",
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "rgba(12, 131, 31, 0.05)",
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: "center",
    },
    headerCell: {
        fontSize: 11,
        fontWeight: "800",
        color: "#0c831f",
    },
    tableDataRow: {
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    rowCellIndex: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
    },
    dropdownInputTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 8,
        height: 40,
        backgroundColor: "#fff",
        marginRight: 6,
    },
    dropdownInputText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#333",
        flex: 1,
    },
    rowCellInput: {
        height: 40,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 8,
        fontSize: 13,
        fontWeight: "700",
        color: "#333",
        backgroundColor: "#fff",
        textAlign: "center",
        marginRight: 6,
    },
    rowCellAmount: {
        fontSize: 14,
        fontWeight: "800",
        color: "#0c831f",
        textAlign: "right",
        paddingRight: 4,
    },
    rowCellRemove: {
        padding: 4,
        marginLeft: 4,
    },
    rowDropdownMenu: {
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: "#ffd54f",
        borderRadius: 8,
        padding: 6,
        marginHorizontal: 16,
        marginBottom: 8,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    dropdownSearchField: {
        height: 38,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 6,
        paddingHorizontal: 10,
        fontSize: 13,
        marginBottom: 6,
        backgroundColor: "#fafafa",
    },
    dropdownMenuItemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f5f5f5",
    },
    menuItemRowName: {
        fontSize: 13,
        fontWeight: "700",
        color: "#333",
    },
    menuItemRowMeta: {
        fontSize: 11,
        fontWeight: "700",
        color: "#0c831f",
    },
    dropdownCloseBtn: {
        alignItems: "center",
        paddingVertical: 6,
        backgroundColor: "#ffb703",
        borderRadius: 6,
        marginTop: 6,
    },
    dropdownCloseBtnText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#000",
    },
    dropdownItemTextEmpty: {
        textAlign: "center",
        paddingVertical: 12,
        color: "#999",
        fontWeight: "600",
        fontSize: 12,
    },
    helperLabel: {
        textAlign: "center",
        fontSize: 10,
        color: "#bbb",
        fontWeight: "700",
        marginVertical: 10,
    },
    grandTotalBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#e8f5e9",
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    grandTotalLabel: {
        fontSize: 16,
        fontWeight: "800",
        color: "#1b5e20",
    },
    grandTotalAmount: {
        fontSize: 22,
        fontWeight: "900",
        color: "#1b5e20",
    },
    paymentStatusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    paymentStatusLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: "#444",
    },
    statusButtonsContainer: {
        flexDirection: "row",
        gap: 10,
    },
    statusOptionBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    optionInactive: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
    },
    optionPendingActive: {
        backgroundColor: "#fff3e0",
        borderWidth: 1.5,
        borderColor: "#ff9800",
    },
    optionDoneActive: {
        backgroundColor: "#0c831f",
        borderWidth: 1.5,
        borderColor: "#0c831f",
    },
    statusOptionText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#666",
    },
    textPendingActive: {
        color: "#e65100",
    },
    textDoneActive: {
        color: "#fff",
    },
    notesTextInput: {
        height: 52,
        borderWidth: 1,
        borderColor: "#f0f0f0",
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: "600",
        backgroundColor: "#f9f9f9",
        marginHorizontal: 16,
        marginBottom: 20,
        color: "#333",
    },
    bigGreenSubmitBtn: {
        height: 56,
        backgroundColor: "#0c831f",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 20,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    submitBtnInner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "900",
    },
    accordionSection: {
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#e0e0e0",
        marginTop: 10,
    },
    accordionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    accordionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    accordionTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#000",
    },
    accordionBadge: {
        backgroundColor: "#e8f5e9",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    accordionBadgeText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#0c831f",
    },
    accordionContentList: {
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    emptyHistoryText: {
        fontSize: 13,
        color: "#999",
        textAlign: "center",
        paddingVertical: 16,
        fontWeight: "600",
    },
    historyBillRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f5f5f5",
    },
    historyBillDate: {
        fontSize: 14,
        fontWeight: "700",
        color: "#333",
    },
    historyBillItems: {
        fontSize: 12,
        color: "#777",
        fontWeight: "600",
        marginTop: 2,
    },
    historyBillTotal: {
        fontSize: 15,
        fontWeight: "800",
        color: "#0c831f",
    },
    historyBillStatusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },

    // ── Details Modal Layout ──
    detailsHeaderBlock: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fafafa",
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#eee",
        padding: 20,
        marginBottom: 20,
    },
    detailsLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: "#888",
    },
    detailsGrandTotal: {
        fontSize: 28,
        fontWeight: "900",
        color: "#0c831f",
        marginTop: 4,
    },
    detailsStatusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    detailsItemsBlock: {
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#eee",
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 24,
    },
    detailsItemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f5f5f5",
    },
    detailsItemName: {
        fontSize: 15,
        fontWeight: "800",
        color: "#333",
    },
    detailsItemMeta: {
        fontSize: 13,
        color: "#666",
        fontWeight: "600",
        marginTop: 2,
    },
    detailsItemAmount: {
        fontSize: 15,
        fontWeight: "800",
        color: "#000",
    },
    detailsActionsBlock: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 40,
        paddingHorizontal: 16,
    },
    detailsEditBtn: {
        flex: 1,
        flexDirection: "row",
        height: 52,
        backgroundColor: "#ffb703",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    detailsDeleteBtn: {
        flex: 1,
        flexDirection: "row",
        height: 52,
        backgroundColor: "#d32f2f",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    detailsActionText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "800",
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
    },
    toastText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "900",
        color: "#000",
    },
    modalSubtitle: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
        marginTop: 4,
    },
});

import { BASE_URL } from "../constants/Config";
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
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import LogoutModal from "../components/LogoutModal";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

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
    category?: string;
    itemImage?: string;
}



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

    // Filter States
    const [activeFilter, setActiveFilter] = useState<"all" | "today" | "custom">("all");
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<"from" | "to">("from");
    // Customer Modal Form States
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerMobile, setNewCustomerMobile] = useState("");

    // Bill Builder Screen Overlay States
    const [billModalVisible, setBillModalVisible] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<BillingCustomer | null>(null);
    const [editingBillId, setEditingBillId] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<"pending" | "done">("done");
    const [notes, setNotes] = useState("");
    
    // Shopping Cart UI States
    const [cart, setCart] = useState<{ [itemName: string]: { qty: number; unit: string; price: number; } }>({});
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [billSummaryVisible, setBillSummaryVisible] = useState(false);

    const categories = ["All", ...Array.from(new Set(menuItems.map(item => item.category || "Other"))).filter(Boolean)];
    const cartItemCount = Object.keys(cart).length;
    const cartTotal = Object.values(cart).reduce((acc, curr) => acc + curr.qty * curr.price, 0);

    const handleUpdateCart = (item: MenuItem, qty: number) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (qty <= 0) {
                delete newCart[item.itemName];
            } else {
                newCart[item.itemName] = { qty, unit: item.unit, price: item.rate };
            }
            return newCart;
        });
    };

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
        setCart({});
        setNotes("");
        setPaymentStatus("done");
        setBillSummaryVisible(false);
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
        setPaymentStatus("done");
        setNotes("");
        setHistoryExpanded(false);
        setCart({});
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
        
        const initialCart: { [key: string]: { qty: number; unit: string; price: number; } } = {};
        if (bill.items) {
            bill.items.forEach(item => {
                initialCart[item.itemName] = { qty: item.qty, unit: item.unit, price: item.price };
            });
        }
        setCart(initialCart);

        fetchCustomerBillsHistory(custObj._id);
        setBillModalVisible(true);
    };

    const handleSaveBill = async () => {
        const validItems = Object.entries(cart).map(([itemName, details]) => ({
            itemName,
            qty: details.qty,
            unit: details.unit,
            price: details.price,
            amount: details.qty * details.price
        }));

        if (validItems.length === 0) {
            Alert.alert("ValidationError", "Please add at least one item to the cart.");
            return;
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
                setBillSummaryVisible(false);
                setEditingBillId(null);
                setCart({});
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

    const getCustomerDisplayName = (cust: any, custNameFallback?: string) => {
        if (typeof cust === 'object' && cust !== null) {
            return cust.customerName || custNameFallback;
        }
        
        // Find in customers array
        const found = customers.find(c => c._id === cust || c.customerId === cust || c.mobileNumber === cust);
        if (found && found.customerName) {
            return found.customerName;
        }

        return custNameFallback || cust || "Billing Customer";
    };

    const getCustomerInitial = (name: string) => {
        return name ? name.charAt(0).toUpperCase() : "?";
    };

    const filteredCustomers = customers.filter(c =>
        (c.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mobileNumber || "").includes(searchQuery)
    );

    const filteredBills = bills.filter(b => {
        const name = getCustomerDisplayName(b.customerId, b.customerName);
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter === "today") {
            if (!b.createdAt) return false;
            const bDate = new Date(b.createdAt);
            const today = new Date();
            return bDate.getDate() === today.getDate() && bDate.getMonth() === today.getMonth() && bDate.getFullYear() === today.getFullYear();
        } else if (activeFilter === "custom" && fromDate && toDate) {
            if (!b.createdAt) return false;
            const bDate = new Date(b.createdAt);
            // reset time to 00:00:00 for accurate comparison
            const bTime = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate()).getTime();
            const fTime = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime();
            const tTime = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime();
            return bTime >= fTime && bTime <= tTime;
        }
        
        return true;
    });

    const renderCustomerItem = ({ item }: { item: BillingCustomer }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#ff6600" />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                    <Text style={styles.mobileNumber}>{item.mobileNumber}</Text>
                </View>
                <View style={styles.customerActions}>
                    <TouchableOpacity 
                        style={[styles.actionBtnIcon, { backgroundColor: "#fff0e6" }]} 
                        onPress={() => openBillBuilderForCreate(item)}
                    >
                        <Ionicons name="receipt-outline" size={18} color="#ff6600" />
                        <Text style={[styles.actionBtnText, { color: "#ff6600" }]}>Bill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtnIcon, { backgroundColor: "#e6f0ff" }]} 
                        onPress={() => handleViewCustomerBills(item)}
                    >
                        <Ionicons name="eye-outline" size={18} color="#0059ff" />
                        <Text style={[styles.actionBtnText, { color: "#0059ff" }]}>History</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderBillItem = ({ item }: { item: Bill }) => {
        const custName = getCustomerDisplayName(item.customerId, item.customerName);
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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
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

            {/* Bills Filter Bar */}
            {activeTab === "bills" && (
                <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 }}>
                    <TouchableOpacity 
                        style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" }, activeFilter === "today" && { backgroundColor: "#fff0e6", borderColor: "#ff6600" }]}
                        onPress={() => setActiveFilter(activeFilter === "today" ? "all" : "today")}
                    >
                        <Text style={[{ fontSize: 14, color: "#666", fontWeight: "600" }, activeFilter === "today" && { color: "#ff6600" }]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", flexDirection: "row", alignItems: "center", gap: 6 }, activeFilter === "custom" && { backgroundColor: "#fff0e6", borderColor: "#ff6600" }]}
                        onPress={() => {
                            if (activeFilter === "custom") {
                                setActiveFilter("all");
                                setFromDate(null);
                                setToDate(null);
                            } else {
                                setDatePickerMode("from");
                                setShowDatePicker(true);
                            }
                        }}
                    >
                        <Ionicons name="calendar" size={16} color={activeFilter === "custom" ? "#ff6600" : "#666"} />
                        <Text style={[{ fontSize: 14, color: "#666", fontWeight: "600" }, activeFilter === "custom" && { color: "#ff6600" }]}>
                            {activeFilter === "custom" && fromDate && toDate 
                                ? `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}` 
                                : "Date Range"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

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

            {/* ── Shopping Cart / Bill Builder Modal ── */}
            <Modal
                animationType="slide"
                presentationStyle="pageSheet"
                visible={billModalVisible}
                onRequestClose={resetBuilderItemForm}
            >
                <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
                    <StatusBar barStyle="light-content" backgroundColor="#ff6600" translucent={false} />

                    {/* Header bar of modal */}
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#ff6600", paddingTop: Platform.OS === 'android' ? 10 : 20, paddingBottom: 16, paddingHorizontal: 16 }}>
                        <TouchableOpacity onPress={resetBuilderItemForm} style={{ padding: 8, marginRight: 8 }}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>
                                {selectedCustomer?.customerName}
                            </Text>
                            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "600" }}>
                                +91 {selectedCustomer?.mobileNumber}
                            </Text>
                        </View>
                    </View>

                    {/* Main Split Content */}
                    <View style={{ flex: 1, flexDirection: "row" }}>
                        {/* Sidebar Categories */}
                        <View style={{ width: 85, backgroundColor: "#fff", borderRightWidth: 1, borderColor: "#eee" }}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            { paddingVertical: 16, alignItems: "center", borderBottomWidth: 1, borderColor: "#f0f0f0" },
                                            selectedCategory === cat && { backgroundColor: "#fff0e6", borderRightWidth: 3, borderColor: "#ff6600" }
                                        ]}
                                        onPress={() => setSelectedCategory(cat)}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: selectedCategory === cat ? "800" : "600", color: selectedCategory === cat ? "#ff6600" : "#666", textAlign: "center" }}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Items Grid */}
                        <View style={{ flex: 1, padding: 8 }}>
                            <FlatList
                                data={menuItems.filter(item => selectedCategory === "All" || item.category === selectedCategory)}
                                keyExtractor={(item, index) => item._id || String(index)}
                                numColumns={2}
                                columnWrapperStyle={{ justifyContent: 'space-between' }}
                                renderItem={({ item }) => {
                                    const qty = cart[item.itemName]?.qty || 0;
                                    return (
                                        <View style={{ width: '48%', backgroundColor: "#fff", borderRadius: 12, padding: 8, marginBottom: 12, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3 }}>
                                            <View style={{ height: 80, backgroundColor: "#f8f9fa", borderRadius: 8, marginBottom: 8, justifyContent: "center", alignItems: "center" }}>
                                                {item.itemImage ? (
                                                    <Image source={{ uri: item.itemImage }} style={{ width: 60, height: 60, borderRadius: 8 }} resizeMode="cover" />
                                                ) : (
                                                    <Ionicons name="image-outline" size={32} color="#ccc" />
                                                )}
                                            </View>
                                            <Text style={{ fontSize: 13, fontWeight: "800", color: "#333", marginBottom: 2 }} numberOfLines={2}>
                                                {item.itemName}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: "#666", marginBottom: 8, fontWeight: "600" }}>
                                                ₹{item.rate} / {item.unit}
                                            </Text>
                                            
                                            {qty > 0 ? (
                                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#ff6600", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                                                    <TouchableOpacity onPress={() => handleUpdateCart(item, qty - 1)} style={{ padding: 4 }}>
                                                        <Ionicons name="remove" size={16} color="#fff" />
                                                    </TouchableOpacity>
                                                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{qty}</Text>
                                                    <TouchableOpacity onPress={() => handleUpdateCart(item, qty + 1)} style={{ padding: 4 }}>
                                                        <Ionicons name="add" size={16} color="#fff" />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <TouchableOpacity 
                                                    style={{ borderWidth: 1, borderColor: "#ff6600", borderRadius: 8, paddingVertical: 6, alignItems: "center", backgroundColor: "#fff0e6" }}
                                                    onPress={() => handleUpdateCart(item, 1)}
                                                >
                                                    <Text style={{ color: "#ff6600", fontWeight: "800", fontSize: 13 }}>ADD</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                }}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />
                        </View>
                    </View>

                    {/* View Cart Bottom Bar */}
                    {cartItemCount > 0 && (
                        <View style={{ position: "absolute", bottom: 20, left: 16, right: 16, backgroundColor: "#0059ff", borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, elevation: 5, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5 }}>
                            <View>
                                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" }}>{cartItemCount} Items</Text>
                                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>₹{cartTotal}</Text>
                            </View>
                            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#0047cc", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }} onPress={() => setBillSummaryVisible(true)}>
                                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800", marginRight: 4 }}>View Cart</Text>
                                <Ionicons name="cart" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

            {/* ── Bill Summary / Checkout Modal ── */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={billSummaryVisible}
                onRequestClose={() => setBillSummaryVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
                    <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <Text style={{ fontSize: 20, fontWeight: "900", color: "#333" }}>Bill Summary</Text>
                            <TouchableOpacity onPress={() => setBillSummaryVisible(false)}>
                                <Ionicons name="close-circle" size={28} color="#ccc" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {Object.entries(cart).map(([itemName, details], idx) => (
                                <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#333" }}>{itemName}</Text>
                                        <Text style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{details.qty} x ₹{details.price}</Text>
                                    </View>
                                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#111" }}>₹{details.qty * details.price}</Text>
                                </View>
                            ))}
                            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 16, marginTop: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: "900", color: "#333" }}>Grand Total</Text>
                                <Text style={{ fontSize: 22, fontWeight: "900", color: "#ff6600" }}>₹{cartTotal}</Text>
                            </View>
                        </ScrollView>



                        {/* Actions */}
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <TouchableOpacity 
                                style={{ flex: 1, backgroundColor: "#fff", paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#ccc" }}
                                onPress={() => setBillSummaryVisible(false)}
                            >
                                <Text style={{ color: "#666", fontSize: 14, fontWeight: "800" }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={{ flex: 1, backgroundColor: "#0059ff", paddingVertical: 14, borderRadius: 12, alignItems: "center", elevation: 2 }}
                                onPress={() => {
                                    handleSaveBill();
                                }}
                            >
                                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800", textAlign: "center" }}>Print</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={{ flex: 1, backgroundColor: "#ff6600", paddingVertical: 14, borderRadius: 12, alignItems: "center", elevation: 2 }}
                                onPress={handleSaveBill}
                            >
                                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "900" }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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

            {showDatePicker && (
                <DateTimePicker
                    value={
                        datePickerMode === "from" 
                            ? (fromDate || new Date()) 
                            : (toDate || new Date())
                    }
                    mode="date"
                    display="default"
                    themeVariant="light"
                    accentColor="#ff6600"
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                        setShowDatePicker(false);
                        if (event.type === "set" && selectedDate) {
                            if (datePickerMode === "from") {
                                setFromDate(selectedDate);
                                setTimeout(() => {
                                    setDatePickerMode("to");
                                    setShowDatePicker(true);
                                }, 500); // Small delay before opening 'to' picker to avoid Android crash
                            } else {
                                setToDate(selectedDate);
                                setActiveFilter("custom");
                            }
                        } else {
                            if (datePickerMode === "from" || datePickerMode === "to") {
                                setFromDate(null);
                                setToDate(null);
                                setActiveFilter("all");
                            }
                        }
                    }}
                />
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
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 10 : 50,
        paddingBottom: 16,
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
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 10,
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
        backgroundColor: "#fff0e6",
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
        backgroundColor: "#ff6600",
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
        backgroundColor: "#0059ff",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    detailsDeleteBtn: {
        flex: 1,
        flexDirection: "row",
        height: 52,
        backgroundColor: "#ff6600",
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

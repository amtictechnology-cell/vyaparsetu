import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
const BASE_URL = "http://192.168.31.192:6000/api/v1";

// ── Single booking entry type ─────────────────────────────────────────────────
type BookingEntry = {
    _id: string;
    bookingId: string;
    customerName: string;
    roomNumber: string;
    numberOfMembers: number;
    members: { name: string; idNumber: string }[];
    bookedAt: string;
    customerId?: string;
    status?: string;
    checkedOutAt?: string;
};

export default function CustomerProfile() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const customer = params.customerData ? JSON.parse(params.customerData as string) : {
        name: "Unknown Customer",
        mobile: "N/A",
        idNumber: "N/A",
        address: "N/A",
        frontPhoto: null,
        backPhoto: null
    };
    const roomNumber = params.roomNumber || "N/A";

    // Profile dropdown
    const [isExpanded, setIsExpanded] = useState(false);
    const animationController = useRef(new Animated.Value(0)).current;

    // Bookings state
    const [allBookings, setAllBookings] = useState<BookingEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/get-all-bookings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.status === "success") {
                // Filter bookings for this specific customer
                const filtered = data.data.filter((b: any) => b.customerId === customer.id);
                setAllBookings(filtered);
            }
        } catch (error) {
            console.error("Fetch bookings error:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [customer.id])
    );

    // Single booking confirm modal
    const [showSingleModal, setShowSingleModal] = useState(false);

    // Members detail modal — which booking index is expanded
    const [memberDetailIdx, setMemberDetailIdx] = useState<number | null>(null);

    // Booking delete confirmation
    const [showBookingDeleteConfirm, setShowBookingDeleteConfirm] = useState(false);
    const [bookingIdToDelete, setBookingIdToDelete] = useState<string | null>(null);

    // Checkout confirmation
    const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
    const [bookingIdToCheckout, setBookingIdToCheckout] = useState<string | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 1500);
    };

    const toggleDropdown = () => {
        const config = { toValue: isExpanded ? 0 : 1, duration: 300, useNativeDriver: false };
        Animated.timing(animationController, config).start();
        setIsExpanded(!isExpanded);
    };

    const dropdownHeight = animationController.interpolate({ inputRange: [0, 1], outputRange: [0, 150] });
    const rotateAnimation = animationController.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

    const handleDeleteBooking = async () => {
        if (!bookingIdToDelete) return;
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/delete-booking`, {
                method: "DELETE",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ bookingId: bookingIdToDelete })
            });

            const data = await response.json();
            if (data.status === "success") {
                showToast("Booking deleted");
                setShowBookingDeleteConfirm(false);
                fetchBookings();
            } else {
                showToast(data.message || "Delete failed");
            }
        } catch (error) {
            showToast("Failed to delete booking");
        }
    };

    const handleCheckoutBooking = async () => {
        if (!bookingIdToCheckout) return;
        setCheckoutLoading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/checkout-booking`, {
                method: "PATCH",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ bookingId: bookingIdToCheckout })
            });

            const data = await response.json();
            if (data.status === "success" || response.ok) {
                showToast("Checked out successfully");
                setShowCheckoutConfirm(false);
                fetchBookings();
            } else {
                showToast(data.message || "Checkout failed");
            }
        } catch (error) {
            showToast("Failed to checkout booking");
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleConfirmSingleBooking = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/add-booking`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    customerId: customer.id,
                    roomNumber: String(roomNumber),
                    numberOfMembers: 1,
                    bookedAt: new Date().toLocaleString("en-IN"),
                    // For single person, members array not needed per instructions
                })
            });

            const data = await response.json();
            if (data.status === "success") {
                showToast("Room booked successfully");
                setShowSingleModal(false);
                fetchBookings();
            } else {
                showToast(data.message || "Booking failed");
            }
        } catch (error) {
            showToast("Network request failed");
        }
    };

    // Combined entries (already filtered in fetchBookings)
    const allEntries = allBookings.sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />

            {/* ── Single Booking Confirm Modal ───────────────── */}
            <Modal visible={showSingleModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalIconBox}>
                            <Ionicons name="bed" size={36} color="#0c831f" />
                        </View>
                        <Text style={styles.modalTitle}>Confirm Booking?</Text>
                        <Text style={styles.modalSub}>
                            Room <Text style={{ fontWeight: "900", color: "#023e8a" }}>{roomNumber}</Text> will be
                            booked for{"\n"}
                            <Text style={{ fontWeight: "900", color: "#1a1a2e" }}>{customer.name}</Text>
                        </Text>
                        <Text style={styles.modalDateTime}>
                            📅 {new Date().toLocaleString("en-IN")}
                        </Text>
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowSingleModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleConfirmSingleBooking}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                <Text style={styles.modalConfirmText}>Confirm & Book</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Members Detail Modal ───────────────────────── */}
            <Modal
                visible={memberDetailIdx !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setMemberDetailIdx(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { width: "92%" }]}>
                        <View style={styles.modalDetailHeader}>
                            <Text style={styles.modalDetailTitle}>
                                👥 Member Details
                            </Text>
                            <TouchableOpacity onPress={() => setMemberDetailIdx(null)}>
                                <Ionicons name="close-circle" size={28} color="#ccc" />
                            </TouchableOpacity>
                        </View>
                        {memberDetailIdx !== null &&
                            allEntries[memberDetailIdx]?.members?.map((m: any, mi: number) => (
                                <View key={mi} style={styles.detailMemberRow}>
                                    <View style={styles.detailMemberDot}>
                                        <Text style={styles.detailMemberDotText}>{mi + 1}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.detailMemberName}>{m.name}</Text>
                                        <Text style={styles.detailMemberId}>ID: {m.idNumber}</Text>
                                    </View>
                                </View>
                            ))}
                    </View>
                </View>
            </Modal>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Customer Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {/* Avatar + Name row */}
                    <View style={styles.profileTopRow}>
                        <View style={styles.avatarSection}>
                            <View style={styles.avatarWrapper}>
                                {customer.frontPhoto ? (
                                    <Image source={{ uri: customer.frontPhoto }} style={styles.avatarImg} />
                                ) : (
                                    <Ionicons name="person" size={36} color="#666" />
                                )}
                            </View>
                            <View style={styles.roomBadge}>
                                <Text style={styles.roomBadgeText}>Room {roomNumber}</Text>
                            </View>
                        </View>

                        <View style={styles.profileNameBlock}>
                            <Text style={styles.customerName}>{customer.name}</Text>
                            <View style={styles.mobileRow}>
                                <Ionicons name="call" size={14} color="#0c831f" />
                                <Text style={styles.mobileTxt}>{customer.mobile}</Text>
                            </View>
                            <View style={styles.idRow}>
                                <Ionicons name="card" size={14} color="#ffb703" />
                                <Text style={styles.idTxt}>{customer.idNumber}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Dropdown Button */}
                    <TouchableOpacity style={styles.dropdownBtn} onPress={toggleDropdown}>
                        <Text style={styles.dropdownBtnText}>
                            {isExpanded ? "Show Less" : "View Full Details"}
                        </Text>
                        <Animated.View style={{ transform: [{ rotate: rotateAnimation }] }}>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </Animated.View>
                    </TouchableOpacity>

                    <Animated.View style={[styles.detailsSection, { height: dropdownHeight, opacity: animationController }]}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Full Address</Text>
                            <Text style={styles.detailValue}>{customer.address}</Text>
                        </View>
                        <View style={styles.idPhotosRow}>
                            {customer.frontPhoto && (
                                <View style={styles.idPhotoContainer}>
                                    <Text style={styles.idPhotoLabel}>Front ID</Text>
                                    <Image source={{ uri: customer.frontPhoto }} style={styles.idPhotoImg} />
                                </View>
                            )}
                            {customer.backPhoto && (
                                <View style={styles.idPhotoContainer}>
                                    <Text style={styles.idPhotoLabel}>Back ID</Text>
                                    <Image source={{ uri: customer.backPhoto }} style={styles.idPhotoImg} />
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </View>

                {/* Actions */}
                <View style={styles.actionSection}>
                    {/* Add Members & Room Allot */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push({ pathname: "/membars", params: { customerId: customer.id, customerName: customer.name, roomNumber: String(roomNumber) } })}
                        activeOpacity={0.85}
                    >
                        <View style={styles.cardRow}>
                            <View style={[styles.cardIconBox, { backgroundColor: "#dbeafe" }]}>
                                <Ionicons name="people" size={22} color="#023e8a" />
                            </View>
                            <Text style={styles.cardTitle}>Add Members & Room Allot</Text>
                        </View>
                        <Text style={styles.cardSub}>Add family / friends & allot a room for them</Text>
                    </TouchableOpacity>

                    {/* Single Booking */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => setShowSingleModal(true)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.cardRow}>
                            <View style={[styles.cardIconBox, { backgroundColor: "#dcfce7" }]}>
                                <Ionicons name="person" size={22} color="#0c831f" />
                            </View>
                            <Text style={styles.cardTitle}>Single Booking</Text>
                        </View>
                        <Text style={styles.cardSub}>Book a room for this customer only</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Booking Entries ── */}
                {allEntries.length > 0 && (
                    <View style={styles.bookingSection}>
                        <Text style={styles.bookingSectionTitle}>🏨 Room Booking Entries</Text>

                        {allEntries.map((b, idx) => {
                            const isMember = b.numberOfMembers > 1;
                            const totalPersons = b.numberOfMembers;

                            return (
                                <TouchableOpacity
                                    key={b._id}
                                    style={styles.bookingCard}
                                    onLongPress={() => {
                                        setBookingIdToDelete(b.bookingId || b._id);
                                        setShowBookingDeleteConfirm(true);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    {/* Card Header */}
                                    <View style={styles.bookingCardHeader}>
                                        <View style={styles.bookingBadge}>
                                            <Ionicons name="bed" size={16} color="#fff" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.bookingCardTitle}>Room {b.roomNumber}</Text>
                                            <View style={styles.metaRow}>
                                                <Ionicons name="calendar-outline" size={12} color="#888" />
                                                <Text style={styles.bookingCardMeta}>{b.bookedAt}</Text>
                                            </View>
                                            {(b.status === "checked-out" || b.checkedOutAt) && (
                                                <View style={[styles.metaRow, { marginTop: 2 }]}>
                                                    <Ionicons name="time-outline" size={12} color="#4caf50" />
                                                    <Text style={[styles.bookingCardMeta, { color: "#4caf50" }]}>
                                                        Checked Out: {b.checkedOutAt}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {/* Type badge */}
                                        <View style={[
                                            styles.typeBadge,
                                            { backgroundColor: isMember ? "#dbeafe" : "#dcfce7", marginRight: 8 },
                                        ]}>
                                            <Text style={[
                                                styles.typeBadgeText,
                                                { color: isMember ? "#023e8a" : "#0c831f" },
                                            ]}>
                                                {isMember ? "Group" : "Single"}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setBookingIdToDelete(b.bookingId || b._id);
                                                setShowBookingDeleteConfirm(true);
                                            }}
                                            style={styles.deleteIconBtn}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#d32f2f" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Footer Section with Persons Pill and Checkout */}
                                    <View style={styles.bookingCardFooter}>
                                        {/* Total Persons — highlighted pill, tappable if members exist */}
                                        <TouchableOpacity
                                            style={styles.personsPill}
                                            onPress={() => isMember && totalPersons > 0
                                                ? setMemberDetailIdx(idx)
                                                : null}
                                            activeOpacity={isMember ? 0.7 : 1}
                                        >
                                            <Ionicons name="people" size={16} color="#023e8a" />
                                            <Text style={styles.personsPillText}>
                                                Total Persons:{" "}
                                                <Text style={styles.personsPillCount}>{totalPersons}</Text>
                                            </Text>
                                            {isMember && (
                                                <Ionicons name="chevron-forward" size={14} color="#023e8a" />
                                            )}
                                        </TouchableOpacity>

                                        {b.status === "checked-out" || b.checkedOutAt ? (
                                            <View style={styles.checkoutBadge}>
                                                <Ionicons name="checkmark-done-circle" size={16} color="#4caf50" />
                                                <Text style={styles.checkoutBadgeText}>Checked Out</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.checkoutButton}
                                                onPress={() => {
                                                    setBookingIdToCheckout(b.bookingId || b._id);
                                                    setShowCheckoutConfirm(true);
                                                }}
                                            >
                                                <Ionicons name="log-out-outline" size={16} color="#fff" />
                                                <Text style={styles.checkoutButtonText}>Checkout</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
                {/* Delete Confirmation Modal */}
                <Modal
                    transparent
                    visible={showBookingDeleteConfirm}
                    animationType="fade"
                    onRequestClose={() => setShowBookingDeleteConfirm(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalBox}>
                            <Ionicons name="alert-circle" size={48} color="#d32f2f" style={{ alignSelf: 'center', marginBottom: 12 }} />
                            <Text style={styles.modalTitle}>Delete Booking?</Text>
                            <Text style={styles.modalSub}>Are you sure you want to remove this booking entry?</Text>
                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowBookingDeleteConfirm(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalConfirmBtn, { backgroundColor: '#d32f2f' }]}
                                    onPress={handleDeleteBooking}
                                >
                                    <Text style={styles.modalConfirmText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Checkout Confirmation Modal */}
                <Modal
                    transparent
                    visible={showCheckoutConfirm}
                    animationType="fade"
                    onRequestClose={() => setShowCheckoutConfirm(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalBox}>
                            <Ionicons name="log-out" size={48} color="#d32f2f" style={{ alignSelf: 'center', marginBottom: 12 }} />
                            <Text style={styles.modalTitle}>Confirm Checkout?</Text>
                            <Text style={styles.modalSub}>Are you sure you want to checkout this room booking?</Text>
                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowCheckoutConfirm(false)}
                                    disabled={checkoutLoading}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalConfirmBtn, { backgroundColor: '#d32f2f' }]}
                                    onPress={handleCheckoutBooking}
                                    disabled={checkoutLoading}
                                >
                                    {checkoutLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                            <Text style={styles.modalConfirmText}>Yes, Checkout</Text>
                                        </>
                                    )}
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
            </ScrollView>
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
        paddingTop: Platform.OS === "android" ? 40 : 10,
        paddingBottom: 20,
        backgroundColor: "#ffb703",
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: "900", color: "#000" },
    scrollContent: { paddingBottom: 16 },

    // Profile Card
    profileCard: {
        backgroundColor: "#fff",
        borderRadius: 0,
        padding: 16,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    profileTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginBottom: 14,
    },
    avatarSection: { alignItems: "center" },
    avatarWrapper: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        borderWidth: 2.5,
        borderColor: "#ffb703",
    },
    avatarImg: { width: "100%", height: "100%" },
    roomBadge: {
        marginTop: 5,
        backgroundColor: "#0c831f",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    roomBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
    profileNameBlock: { flex: 1 },
    customerName: { fontSize: 19, fontWeight: "900", color: "#1a1a2e", marginBottom: 6 },
    mobileRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    mobileTxt: { fontSize: 13, fontWeight: "700", color: "#555" },
    idRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    idTxt: { fontSize: 13, fontWeight: "700", color: "#555" },
    dropdownBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
    },
    dropdownBtnText: { fontSize: 13, fontWeight: "800", color: "#666", flex: 1 },
    detailsSection: { width: "100%", overflow: "hidden" },
    idPhotosRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    idPhotoContainer: { flex: 1 },
    idPhotoLabel: { fontSize: 10, fontWeight: '700', color: '#888', marginBottom: 4 },
    idPhotoImg: { width: '100%', height: 80, borderRadius: 8, backgroundColor: '#f5f5f5' },
    detailItem: {
        marginBottom: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f9f9f9",
    },
    detailLabel: { fontSize: 12, fontWeight: "700", color: "#999", marginBottom: 4 },
    detailValue: { fontSize: 14, fontWeight: "600", color: "#333" },

    // Action cards
    actionSection: { marginTop: 20, flexDirection: "row", gap: 12 },
    actionCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    cardRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
    cardIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    cardTitle: { flex: 1, fontSize: 13, fontWeight: "900", color: "#1a1a2e", lineHeight: 18 },
    cardSub: { fontSize: 11, fontWeight: "500", color: "#888", lineHeight: 16 },

    // Booking entries
    bookingSection: { marginTop: 24 },
    bookingSectionTitle: { fontSize: 18, fontWeight: "900", color: "#1a1a2e", marginBottom: 12, paddingHorizontal: 16 },
    bookingCard: {
        backgroundColor: "#fff",
        borderRadius: 0,
        padding: 16,
        marginBottom: 2,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    bookingCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    bookingBadge: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: "#023e8a",
        justifyContent: "center", alignItems: "center",
    },
    bookingCardTitle: { fontSize: 15, fontWeight: "900", color: "#222" },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    bookingCardMeta: { fontSize: 12, color: "#666", fontWeight: "600" },
    typeBadge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20,
    },
    typeBadgeText: { fontSize: 11, fontWeight: "900" },

    // Total persons pill
    personsPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#eef4ff",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignSelf: "flex-start",
    },
    personsPillText: { fontSize: 13, fontWeight: "700", color: "#023e8a" },
    personsPillCount: { fontSize: 15, fontWeight: "900", color: "#023e8a" },
    bookingCardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    checkoutButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#d32f2f",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    checkoutButtonText: {
        fontSize: 13,
        fontWeight: "900",
        color: "#fff",
    },
    checkoutBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#e8f5e9",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    checkoutBadgeText: {
        fontSize: 13,
        fontWeight: "900",
        color: "#4caf50",
    },

    // ── Modals ───────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    modalBox: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 0,
        padding: 20,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    modalIconBox: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: "#dcfce7",
        justifyContent: "center", alignItems: "center",
        alignSelf: "center", marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20, fontWeight: "900", color: "#1a1a2e",
        textAlign: "center", marginBottom: 10,
    },
    modalSub: {
        fontSize: 14, color: "#555", textAlign: "center",
        lineHeight: 22, marginBottom: 10,
    },
    modalDateTime: {
        fontSize: 13, fontWeight: "700", color: "#888",
        textAlign: "center", marginBottom: 24,
    },
    modalBtnRow: { flexDirection: "row", gap: 12 },
    modalCancelBtn: {
        flex: 1, height: 50, borderRadius: 14,
        borderWidth: 1.5, borderColor: "#ddd",
        justifyContent: "center", alignItems: "center",
        backgroundColor: "#fafafa",
    },
    modalCancelText: { fontSize: 15, fontWeight: "800", color: "#777" },
    modalConfirmBtn: {
        flex: 2, height: 50, borderRadius: 14,
        backgroundColor: "#0c831f",
        flexDirection: "row",
        justifyContent: "center", alignItems: "center", gap: 8,
        elevation: 4,
    },
    modalConfirmText: { fontSize: 15, fontWeight: "900", color: "#fff" },

    // Members detail modal
    modalDetailHeader: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 18,
    },
    modalDetailTitle: { fontSize: 18, fontWeight: "900", color: "#1a1a2e" },
    detailMemberRow: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: "#f0f0f0",
    },
    detailMemberDot: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: "#ffb703",
        justifyContent: "center", alignItems: "center",
    },
    detailMemberDotText: { fontSize: 14, fontWeight: "900", color: "#000" },
    detailMemberName: { fontSize: 14, fontWeight: "800", color: "#333" },
    detailMemberId: { fontSize: 12, color: "#888", marginTop: 2 },
    deleteIconBtn: {
        padding: 6,
        backgroundColor: '#fff1f1',
        borderRadius: 8,
    },
    toast: {
        position: 'absolute',
        bottom: 50,
        left: 40,
        right: 40,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 10,
        zIndex: 999
    },
    toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

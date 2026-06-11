import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────
type MemberInput = { name: string; id: string };
type BookingEntry = {
    _id: string;
    bookingId: string;
    customerName: string;
    roomNumber: string;
    numberOfMembers: number;
    members: { name: string; idNumber: string }[];
    bookedAt: string;
};

const BASE_URL = "http://192.168.31.192:6000/api/v1";

// In-memory store (replace with AsyncStorage / API as needed)
export let roomBookings: BookingEntry[] = [];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AddMembers() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Customer info passed from customerprofile
    const customerName = (params.customerName as string) ?? "Customer";
    const roomNumber = (params.roomNumber as string) ?? "N/A";

    // Step 1 – pick member count
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [memberCount, setMemberCount] = useState<number | null>(null);

    // Step 2 – fill member details
    const [members, setMembers] = useState<MemberInput[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 1500);
    };

    // ── Helpers ────────────────────────────────
    const handleSelectCount = (n: number) => setMemberCount(n);

    const goToStep2 = () => {
        if (!memberCount) return Alert.alert("Please select number of members.");
        setMembers(Array.from({ length: memberCount }, () => ({ name: "", id: "" })));
        setStep(2);
    };

    const updateMember = (index: number, field: keyof MemberInput, value: string) => {
        setMembers(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const goToStep3 = () => {
        const incomplete = members.find(m => !m.name.trim() || !m.id.trim());
        if (incomplete) return Alert.alert("Please fill all member names and IDs.");
        setStep(3);
    };

    const handleBookRoom = async () => {
        const customerId = params.customerId as string;
        if (!customerId) return Alert.alert("Error", "Customer ID missing");

        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/hotel/add-booking`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    customerId,
                    roomNumber: String(roomNumber),
                    numberOfMembers: memberCount ? memberCount + 1 : 1,
                    members: members.map(m => ({ name: m.name, idNumber: m.id })),
                    bookedAt: new Date().toLocaleString("en-IN")
                })
            });

            const data = await response.json();
            if (data.status === "success") {
                showToast("Room booked successfully");
                setTimeout(() => router.back(), 1000);
            } else {
                showToast(data.message || "Booking failed");
            }
        } catch (error) {
            showToast("Network request failed");
        }
    };

    // ── Render: Step 1 ─────────────────────────
    if (step === 1) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Members & Room Allot</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Icon + Title */}
                    <View style={styles.iconCenter}>
                        <View style={styles.bigIconBox}>
                            <Ionicons name="people" size={52} color="#023e8a" />
                        </View>
                        <Text style={styles.stepTitle}>Manage Members</Text>
                        <Text style={styles.stepSub}>Select how many members to add for this booking</Text>
                    </View>

                    {/* Number Picker Grid */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Number of Members</Text>
                        <View style={styles.numberGrid}>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                                <TouchableOpacity
                                    key={n}
                                    style={[
                                        styles.numberBubble,
                                        memberCount === n && styles.numberBubbleActive,
                                    ]}
                                    onPress={() => handleSelectCount(n)}
                                    activeOpacity={0.75}
                                >
                                    <Text
                                        style={[
                                            styles.numberBubbleText,
                                            memberCount === n && styles.numberBubbleTextActive,
                                        ]}
                                    >
                                        {n}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back-circle" size={20} color="#555" />
                            <Text style={styles.backBtnText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.nextBtn, !memberCount && styles.nextBtnDisabled]}
                            onPress={goToStep2}
                            disabled={!memberCount}
                        >
                            <Text style={styles.nextBtnText}>Next</Text>
                            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── Render: Step 2 ─────────────────────────
    if (step === 2) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Member Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={[styles.stepTitle, { marginBottom: 4, textAlign: "left" }]}>
                        Enter details for {memberCount} member{memberCount! > 1 ? "s" : ""}
                    </Text>
                    <Text style={[styles.stepSub, { textAlign: "left", marginBottom: 20 }]}>
                        Fill in the name and ID for each member
                    </Text>

                    {members.map((m, i) => (
                        <View key={i} style={styles.memberCard}>
                            <View style={styles.memberCardHeader}>
                                <View style={styles.memberBadge}>
                                    <Text style={styles.memberBadgeText}>{i + 1}</Text>
                                </View>
                                <Text style={styles.memberCardTitle}>Member {i + 1}</Text>
                            </View>

                            {/* Name Input */}
                            <View style={styles.inputBox}>
                                <Ionicons name="person-outline" size={20} color="#666" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Member Name"
                                    placeholderTextColor="#aaa"
                                    value={m.name}
                                    onChangeText={v => updateMember(i, "name", v)}
                                />
                            </View>

                            {/* ID Input */}
                            <View style={styles.inputBox}>
                                <Ionicons name="card-outline" size={20} color="#666" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ID Number (Aadhar / PAN / etc.)"
                                    placeholderTextColor="#aaa"
                                    value={m.id}
                                    onChangeText={v => updateMember(i, "id", v)}
                                />
                            </View>
                        </View>
                    ))}

                    {/* Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                            <Ionicons name="arrow-back-circle" size={20} color="#555" />
                            <Text style={styles.backBtnText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.nextBtn} onPress={goToStep3}>
                            <Text style={styles.nextBtnText}>Next</Text>
                            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── Render: Step 3 – Review & Book ─────────
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep(2)} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirm & Book</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <Ionicons name="shield-checkmark" size={40} color="#0c831f" style={{ alignSelf: "center", marginBottom: 12 }} />
                    <Text style={styles.summaryTitle}>Booking Summary</Text>

                    <View style={styles.summaryRow}>
                        <Ionicons name="person" size={16} color="#555" />
                        <Text style={styles.summaryLabel}>Customer:</Text>
                        <Text style={styles.summaryValue}>{customerName}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Ionicons name="bed" size={16} color="#555" />
                        <Text style={styles.summaryLabel}>Room:</Text>
                        <Text style={styles.summaryValue}>{roomNumber}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Ionicons name="people" size={16} color="#555" />
                        <Text style={styles.summaryLabel}>Members to Add:</Text>
                        <Text style={styles.summaryValue}>{memberCount}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Ionicons name="people" size={16} color="#0c831f" />
                        <Text style={[styles.summaryLabel, { color: "#0c831f" }]}>Total Persons (inc. Customer):</Text>
                        <Text style={[styles.summaryValue, { color: "#0c831f", fontWeight: "900" }]}>{memberCount ? memberCount + 1 : 1}</Text>
                    </View>
                </View>

                {/* Member List */}
                {members.map((m, i) => (
                    <View key={i} style={styles.reviewMemberCard}>
                        <View style={styles.memberBadge}>
                            <Text style={styles.memberBadgeText}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.reviewMemberName}>{m.name || "—"}</Text>
                            <Text style={styles.reviewMemberId}>ID: {m.id || "—"}</Text>
                        </View>
                    </View>
                ))}

                {/* Confirm Message */}
                <View style={styles.confirmNote}>
                    <Ionicons name="information-circle-outline" size={18} color="#023e8a" />
                    <Text style={styles.confirmNoteText}>
                        Please verify all details before submitting. This will create a room booking entry.
                    </Text>
                </View>

                {/* Buttons */}
                <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                        <Ionicons name="arrow-back-circle" size={20} color="#555" />
                        <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.bookBtn} onPress={handleBookRoom}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.bookBtnText}>Submit & Book Room</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Custom Toast */}
            {toastMessage && (
                <View style={styles.toast}>
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
    headerTitle: { fontSize: 18, fontWeight: "900", color: "#000" },
    scrollContent: { padding: 20, paddingBottom: 40 },

    // Step 1 – icon section
    iconCenter: { alignItems: "center", marginBottom: 28 },
    bigIconBox: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "#e3f2fd",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        elevation: 3,
    },
    stepTitle: { fontSize: 22, fontWeight: "900", color: "#1a1a2e", textAlign: "center" },
    stepSub: { fontSize: 13, color: "#777", textAlign: "center", marginTop: 6, lineHeight: 20 },

    // Number grid
    card: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        marginBottom: 24,
    },
    cardLabel: { fontSize: 15, fontWeight: "800", color: "#333", marginBottom: 16 },
    numberGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "center",
    },
    numberBubble: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "transparent",
    },
    numberBubbleActive: {
        backgroundColor: "#023e8a",
        borderColor: "#0056b3",
        shadowColor: "#023e8a",
        elevation: 6,
    },
    numberBubbleText: { fontSize: 16, fontWeight: "800", color: "#555" },
    numberBubbleTextActive: { color: "#fff" },

    // Member card (step 2)
    memberCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
    },
    memberCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
    memberBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#ffb703",
        justifyContent: "center",
        alignItems: "center",
    },
    memberBadgeText: { fontSize: 15, fontWeight: "900", color: "#000" },
    memberCardTitle: { fontSize: 15, fontWeight: "800", color: "#333" },

    // Input
    inputBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9f9f9",
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 52,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#eee",
    },
    input: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: "600", color: "#222" },

    // Buttons
    btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
    backBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#ccc",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#fff",
    },
    backBtnText: { fontSize: 15, fontWeight: "800", color: "#555" },
    nextBtn: {
        flex: 2,
        height: 52,
        borderRadius: 14,
        backgroundColor: "#023e8a",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        elevation: 4,
    },
    nextBtnDisabled: { backgroundColor: "#aab4c8" },
    nextBtnText: { fontSize: 15, fontWeight: "900", color: "#fff" },

    // Step 3 – Summary
    summaryCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: "#0c831f",
        textAlign: "center",
        marginBottom: 16,
    },
    summaryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    summaryLabel: { fontSize: 14, fontWeight: "700", color: "#555", flex: 1 },
    summaryValue: { fontSize: 15, fontWeight: "800", color: "#222" },

    // Review member list
    reviewMemberCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        gap: 14,
        elevation: 2,
    },
    reviewMemberName: { fontSize: 15, fontWeight: "800", color: "#222" },
    reviewMemberId: { fontSize: 13, color: "#777", marginTop: 2 },

    // Confirm note
    confirmNote: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#e8f0fe",
        borderRadius: 12,
        padding: 14,
        gap: 10,
        marginBottom: 20,
        marginTop: 8,
    },
    confirmNoteText: { flex: 1, fontSize: 13, color: "#023e8a", fontWeight: "600", lineHeight: 18 },

    // Book button
    bookBtn: {
        flex: 2,
        height: 56,
        borderRadius: 16,
        backgroundColor: "#0c831f",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        elevation: 5,
    },
    bookBtnText: { fontSize: 15, fontWeight: "900", color: "#fff" },
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

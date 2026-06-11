import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Transaction {
    id: string;
    type: "lena" | "dena"; // lena = party ne diya, dena = tumne diya
    amount: number;
    note: string;
    date: string;
}

interface KhataUser {
    id: string;
    name: string;
    mobile: string;
    balance: number; // positive = party se lena hai, negative = party ko dena hai
    lastDate: string;
    avatar: string;
    transactions: Transaction[];
}

// ─────────────────────────────────────────────
// Phone Contact Type
// ─────────────────────────────────────────────
interface PhoneContact {
    id: string;
    name: string;
    mobile: string;
}

// ─────────────────────────────────────────────
// Fake KhataBook data
// ─────────────────────────────────────────────
const INITIAL_USERS: KhataUser[] = [
    {
        id: "1",
        name: "Ramesh Patel",
        mobile: "9876501234",
        balance: 1500,
        lastDate: "12 Apr 2026",
        avatar: "RP",
        transactions: [
            { id: "t1", type: "lena", amount: 2000, note: "Grocery saman", date: "10 Apr 2026" },
            { id: "t2", type: "dena", amount: 500, note: "Part payment", date: "12 Apr 2026" },
        ],
    },
    {
        id: "2",
        name: "Sunita Devi",
        mobile: "9812345678",
        balance: -800,
        lastDate: "11 Apr 2026",
        avatar: "SD",
        transactions: [
            { id: "t3", type: "dena", amount: 1500, note: "Dukaan saman", date: "5 Apr 2026" },
            { id: "t4", type: "lena", amount: 700, note: "Wapas kiya", date: "11 Apr 2026" },
        ],
    },
    {
        id: "3",
        name: "Vikram Bhai",
        mobile: "8899001122",
        balance: 3200,
        lastDate: "10 Apr 2026",
        avatar: "VB",
        transactions: [
            { id: "t5", type: "lena", amount: 3200, note: "Petrol+Kirana", date: "8 Apr 2026" },
        ],
    },
    {
        id: "4",
        name: "Anita Kumari",
        mobile: "7766554433",
        balance: -250,
        lastDate: "9 Apr 2026",
        avatar: "AK",
        transactions: [
            { id: "t6", type: "dena", amount: 250, note: "Chai-pani", date: "9 Apr 2026" },
        ],
    },
    {
        id: "5",
        name: "Mohan Das",
        mobile: "9900112233",
        balance: 650,
        lastDate: "8 Apr 2026",
        avatar: "MD",
        transactions: [
            { id: "t7", type: "lena", amount: 650, note: "Dudh", date: "8 Apr 2026" },
        ],
    },
    {
        id: "6",
        name: "Priya Singh",
        mobile: "8123456789",
        balance: 0,
        lastDate: "7 Apr 2026",
        avatar: "PS",
        transactions: [
            { id: "t8", type: "lena", amount: 500, note: "Advance", date: "5 Apr 2026" },
            { id: "t9", type: "dena", amount: 500, note: "Settlement", date: "7 Apr 2026" },
        ],
    },
];

// ─────────────────────────────────────────────
// Avatar Colors
// ─────────────────────────────────────────────
const AVATAR_COLORS = [
    "#c2185b", "#1565c0", "#2e7d32", "#ef6c00",
    "#7b1fa2", "#00838f", "#ad1457", "#4527a0",
];
const getColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────
const initials = (name: string) =>
    name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

const formatDate = () =>
    new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ═══════════════════════════════════════════════
// SCREEN: Party Detail
// ═══════════════════════════════════════════════
function PartyDetail({
    user,
    onBack,
    onUpdate,
}: {
    user: KhataUser;
    onBack: () => void;
    onUpdate: (u: KhataUser) => void;
}) {
    const [txModal, setTxModal] = useState(false);
    const [txType, setTxType] = useState<"lena" | "dena">("lena");
    const [txAmount, setTxAmount] = useState("");
    const [txNote, setTxNote] = useState("");

    const addTransaction = () => {
        const amt = parseFloat(txAmount);
        if (!amt || amt <= 0) { Alert.alert("Error", "Sahi amount dalo!"); return; }

        const tx: Transaction = {
            id: Date.now().toString(),
            type: txType,
            amount: amt,
            note: txNote.trim() || (txType === "lena" ? "Liya" : "Diya"),
            date: formatDate(),
        };

        const newBalance =
            txType === "lena"
                ? user.balance + amt   // party ne diya → udhaar ghata
                : user.balance - amt;  // tumne diya → party ka udhaar badhta

        const updated: KhataUser = {
            ...user,
            balance: newBalance,
            lastDate: formatDate(),
            transactions: [tx, ...user.transactions],
        };
        onUpdate(updated);
        setTxModal(false);
        setTxAmount("");
        setTxNote("");
    };

    const isUdhaar = user.balance > 0;
    const isJama = user.balance < 0;
    const settled = user.balance === 0;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#c2185b" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{user.name}</Text>
                    <Text style={styles.headerSub}>📞 {user.mobile}</Text>
                </View>
                <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Alert.alert("Call", `Calling ${user.mobile}...`)}
                >
                    <Ionicons name="call" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View
                style={[
                    styles.balanceCard,
                    settled
                        ? styles.settledCard
                        : isUdhaar
                        ? styles.udhaarCard
                        : styles.jamaCard,
                ]}
            >
                <Text style={styles.balCardLabel}>
                    {settled ? "✓ Settled" : isUdhaar ? "Lena Hai (Udhaar)" : "Dena Hai (Jama)"}
                </Text>
                <Text style={styles.balCardAmount}>
                    ₹{Math.abs(user.balance).toLocaleString("en-IN")}
                </Text>
                <Text style={styles.balCardSub}>Last entry: {user.lastDate}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#d32f2f" }]}
                    onPress={() => { setTxType("lena"); setTxModal(true); }}
                >
                    <Ionicons name="arrow-down-circle" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Liya (Received)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#2e7d32" }]}
                    onPress={() => { setTxType("dena"); setTxModal(true); }}
                >
                    <Ionicons name="arrow-up-circle" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Diya (Gave)</Text>
                </TouchableOpacity>
            </View>

            {/* Transaction History */}
            <Text style={styles.historyTitle}>Transaction History</Text>
            <FlatList
                data={user.transactions}
                keyExtractor={t => t.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={() => (
                    <View style={{ alignItems: "center", marginTop: 40 }}>
                        <MaterialCommunityIcons name="receipt" size={50} color="#ddd" />
                        <Text style={{ color: "#bbb", marginTop: 10 }}>Koi transaction nahi</Text>
                    </View>
                )}
                renderItem={({ item }) => (
                    <View style={styles.txCard}>
                        <View
                            style={[
                                styles.txIcon,
                                { backgroundColor: item.type === "lena" ? "#ffebee" : "#e8f5e9" },
                            ]}
                        >
                            <Ionicons
                                name={item.type === "lena" ? "arrow-down" : "arrow-up"}
                                size={18}
                                color={item.type === "lena" ? "#d32f2f" : "#2e7d32"}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.txNote}>{item.note}</Text>
                            <Text style={styles.txDate}>{item.date}</Text>
                        </View>
                        <Text
                            style={[
                                styles.txAmount,
                                item.type === "lena" ? styles.udhaarColor : styles.jamaColor,
                            ]}
                        >
                            {item.type === "lena" ? "+" : "-"}₹
                            {item.amount.toLocaleString("en-IN")}
                        </Text>
                    </View>
                )}
            />

            {/* Transaction Modal */}
            <Modal visible={txModal} transparent animationType="slide" onRequestClose={() => setTxModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTxModal(false)} />
                <View style={styles.modalSheet}>
                    <View style={styles.handleBar} />
                    <Text style={styles.modalTitle}>
                        {txType === "lena" ? "💰 Received (Liya)" : "🤝 Gave (Diya)"}
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.rupeeSign}>₹</Text>
                        <TextInput
                            style={[styles.textInput, { fontSize: 20, fontWeight: "800" }]}
                            placeholder="Amount"
                            placeholderTextColor="#bbb"
                            value={txAmount}
                            onChangeText={setTxAmount}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="create-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Note (optional)"
                            placeholderTextColor="#bbb"
                            value={txNote}
                            onChangeText={setTxNote}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.saveBtn,
                            { backgroundColor: txType === "lena" ? "#d32f2f" : "#2e7d32" },
                        ]}
                        onPress={addTransaction}
                    >
                        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                        <Text style={styles.saveBtnText}>Save Karo</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ═══════════════════════════════════════════════
// SCREEN: Main KhataBook List
// ═══════════════════════════════════════════════
export default function KhataBookScreen() {
    const router = useRouter();
    const [users, setUsers] = useState<KhataUser[]>(INITIAL_USERS);
    const [selectedUser, setSelectedUser] = useState<KhataUser | null>(null);

    // Add modal
    const [addModal, setAddModal] = useState(false);
    const [contactModal, setContactModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [searchContact, setSearchContact] = useState("");

    // Real phone contacts
    const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactsError, setContactsError] = useState("");

    // Summary
    const totalLena = users.filter(u => u.balance > 0).reduce((s, u) => s + u.balance, 0);
    const totalDena = users.filter(u => u.balance < 0).reduce((s, u) => s + Math.abs(u.balance), 0);

    const addUser = () => {
        if (!newName.trim()) { Alert.alert("Error", "Naam dalna zaroori hai!"); return; }
        if (newMobile.trim().length < 10) { Alert.alert("Error", "Sahi mobile number dalo!"); return; }
        const nu: KhataUser = {
            id: Date.now().toString(),
            name: newName.trim(),
            mobile: newMobile.trim(),
            balance: 0,
            lastDate: formatDate(),
            avatar: initials(newName),
            transactions: [],
        };
        setUsers(p => [nu, ...p]);
        setNewName(""); setNewMobile(""); setAddModal(false);
    };

    // Load real phone contacts
    const loadContacts = useCallback(async () => {
        setContactsLoading(true);
        setContactsError("");
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== "granted") {
                setContactsError("Contact permission nahi mili. Settings mein jakar allow karo.");
                setContactsLoading(false);
                return;
            }
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
                sort: Contacts.SortTypes.FirstName,
            });
            const parsed: PhoneContact[] = [];
            data.forEach(c => {
                const name = c.name?.trim() || "Unknown";
                if (c.phoneNumbers && c.phoneNumbers.length > 0) {
                    c.phoneNumbers.forEach(ph => {
                        const mobile = (ph.number || "").replace(/[^0-9]/g, "").slice(-10);
                        if (mobile.length >= 7) {
                            parsed.push({
                                id: `${c.id}_${mobile}`,
                                name,
                                mobile,
                            });
                        }
                    });
                }
            });
            setPhoneContacts(parsed);
        } catch (e) {
            setContactsError("Contacts load nahi ho sake. Dobara try karo.");
        } finally {
            setContactsLoading(false);
        }
    }, []);

    const openContactModal = () => {
        setContactModal(true);
        if (phoneContacts.length === 0) loadContacts();
    };

    const pickContact = (c: PhoneContact) => {
        const nu: KhataUser = {
            id: Date.now().toString(),
            name: c.name,
            mobile: c.mobile,
            balance: 0,
            lastDate: formatDate(),
            avatar: initials(c.name),
            transactions: [],
        };
        setUsers(p => [nu, ...p]);
        setContactModal(false); setAddModal(false); setSearchContact("");
    };

    const updateUser = (updated: KhataUser) => {
        setUsers(p => p.map(u => u.id === updated.id ? updated : u));
        setSelectedUser(updated);
    };

    const filtered = phoneContacts.filter(c =>
        c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
        c.mobile.includes(searchContact)
    );

    // Show detail screen
    if (selectedUser) {
        return (
            <PartyDetail
                user={selectedUser}
                onBack={() => setSelectedUser(null)}
                onUpdate={updateUser}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#c2185b" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Khata Book</Text>
                    <Text style={styles.headerSub}>{users.length} Parties</Text>
                </View>
                <MaterialCommunityIcons name="book-open-page-variant" size={28} color="#fff" />
            </View>

            {/* Summary Strip */}
            <View style={styles.summaryStrip}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Lena Hai</Text>
                    <Text style={[styles.summaryAmount, styles.udhaarColor]}>
                        ₹{totalLena.toLocaleString("en-IN")}
                    </Text>
                </View>
                <View style={styles.dividerV} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Dena Hai</Text>
                    <Text style={[styles.summaryAmount, styles.jamaColor]}>
                        ₹{totalDena.toLocaleString("en-IN")}
                    </Text>
                </View>
                <View style={styles.dividerV} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Net</Text>
                    <Text
                        style={[
                            styles.summaryAmount,
                            { color: totalLena - totalDena >= 0 ? "#d32f2f" : "#2e7d32" },
                        ]}
                    >
                        ₹{Math.abs(totalLena - totalDena).toLocaleString("en-IN")}
                    </Text>
                </View>
            </View>

            {/* List */}
            <FlatList
                data={users}
                keyExtractor={u => u.id}
                renderItem={({ item, index }) => {
                    const isUdhaar = item.balance > 0;
                    const settled = item.balance === 0;
                    return (
                        <TouchableOpacity
                            style={styles.userCard}
                            activeOpacity={0.82}
                            onPress={() => setSelectedUser(item)}
                        >
                            <View style={[styles.avatar, { backgroundColor: getColor(index) }]}>
                                <Text style={styles.avatarText}>{item.avatar}</Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{item.name}</Text>
                                <Text style={styles.userMobile}>📞 {item.mobile}</Text>
                                <Text style={styles.userDate}>{item.lastDate}</Text>
                            </View>
                            <View style={styles.balanceBox}>
                                {settled ? (
                                    <Text style={styles.settledText}>✓ Settled</Text>
                                ) : (
                                    <>
                                        <Text
                                            style={[
                                                styles.balanceAmount,
                                                isUdhaar ? styles.udhaarColor : styles.jamaColor,
                                            ]}
                                        >
                                            ₹{Math.abs(item.balance).toLocaleString("en-IN")}
                                        </Text>
                                        <View
                                            style={[
                                                styles.balBadge,
                                                { backgroundColor: isUdhaar ? "#ffebee" : "#e8f5e9" },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.balBadgeText,
                                                    isUdhaar ? styles.udhaarColor : styles.jamaColor,
                                                ]}
                                            >
                                                {isUdhaar ? "Lena" : "Dena"}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#ccc" />
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons name="book-plus" size={60} color="#ddd" />
                        <Text style={styles.emptyText}>Koi party nahi hai</Text>
                        <Text style={styles.emptySubText}>+ dabao nayi party add karne ke liye</Text>
                    </View>
                )}
            />

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setAddModal(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* ─── Add Party Modal ─── */}
            <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddModal(false)} />
                <View style={styles.modalSheet}>
                    <View style={styles.handleBar} />
                    <Text style={styles.modalTitle}>Nayi Party Add Karo</Text>

                    <View style={styles.inputGroup}>
                        <Ionicons name="person-outline" size={20} color="#c2185b" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Naam likhein"
                            placeholderTextColor="#aaa"
                            value={newName}
                            onChangeText={setNewName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="call-outline" size={20} color="#c2185b" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Mobile number (10 digit)"
                            placeholderTextColor="#aaa"
                            value={newMobile}
                            onChangeText={setNewMobile}
                            keyboardType="numeric"
                            maxLength={10}
                        />
                    </View>

                    <View style={styles.orRow}>
                        <View style={styles.orLine} />
                        <Text style={styles.orText}>YA</Text>
                        <View style={styles.orLine} />
                    </View>

                    <TouchableOpacity
                        style={styles.contactPickerBtn}
                        onPress={openContactModal}
                    >
                        <Ionicons name="people-outline" size={20} color="#1565c0" />
                        <Text style={styles.contactPickerText}>Contact se chunein</Text>
                        <Ionicons name="chevron-forward" size={18} color="#1565c0" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveBtn} onPress={addUser}>
                        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                        <Text style={styles.saveBtnText}>Save Karo</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* ─── Contact Picker Modal ─── */}
            <Modal
                visible={contactModal}
                transparent
                animationType="slide"
                onRequestClose={() => { setContactModal(false); setSearchContact(""); }}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => { setContactModal(false); setSearchContact(""); }}
                />
                <View style={[styles.modalSheet, { maxHeight: "78%" }]}>
                    <View style={styles.handleBar} />

                    {/* Title + Refresh */}
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                        <Text style={[styles.modalTitle, { flex: 1, marginBottom: 0, textAlign: "left" }]}>
                            📱 Phone Contacts
                        </Text>
                        <TouchableOpacity onPress={loadContacts} style={styles.refreshBtn}>
                            <Ionicons name="refresh" size={18} color="#c2185b" />
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    <View style={styles.inputGroup}>
                        <Ionicons name="search-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Naam ya number se dhundho..."
                            placeholderTextColor="#aaa"
                            value={searchContact}
                            onChangeText={setSearchContact}
                        />
                    </View>

                    {/* Loading */}
                    {contactsLoading && (
                        <View style={styles.contactsCenterBox}>
                            <ActivityIndicator size="large" color="#c2185b" />
                            <Text style={styles.contactsStatusText}>Contacts load ho rahe hain...</Text>
                        </View>
                    )}

                    {/* Error */}
                    {!contactsLoading && contactsError !== "" && (
                        <View style={styles.contactsCenterBox}>
                            <Ionicons name="alert-circle-outline" size={40} color="#e57373" />
                            <Text style={[styles.contactsStatusText, { color: "#d32f2f", textAlign: "center" }]}>
                                {contactsError}
                            </Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={loadContacts}>
                                <Text style={styles.retryBtnText}>Dobara Try Karo</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Contacts list */}
                    {!contactsLoading && contactsError === "" && (
                        <FlatList
                            data={filtered}
                            keyExtractor={c => c.id}
                            showsVerticalScrollIndicator={false}
                            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />}
                            ListEmptyComponent={() => (
                                <View style={styles.contactsCenterBox}>
                                    <Ionicons name="people-outline" size={40} color="#ddd" />
                                    <Text style={styles.contactsStatusText}>
                                        {phoneContacts.length === 0
                                            ? "Koi contact nahi mila"
                                            : "Search result nahi mila"}
                                    </Text>
                                </View>
                            )}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity style={styles.contactItem} onPress={() => pickContact(item)}>
                                    <View style={[styles.contactAvatar, { backgroundColor: getColor(index) }]}>
                                        <Text style={styles.contactAvatarText}>{initials(item.name)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.contactName}>{item.name}</Text>
                                        <Text style={styles.contactMobile}>📞 {item.mobile}</Text>
                                    </View>
                                    <Ionicons name="add-circle" size={26} color="#c2185b" />
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f6fa" },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#c2185b",
        paddingTop: 50,
        paddingBottom: 18,
        paddingHorizontal: 16,
        gap: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 8,
        shadowColor: "#c2185b",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
    headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 },
    callBtn: {
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 20,
        padding: 8,
    },

    // Summary
    summaryStrip: {
        flexDirection: "row",
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    summaryItem: { flex: 1, alignItems: "center" },
    summaryLabel: { fontSize: 11, color: "#888", fontWeight: "600", marginBottom: 4 },
    summaryAmount: { fontSize: 17, fontWeight: "900" },
    dividerV: { width: 1, backgroundColor: "#eee", marginVertical: 4 },

    // Colors
    udhaarColor: { color: "#d32f2f" },
    jamaColor: { color: "#2e7d32" },

    // List
    listContent: { padding: 16, paddingBottom: 100 },

    // User Card
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: "700", color: "#222" },
    userMobile: { fontSize: 12, color: "#666", marginTop: 2 },
    userDate: { fontSize: 11, color: "#bbb", marginTop: 2 },
    balanceBox: { alignItems: "flex-end", gap: 4 },
    balanceAmount: { fontSize: 15, fontWeight: "800" },
    balBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    balBadgeText: { fontSize: 11, fontWeight: "700" },
    settledText: { fontSize: 12, fontWeight: "700", color: "#43a047" },

    // Empty
    emptyBox: { alignItems: "center", marginTop: 80, gap: 10 },
    emptyText: { fontSize: 16, fontWeight: "700", color: "#ccc" },
    emptySubText: { fontSize: 13, color: "#ddd" },

    // FAB
    fab: {
        position: "absolute",
        bottom: 30,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#c2185b",
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        shadowColor: "#c2185b",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
    },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
    modalSheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 12,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: "#e0e0e0",
        borderRadius: 99,
        alignSelf: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#222",
        marginBottom: 18,
        textAlign: "center",
    },

    // Inputs
    inputGroup: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#eee",
        marginBottom: 12,
        paddingHorizontal: 12,
        height: 52,
    },
    inputIcon: { marginRight: 10 },
    rupeeSign: { fontSize: 22, fontWeight: "800", color: "#222", marginRight: 6 },
    textInput: { flex: 1, fontSize: 15, color: "#222" },

    // OR
    orRow: { flexDirection: "row", alignItems: "center", marginVertical: 14, gap: 10 },
    orLine: { flex: 1, height: 1, backgroundColor: "#eee" },
    orText: { fontSize: 12, color: "#aaa", fontWeight: "700" },

    // Contact picker
    contactPickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e3f2fd",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 18,
    },
    contactPickerText: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1565c0" },

    // Save
    saveBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#c2185b",
        borderRadius: 14,
        paddingVertical: 15,
        gap: 8,
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

    // Contact list
    contactItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 12,
    },
    contactAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: "center",
        alignItems: "center",
    },
    contactAvatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    contactName: { fontSize: 14, fontWeight: "700", color: "#222" },
    contactMobile: { fontSize: 12, color: "#888", marginTop: 2 },

    // Party Detail
    balanceCard: {
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 24,
        alignItems: "center",
        elevation: 4,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    udhaarCard: {
        backgroundColor: "#c62828",
        shadowColor: "#c62828",
    },
    jamaCard: {
        backgroundColor: "#2e7d32",
        shadowColor: "#2e7d32",
    },
    settledCard: {
        backgroundColor: "#37474f",
        shadowColor: "#37474f",
    },
    balCardLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
    balCardAmount: { fontSize: 36, fontWeight: "900", color: "#fff", marginTop: 4 },
    balCardSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 6 },

    // Action buttons
    actionRow: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 14,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 13,
        borderRadius: 12,
        elevation: 3,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    // History
    historyTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#888",
        marginHorizontal: 16,
        marginTop: 18,
        marginBottom: 10,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    txCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        gap: 12,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
    },
    txIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: "center",
        alignItems: "center",
    },
    txNote: { fontSize: 13, fontWeight: "600", color: "#333" },
    txDate: { fontSize: 11, color: "#bbb", marginTop: 2 },
    txAmount: { fontSize: 15, fontWeight: "800" },

    // Contact modal extras
    refreshBtn: {
        backgroundColor: "#fce4ec",
        borderRadius: 20,
        padding: 8,
    },
    contactsCenterBox: {
        alignItems: "center",
        paddingVertical: 30,
        gap: 12,
    },
    contactsStatusText: {
        fontSize: 13,
        color: "#aaa",
        fontWeight: "600",
    },
    retryBtn: {
        backgroundColor: "#c2185b",
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginTop: 4,
    },
    retryBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
});

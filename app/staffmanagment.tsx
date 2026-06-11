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
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import StaffLoader from '../components/StaffLoader';

interface Staff {
    id: string;
    staffId: string;
    firstName: string;
    lastName: string;
    mobile: string;
    role: string;
    salary: number;
    profileImage?: string;
    city: string;
    room?: string;
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

export default function StaffManagement() {
    const router = useRouter();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [mobile, setMobile] = useState("");
    const [adharNumber, setAdharNumber] = useState("");
    const [salary, setSalary] = useState("");
    const [role, setRole] = useState("housekeeping");
    const [dob, setDob] = useState("");
    const [city, setCity] = useState("");
    const [email, setEmail] = useState("");
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [idProofImage, setIdProofImage] = useState<string | null>(null);

    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
    const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isProcessingAttendance, setIsProcessingAttendance] = useState(false);

    const roles = ["housekeeping", "chef", "receptionist", "manager", "security"];

    // ── Helpers: today's cache key ──────────────────────────────────────────
    const getTodayKey = () => {
        const d = new Date();
        return `attendance_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    };

    const saveAttendanceCache = async (records: Record<string, string>) => {
        try {
            await AsyncStorage.setItem(getTodayKey(), JSON.stringify(records));
        } catch (e) {
            console.error("Cache save error:", e);
        }
    };

    const loadAttendanceCache = async (): Promise<Record<string, string>> => {
        try {
            const cached = await AsyncStorage.getItem(getTodayKey());
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.error("Cache load error:", e);
        }
        return {};
    };
    // ────────────────────────────────────────────────────────────────────────

    const fetchTodayAttendance = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch("http://192.168.31.192:6000/api/v1/staff/get-attendance", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok && data && (data.success || data.attendance || data.message)) {
                const attendanceArray = Array.isArray(data.attendance) ? data.attendance : [];
                const records: Record<string, string> = {};
                attendanceArray.forEach((att: any) => {
                    const staffIdField = att.staffId;
                    if (staffIdField && typeof staffIdField === 'object') {
                        if (staffIdField._id) records[staffIdField._id] = att.attendance;
                        if (staffIdField.staffId) records[staffIdField.staffId] = att.attendance;
                    } else if (typeof staffIdField === 'string') {
                        records[staffIdField] = att.attendance;
                    }
                });

                // Merge API data with local cache so nothing is lost
                const cached = await loadAttendanceCache();
                const merged = { ...cached, ...records };
                setAttendanceRecords(merged);
                await saveAttendanceCache(merged);
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        }
    };

    const fetchStaff = async () => {
        setIsFetching(true);
        try {
            // ── Step 1: Load cached attendance first (instant, no network) ──
            const cached = await loadAttendanceCache();
            if (Object.keys(cached).length > 0) {
                setAttendanceRecords(cached);
            }

            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch("http://192.168.31.192:6000/api/v1/staff/get-staff", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok && data && Array.isArray(data.staffList)) {
                const formattedStaff = data.staffList.map((s: any) => ({
                    id: s._id || s.id || Math.random().toString(),
                    staffId: s.staffId || s._id || s.id || "",
                    firstName: s.firstName || "",
                    lastName: s.lastName || "",
                    mobile: s.mobile || "",
                    role: s.role || "",
                    salary: Number(s.salary) || 0,
                    profileImage: s.profileImage,
                    city: s.address?.city || s.city || "",
                    room: s.room || "",
                }));
                setStaffList(formattedStaff);
            }
            // ── Step 2: Sync with API in background ──
            await fetchTodayAttendance();
        } catch (error) {
            console.error("Error fetching staff:", error);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const launchCamera = async (type: 'profile' | 'idProof') => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Camera permission is required to take photos.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            if (type === 'profile') setProfileImage(result.assets[0].uri);
            else setIdProofImage(result.assets[0].uri);
        }
    };

    const launchGallery = async (type: 'profile' | 'idProof') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            if (type === 'profile') setProfileImage(result.assets[0].uri);
            else setIdProofImage(result.assets[0].uri);
        }
    };

    const pickImage = async (type: 'profile' | 'idProof') => {
        Alert.alert(
            "Select Photo Source",
            "Choose how you want to upload the photo",
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

    const handleSubmit = async () => {
        if (!firstName || !lastName || !mobile || !adharNumber || !salary || !dob || !city) {
            Alert.alert("Error", "Please fill all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const formData = new FormData();
            formData.append("firstName", firstName);
            formData.append("lastName", lastName);
            formData.append("mobile", mobile);
            formData.append("adharNumber", adharNumber);
            formData.append("salary", salary);
            formData.append("role", role);
            formData.append("DOB", dob);
            formData.append("address[city]", city);
            if (email) formData.append("email", email);

            if (profileImage) {
                const uriParts = profileImage.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append("profileImage", {
                    uri: profileImage,
                    name: `profile.${fileType}`,
                    type: `image/${fileType}`,
                } as any);
            }

            if (idProofImage) {
                const uriParts = idProofImage.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append("IdProofImage", {
                    uri: idProofImage,
                    name: `idProof.${fileType}`,
                    type: `image/${fileType}`,
                } as any);
            }

            const response = await fetch("http://192.168.31.192:6000/api/v1/staff/add", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                Alert.alert("Success", "Staff added successfully");
                setModalVisible(false);
                resetForm();
                fetchStaff();
            } else {
                Alert.alert("Error", data.message || "Failed to add staff");
            }
        } catch (error) {
            console.error("Error adding staff:", error);
            Alert.alert("Error", "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFirstName("");
        setLastName("");
        setMobile("");
        setAdharNumber("");
        setSalary("");
        setRole("housekeeping");
        setDob("");
        setCity("");
        setEmail("");
        setProfileImage(null);
        setIdProofImage(null);
    };

    const filteredStaff = staffList.filter(
        (s) =>
            (s.firstName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.lastName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.role || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleMarkAttendance = async (status: string) => {
        if (!selectedStaff) return;

        setIsProcessingAttendance(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const isEditing = !!attendanceRecords[selectedStaff.staffId];
            const url = isEditing
                ? "http://192.168.31.192:6000/api/v1/staff/edit-attendance"
                : "http://192.168.31.192:6000/api/v1/staff/mark-attendance";

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    staffId: selectedStaff.staffId,
                    attendance: status
                })
            });

            const data = await response.json();
            if (response.ok) {
                setAttendanceRecords(prev => {
                    const updated = {
                        ...prev,
                        [selectedStaff.staffId]: status,
                        [selectedStaff.id]: status,
                    };
                    // ── Persist to AsyncStorage so it survives app restart ──
                    saveAttendanceCache(updated);
                    return updated;
                });
                setAttendanceModalVisible(false);
                setSelectedStaff(null);
            } else {
                Alert.alert("Error", data.message || "Failed to mark attendance");
            }
        } catch (error) {
            console.error("Error marking attendance:", error);
            Alert.alert("Error", "Server error occurred");
        } finally {
            setIsProcessingAttendance(false);
        }
    };

    const renderStaffCard = ({ item }: { item: Staff }) => {
        // Try to match attendance status using both possible ID formats
        const attendanceStatus = attendanceRecords[item.staffId] || attendanceRecords[item.id];

        return (
            <View style={[styles.card, { paddingBottom: 0 }]}>
                <TouchableOpacity
                    style={{ padding: 16 }}
                    onPress={() => router.push({ pathname: "/staffprofile" as any, params: { staffId: item.staffId } })}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.imagePlaceholder}>
                            {item.profileImage ? (
                                <Image source={{ uri: item.profileImage }} style={styles.profileImg} />
                            ) : (
                                <Ionicons name="person" size={24} color="#666" />
                            )}
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.staffName}>{item.firstName} {item.lastName}</Text>
                            <Text style={styles.staffRole}>{item.role.toUpperCase()}</Text>
                        </View>
                        <View style={styles.salaryBadge}>
                            <Text style={styles.salaryText}>₹{item.salary}</Text>
                        </View>
                    </View>
                    <View style={styles.cardFooter}>
                        <View style={styles.footerItem}>
                            <Ionicons name="call-outline" size={14} color="#666" />
                            <Text style={styles.footerText}>{item.mobile}</Text>
                        </View>
                        <View style={styles.footerItem}>
                            <Ionicons name="location-outline" size={14} color="#666" />
                            <Text style={styles.footerText}>{item.city}</Text>
                        </View>
                        {attendanceStatus && (
                            <View style={[styles.attendanceBadge,
                            attendanceStatus === "present" ? styles.bgPresent :
                                attendanceStatus === "absent" ? styles.bgAbsent :
                                    attendanceStatus === "halfday" ? styles.bgHalfDay : styles.bgLeave]}>
                                <Text style={[styles.attendanceBadgeText,
                                attendanceStatus === "present" ? styles.textPresent :
                                    attendanceStatus === "absent" ? styles.textAbsent :
                                        attendanceStatus === "halfday" ? styles.textHalfDay : styles.textLeave]}>
                                    {attendanceStatus.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.attendanceButton, attendanceStatus ? styles.editButton : styles.markButton]}
                    onPress={() => {
                        setSelectedStaff(item);
                        setAttendanceModalVisible(true);
                    }}
                >
                    <Ionicons name={attendanceStatus ? "create-outline" : "checkmark-circle-outline"} size={18} color="#fff" />
                    <Text style={styles.attendanceButtonText}>
                        {attendanceStatus ? "Edit Attendance" : "Mark Attendance"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Managment</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        placeholder="Search staff name or role..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <FlatList
                data={filteredStaff}
                renderItem={renderStaffCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={isFetching}
                onRefresh={fetchStaff}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {isFetching ? (
                            <StaffLoader />
                        ) : (
                            <Text style={styles.emptyText}>No staff members found</Text>
                        )}
                    </View>
                }
            />
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent={true}
                visible={attendanceModalVisible}
                onRequestClose={() => setAttendanceModalVisible(false)}
            >
                <View style={styles.attendanceModalOverlay}>
                    <View style={styles.attendanceModalContent}>
                        <View style={styles.attendanceModalHeader}>
                            <Text style={styles.attendanceModalTitle}>Select Attendance Status</Text>
                            <TouchableOpacity onPress={() => setAttendanceModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.attendanceStaffName}>
                            {selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : ""}
                        </Text>

                        {isProcessingAttendance ? (
                            <ActivityIndicator size="large" color="#0c831f" style={{ marginVertical: 30 }} />
                        ) : (
                            <View style={styles.attendanceOptions}>
                                <TouchableOpacity style={[styles.optionBtn, styles.bgPresent]} onPress={() => handleMarkAttendance("present")}>
                                    <View style={[styles.iconWrapper, styles.bgPresentIcon]}>
                                        <Ionicons name="checkmark-circle" size={26} color="#0c831f" />
                                    </View>
                                    <Text style={[styles.optionText, styles.textPresent]}>Present</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.optionBtn, styles.bgHalfDay]} onPress={() => handleMarkAttendance("halfday")}>
                                    <View style={[styles.iconWrapper, styles.bgHalfDayIcon]}>
                                        <Ionicons name="time" size={26} color="#b45309" />
                                    </View>
                                    <Text style={[styles.optionText, styles.textHalfDay]}>Half Day</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.optionBtn, styles.bgAbsent]} onPress={() => handleMarkAttendance("absent")}>
                                    <View style={[styles.iconWrapper, styles.bgAbsentIcon]}>
                                        <Ionicons name="close-circle" size={26} color="#d00000" />
                                    </View>
                                    <Text style={[styles.optionText, styles.textAbsent]}>Absent</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.optionBtn, styles.bgLeave]} onPress={() => handleMarkAttendance("paidleave")}>
                                    <View style={[styles.iconWrapper, styles.bgLeaveIcon]}>
                                        <Ionicons name="calendar" size={26} color="#023e8a" />
                                    </View>
                                    <Text style={[styles.optionText, styles.textLeave]}>Paid Leave</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Staff</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.form}>
                                <View style={styles.row}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <FloatingLabelInput label="First Name" value={firstName} onChangeText={setFirstName} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <FloatingLabelInput label="Last Name" value={lastName} onChangeText={setLastName} />
                                    </View>
                                </View>

                                <FloatingLabelInput label="Mobile Number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={10} />
                                <FloatingLabelInput label="Aadhaar Number" value={adharNumber} onChangeText={setAdharNumber} keyboardType="numeric" maxLength={12} />
                                <FloatingLabelInput label="Salary" value={salary} onChangeText={setSalary} keyboardType="numeric" />

                                <Text style={styles.label}>Role</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
                                    {roles.map((r) => (
                                        <TouchableOpacity
                                            key={r}
                                            style={[styles.roleChip, role === r && styles.activeRoleChip]}
                                            onPress={() => setRole(r)}
                                        >
                                            <Text style={[styles.roleChipText, role === r && styles.activeRoleChipText]}>{r}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <FloatingLabelInput label="Date of Birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} placeholder="1995-10-15" />
                                <FloatingLabelInput label="City" value={city} onChangeText={setCity} />
                                <FloatingLabelInput label="Email (Optional)" value={email} onChangeText={setEmail} keyboardType="email-address" />

                                <View style={styles.imageUploadSection}>
                                    <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('profile')}>
                                        {profileImage ? (
                                            <Image source={{ uri: profileImage }} style={styles.previewImg} />
                                        ) : (
                                            <>
                                                <Ionicons name="camera-outline" size={24} color="#666" />
                                                <Text style={styles.imagePickerText}>Profile Image</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('idProof')}>
                                        {idProofImage ? (
                                            <Image source={{ uri: idProofImage }} style={styles.previewImg} />
                                        ) : (
                                            <>
                                                <Ionicons name="card-outline" size={24} color="#666" />
                                                <Text style={styles.imagePickerText}>ID Proof</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Add Staff</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
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
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "#ffb703",
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: "900", color: "#000" },
    searchContainer: { padding: 16, backgroundColor: "#ffb703", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
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
    listContent: { paddingBottom: 80 },
    card: { backgroundColor: "#fff", marginTop: 3, elevation: 3, overflow: 'hidden' },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    imagePlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", marginRight: 12 },
    profileImg: { width: 48, height: 48, borderRadius: 24 },
    cardInfo: { flex: 1 },
    staffName: { fontSize: 18, fontWeight: "800", color: "#333" },
    staffRole: { fontSize: 12, color: "#666", fontWeight: "600" },
    salaryBadge: { backgroundColor: "#e8f5e9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    salaryText: { color: "#0c831f", fontWeight: "800" },
    cardFooter: { flexDirection: "row", justifyContent: 'space-between', alignItems: "center", borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 12 },
    footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    footerText: { fontSize: 13, color: "#666", fontWeight: "600" },
    attendanceButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        marginTop: 12,
        gap: 8,
    },
    markButton: { backgroundColor: "#cee9ffff" },
    editButton: { backgroundColor: "#ffc6c6ff" },
    attendanceButtonText: { color: "#747272ff", fontSize: 14, fontWeight: "800" },
    attendanceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    attendanceBadgeText: { fontSize: 12, fontWeight: "900" },
    bgPresent: { backgroundColor: "#e8f5e9" },
    bgAbsent: { backgroundColor: "#ffebee" },
    bgHalfDay: { backgroundColor: "#fff8e1" },
    bgLeave: { backgroundColor: "#e3f2fd" },
    textPresent: { color: "#0c831f" },
    textAbsent: { color: "#d32f2f" },
    textHalfDay: { color: "#b45309" },
    textLeave: { color: "#023e8a" },
    iconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    bgPresentIcon: { backgroundColor: "rgba(12, 131, 31, 0.15)" },
    bgAbsentIcon: { backgroundColor: "rgba(211, 47, 47, 0.15)" },
    bgHalfDayIcon: { backgroundColor: "rgba(180, 83, 9, 0.15)" },
    bgLeaveIcon: { backgroundColor: "rgba(2, 62, 138, 0.15)" },
    attendanceModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
    attendanceModalContent: { backgroundColor: "#fff", borderRadius: 32, padding: 24, width: "100%", maxWidth: 400, elevation: 15 },
    attendanceModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    attendanceModalTitle: { fontSize: 22, fontWeight: "900", color: "#333" },
    attendanceStaffName: { fontSize: 16, color: "#666", fontWeight: "700", marginBottom: 30 },
    attendanceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    optionBtn: { width: '48%', alignItems: "center", justifyContent: 'center', paddingVertical: 20, borderRadius: 20, marginBottom: 4 },
    optionText: { fontSize: 16, fontWeight: "800" },
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
    modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: "900", color: "#000" },
    form: { gap: 16 },
    row: { flexDirection: 'row' },
    inputContainer: { marginTop: 10, marginBottom: 10 },
    input: { height: 56, borderWidth: 1.5, borderColor: "#eee", borderRadius: 12, paddingHorizontal: 16, fontSize: 16, fontWeight: "600", color: "#000", backgroundColor: "#fff" },
    label: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 8 },
    roleScroll: { marginBottom: 8 },
    roleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f0f0f0", marginRight: 8 },
    activeRoleChip: { backgroundColor: "#0c831f" },
    roleChipText: { fontWeight: "600", color: "#666" },
    activeRoleChipText: { color: "#fff" },
    imageUploadSection: { flexDirection: 'row', gap: 16, marginTop: 8 },
    imagePicker: { flex: 1, height: 100, borderRadius: 12, borderWidth: 1.5, borderColor: "#eee", borderStyle: "dashed", justifyContent: "center", alignItems: "center", overflow: 'hidden' },
    previewImg: { width: '100%', height: '100%' },
    imagePickerText: { fontSize: 12, color: "#666", marginTop: 4 },
    saveButton: { height: 56, backgroundColor: "#0c831f", borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 16, marginBottom: 40 },
    saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    emptyContainer: { alignItems: "center", marginTop: 40 },
    emptyText: { fontSize: 16, color: "#999", fontWeight: "600" },
});

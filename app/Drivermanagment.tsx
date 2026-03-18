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
import DriverLoader from '../components/DriverLoader';

interface Driver {
    id: string;
    srNumber: string;
    name: string;
    carNumber: string;
    mobile: string;
    locationName: string;
    state?: string;
    pincode?: string;
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

export default function DriverManagement() {
    const router = useRouter();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [showAnimModal, setShowAnimModal] = useState(false);
    const carAnim = useRef(new Animated.Value(0)).current;

    const startCarAnimation = () => {
        carAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(carAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(carAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                })
            ])
        ).start();
    };

    const fetchDrivers = async () => {
        setIsFetching(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch("http://192.168.31.192:6000/api/v1/hotel/get-all-driver", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok && data.drivers) {
                const formattedDrivers = data.drivers.map((d: any) => ({
                    id: d.driverId || d._id, // Prefer the generated driverId
                    srNumber: d.SRnumber || "",
                    name: d.driverName || "",
                    carNumber: d.carNumber || "",
                    mobile: d.mobileNumber || "",
                    locationName: d.address?.city || "",
                    state: d.address?.state || "",
                    pincode: d.address?.pincode || "",
                }));
                // Sort by SR number descending to show newest first, or leave as order from API
                setDrivers(formattedDrivers.reverse());
            }
        } catch (error) {
            console.error("Error fetching drivers:", error);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    // Form State
    const [newName, setNewName] = useState("");
    const [newCarNumber, setNewCarNumber] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newCity, setNewCity] = useState("");
    const [newStateField, setNewStateField] = useState("");
    const [newPincode, setNewPincode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editDriverId, setEditDriverId] = useState("");
    const [editSrNumber, setEditSrNumber] = useState("");

    const filteredDrivers = drivers.filter(
        (driver) =>
            driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            driver.carNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const resetForm = () => {
        setNewName("");
        setNewCarNumber("");
        setNewMobile("");
        setNewCity("");
        setNewStateField("");
        setNewPincode("");
        setIsEditMode(false);
        setEditDriverId("");
        setEditSrNumber("");
    };

    const openAddModal = () => {
        resetForm();
        setModalVisible(true);
    };

    const openEditModal = (driver: Driver) => {
        resetForm();
        setIsEditMode(true);
        setEditDriverId(driver.id);
        setEditSrNumber(driver.srNumber);
        setNewName(driver.name);
        setNewCarNumber(driver.carNumber);
        setNewMobile(driver.mobile);
        setNewCity(driver.locationName);
        setNewStateField(driver.state || "");
        setNewPincode(driver.pincode || "");
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        setShowAnimModal(true);
        startCarAnimation();
        
        // Wait exactly 3 seconds for animation to feel natural
        const minWaitPromise = new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
            const nextSr = (drivers.length + 1).toString();
            const token = await AsyncStorage.getItem("userToken");
            
            let url = "http://192.168.31.192:6000/api/v1/hotel/add-driver";
            let method = "POST";
            let payload: any = {
                SRnumber: nextSr,
                driverName: newName,
                carNumber: newCarNumber,
                mobileNumber: newMobile,
                address: {
                    city: newCity,
                    state: newStateField,
                    pincode: newPincode
                }
            };

            if (isEditMode) {
                url = "http://192.168.31.192:6000/api/v1/hotel/edit-driver";
                method = "PATCH"; // Using PATCH as per backend routes
                payload = {
                    SRnumber: editSrNumber,
                    driverId: editDriverId,
                    driverName: newName,
                    mobileNumber: newMobile
                };
            }

            const apiPromise = fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }).then(async res => {
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json().catch(() => ({})) : {};
                return { ok: res.ok, status: res.status, data };
            });
            
            // Resolve both animation time and API at the same time
            const [_, response] = await Promise.all([minWaitPromise, apiPromise]);
            let { ok, data, status } = response;
            
            setShowAnimModal(false);
            
            if (ok) {
                if (isEditMode) {
                    const addedDriver = data.updatedDriver || data.newDriver || data.driver || {};
                    setDrivers(prev => prev.map(d => {
                        if (d.id === editDriverId) {
                            return {
                                ...d,
                                name: addedDriver.driverName || newName,
                                carNumber: addedDriver.carNumber || newCarNumber,
                                mobile: addedDriver.mobileNumber || newMobile,
                                locationName: addedDriver.address?.city || newCity || d.locationName,
                                state: addedDriver.address?.state || newStateField || d.state,
                                pincode: addedDriver.address?.pincode || newPincode || d.pincode
                            }
                        }
                        return d;
                    }));
                } else {
                    const addedDriver = data.updatedDriver || data.newDriver || data.driver || {};
                    const newDriverId = addedDriver.driverId || addedDriver._id || Date.now().toString();
                    const newDriver: Driver = {
                        id: newDriverId,
                        srNumber: addedDriver.SRnumber || nextSr,
                        name: addedDriver.driverName || newName,
                        carNumber: addedDriver.carNumber || newCarNumber,
                        mobile: addedDriver.mobileNumber || newMobile,
                        locationName: addedDriver.address?.city || newCity || "",
                        state: addedDriver.address?.state || newStateField || "",
                        pincode: addedDriver.address?.pincode || newPincode || "",
                    };
                    // Add to start of list
                    setDrivers([newDriver, ...drivers]);
                }
                setModalVisible(false);
                resetForm();
            } else {
                Alert.alert("Error", data.message || `Failed to ${isEditMode ? 'edit' : 'add'} driver`);
            }
        } catch (error) {
            console.error("Error submitting driver:", error);
            setShowAnimModal(false);
            Alert.alert("Error", `An error occurred while ${isEditMode ? 'editing' : 'adding'} driver`);
        }
    };

    const renderDriverCard = ({ item }: { item: Driver }) => (
        <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: "/DriverProfile", params: { driverId: item.id } })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.srCircle}>
                    <Text style={styles.srText}>{item.srNumber}</Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.driverName}>{item.name}</Text>
                    <Text style={styles.carNumber}>{item.carNumber}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
                        <Ionicons name="pencil" size={20} color="#0c831f" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.callButton}>
                        <Ionicons name="call" size={20} color="#0c831f" />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                    <Ionicons name="phone-portrait-outline" size={14} color="#666" />
                    <Text style={styles.footerText}>{item.mobile}</Text>
                </View>
                <View style={styles.footerItem}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.footerText} numberOfLines={1}>
                        {item.locationName}
                    </Text>
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
                <Text style={styles.headerTitle}>Driver managment</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        placeholder="Search driver or car number..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery !== "" && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Driver List */}
            <FlatList
                data={filteredDrivers}
                renderItem={renderDriverCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={isFetching}
                onRefresh={fetchDrivers}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {isFetching ? (
                            <DriverLoader text="Fetching Drivers..." />
                        ) : (
                            <Text style={styles.emptyText}>No drivers found</Text>
                        )}
                    </View>
                }
            />

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={openAddModal}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditMode ? "Edit Driver" : "Add New Driver"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                        >
                            <View style={styles.form}>
                                <View style={styles.inputGroupPlain}>
                                    <Text style={styles.labelPlain}>SR Number (Auto)</Text>
                                    <View style={styles.readOnlyContainer}>
                                        <Text style={styles.readOnlyText}>{isEditMode ? editSrNumber : (drivers.length + 1).toString()}</Text>
                                    </View>
                                </View>

                                <FloatingLabelInput
                                    label="Driver Name"
                                    value={newName}
                                    onChangeText={setNewName}
                                />

                                <FloatingLabelInput
                                    label="Car Number"
                                    value={newCarNumber}
                                    onChangeText={setNewCarNumber}
                                    editable={!isEditMode}
                                />

                                <FloatingLabelInput
                                    label="Mobile Number"
                                    value={newMobile}
                                    onChangeText={setNewMobile}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />

                                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                    <View style={{ flex: 1 }}>
                                        <FloatingLabelInput
                                            label="City"
                                            value={newCity}
                                            onChangeText={setNewCity}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <FloatingLabelInput
                                            label="State"
                                            value={newStateField}
                                            onChangeText={setNewStateField}
                                        />
                                    </View>
                                </View>

                                <FloatingLabelInput
                                    label="Pincode"
                                    value={newPincode}
                                    onChangeText={setNewPincode}
                                    keyboardType="numeric"
                                    maxLength={6}
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.saveButton,
                                        (!newName || !newCarNumber || !newMobile || !newCity || !newStateField || !newPincode || showAnimModal) && styles.saveButtonDisabled
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={!newName || !newCarNumber || !newMobile || !newCity || !newStateField || !newPincode || showAnimModal}
                                >
                                    <Text style={styles.saveButtonText}>{isEditMode ? "Save Changes" : "Save Driver"}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Animation Loading Modal */}
            <Modal
                transparent={true}
                visible={showAnimModal}
                animationType="fade"
                statusBarTranslucent
            >
                <View style={styles.animationOverlay}>
                    <View style={styles.animationBox}>
                        <Animated.Text
                            style={[
                                styles.movingCar,
                                {
                                    transform: [{
                                        translateX: carAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [-60, 60] // move car left to right
                                        })
                                    }]
                                }
                            ]}
                        >
                            🚗💨
                        </Animated.Text>
                        <Text style={styles.animationText}>Adding Driver...</Text>
                    </View>
                </View>
            </Modal>
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
        paddingTop: 60,
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
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        fontWeight: "600",
    },
    listContent: {
        paddingBottom: 100,
        paddingHorizontal: 0,
    },
    card: {
        backgroundColor: "#fff",
        padding: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        marginHorizontal: 0,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    srCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    srText: {
        fontSize: 16,
        fontWeight: "900",
        color: "#333",
    },
    cardInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#333",
    },
    carNumber: {
        fontSize: 14,
        color: "#666",
        fontWeight: "700",
        marginTop: 2,
    },
    editButton: {
        padding: 8,
        backgroundColor: "#e8f5e9",
        borderRadius: 10,
    },
    callButton: {
        padding: 8,
        backgroundColor: "#e8f5e9",
        borderRadius: 10,
    },
    cardFooter: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingTop: 12,
        gap: 16,
    },
    footerItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    footerText: {
        fontSize: 13,
        color: "#666",
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#999",
        fontWeight: "600",
    },
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
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
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
    inputGroupPlain: {
        marginBottom: 10,
    },
    labelPlain: {
        fontSize: 12,
        fontWeight: "700",
        color: "#888",
        marginBottom: 4,
        marginLeft: 4,
    },
    readOnlyContainer: {
        height: 52,
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        justifyContent: "center",
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: "#eee",
    },
    readOnlyText: {
        fontSize: 16,
        fontWeight: "800",
        color: "#333",
    },
    saveButton: {
        height: 56,
        backgroundColor: "#0c831f",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 20,
    },
    saveButtonDisabled: {
        backgroundColor: "#ccc",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "800",
    },
    animationOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    animationBox: {
        width: 220,
        height: 160,
        backgroundColor: "#fff",
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    movingCar: {
        fontSize: 48,
        marginBottom: 16,
    },
    animationText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0c831f",
        marginTop: 8,
    },
});

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { BASE_URL } from "../constants/Config";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";



export default function TrackRecordScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [bookingsCount, setBookingsCount] = useState(0);
    const [totalBillingAmount, setTotalBillingAmount] = useState(0);
    const [pendingBillingAmount, setPendingBillingAmount] = useState(0);
    const [billsCount, setBillsCount] = useState(0);

    const [activeFilter, setActiveFilter] = useState<"today" | "7days" | "custom">("today");

    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());

    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    // Fetch data based on activeFilter, fromDate, and toDate
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                Alert.alert("Error", "Authentication token not found.");
                return;
            }

            let start = new Date();
            let end = new Date();

            if (activeFilter === "today") {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
            } else if (activeFilter === "7days") {
                start.setDate(start.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
            } else {
                start = new Date(fromDate);
                start.setHours(0, 0, 0, 0);
                end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
            }

            const startStr = start.toISOString();
            const endStr = end.toISOString();

            const response = await fetch(`${BASE_URL}/hotel/track-record?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (response.ok && data.status === "success") {
                setBookingsCount(data.data.bookingsCount || 0);
                setTotalBillingAmount(data.data.totalBillingAmount || 0);
                setPendingBillingAmount(data.data.pendingBillingAmount || 0);
                setBillsCount(data.data.billsCount || 0);
            } else {
                Alert.alert("Error", data.message || "Failed to fetch record.");
            }
        } catch (error) {
            console.error("Fetch record error:", error);
            Alert.alert("Error", "Network request failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeFilter, fromDate, toDate]);

    const handleSelectFilter = (filterType: "today" | "7days" | "custom") => {
        setActiveFilter(filterType);
        if (filterType === "today") {
            setFromDate(new Date());
            setToDate(new Date());
        } else if (filterType === "7days") {
            const start = new Date();
            start.setDate(start.getDate() - 7);
            setFromDate(start);
            setToDate(new Date());
        }
    };

    const onChangeFromDate = (event: any, selectedDate?: Date) => {
        setShowFromPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setFromDate(selectedDate);
            // Ensure toDate is not before fromDate
            if (toDate < selectedDate) {
                setToDate(selectedDate);
            }
        }
    };

    const onChangeToDate = (event: any, selectedDate?: Date) => {
        setShowToPicker(Platform.OS === 'ios');
        if (selectedDate) {
            if (selectedDate < fromDate) {
                Alert.alert("Validation Error", "To date cannot be before From date");
                return;
            }
            setToDate(selectedDate);
        }
    };

    const formatDateString = (date: Date) => {
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Track Record</Text>
                <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={22} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Filters Title */}
                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Select Date Filter</Text>
                    
                    {/* Filter Buttons */}
                    <View style={styles.filterButtonsRow}>
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                activeFilter === "today" && styles.activeFilterButton
                            ]}
                            onPress={() => handleSelectFilter("today")}
                        >
                            <Text style={[
                                styles.filterButtonText,
                                activeFilter === "today" && styles.activeFilterButtonText
                            ]}>Today</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                activeFilter === "7days" && styles.activeFilterButton
                            ]}
                            onPress={() => handleSelectFilter("7days")}
                        >
                            <Text style={[
                                styles.filterButtonText,
                                activeFilter === "7days" && styles.activeFilterButtonText
                            ]}>Last 7 Days</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                activeFilter === "custom" && styles.activeFilterButton
                            ]}
                            onPress={() => handleSelectFilter("custom")}
                        >
                            <Text style={[
                                styles.filterButtonText,
                                activeFilter === "custom" && styles.activeFilterButtonText
                            ]}>Custom Range</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Custom Calendar Selection UI */}
                    {activeFilter === "custom" && (
                        <View style={styles.calendarContainer}>
                            <View style={styles.dateSelectorRow}>
                                <TouchableOpacity 
                                    style={styles.dateSelector} 
                                    onPress={() => setShowFromPicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={18} color="#0059ff" style={styles.dateIcon} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.dateLabel}>From Date</Text>
                                        <Text style={styles.dateValue}>{formatDateString(fromDate)}</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.dateSelector} 
                                    onPress={() => setShowToPicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={18} color="#0059ff" style={styles.dateIcon} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.dateLabel}>To Date</Text>
                                        <Text style={styles.dateValue}>{formatDateString(toDate)}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* DateTimePickers */}
                            {showFromPicker && (
                                <DateTimePicker
                                    value={fromDate}
                                    mode="date"
                                    display="default"
                                    onChange={onChangeFromDate}
                                    maximumDate={new Date()}
                                />
                            )}

                            {showToPicker && (
                                <DateTimePicker
                                    value={toDate}
                                    mode="date"
                                    display="default"
                                    onChange={onChangeToDate}
                                    minimumDate={fromDate}
                                    maximumDate={new Date()}
                                />
                            )}
                        </View>
                    )}
                </View>

                {/* Results Section */}
                <View style={styles.resultsSection}>
                    <Text style={styles.sectionTitle}>Summary Results</Text>
                    
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#ff6600" />
                            <Text style={styles.loadingText}>Fetching record...</Text>
                        </View>
                    ) : (
                        <View style={styles.cardsContainer}>
                            {/* Room Bookings Stat Card */}
                            <View style={styles.card}>
                                <View style={styles.cardIconContainer}>
                                    <Ionicons name="bed" size={36} color="#e5a910" />
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.cardTitle}>{bookingsCount} Bookings</Text>
                                    <Text style={styles.cardSubtitle}>Total Booked Rooms</Text>
                                </View>
                            </View>

                            {/* Billing Stat Card */}
                            <View style={styles.card}>
                                <View style={styles.cardIconContainer}>
                                    <Ionicons name="receipt" size={36} color="#e5a910" />
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.cardTitle}>₹{totalBillingAmount.toLocaleString("en-IN")} Billing</Text>
                                    <Text style={styles.cardSubtitle}>{billsCount} Bills Generated</Text>
                                </View>
                            </View>

                            {/* Pending Billing Stat Card */}
                            <View style={styles.card}>
                                <View style={styles.cardIconContainer}>
                                    <Ionicons name="time" size={36} color="#e5a910" />
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.cardTitle}>₹{pendingBillingAmount.toLocaleString("en-IN")} Pending</Text>
                                    <Text style={styles.cardSubtitle}>Outstanding Pending Amount</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
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
        paddingBottom: 20,
        backgroundColor: "#ff6600",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: 8,
    },
    refreshButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#fff",
    },
    scrollContent: {
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    filterSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: "#555",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 14,
    },
    filterButtonsRow: {
        flexDirection: "row",
        backgroundColor: "#eef2f5",
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: "transparent",
    },
    activeFilterButton: {
        backgroundColor: "#fff",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#666",
    },
    activeFilterButtonText: {
        color: "#0059ff",
        fontWeight: "800",
    },
    calendarContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#eee",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    dateSelectorRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    dateSelector: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderWidth: 1.5,
        borderColor: "#eef2f5",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginHorizontal: 4,
    },
    dateIcon: {
        marginRight: 8,
    },
    dateLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: "#888",
    },
    dateValue: {
        fontSize: 12,
        fontWeight: "800",
        color: "#333",
        marginTop: 2,
    },
    resultsSection: {
        marginTop: 8,
    },
    loadingContainer: {
        paddingVertical: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
    },
    cardsContainer: {
        flexDirection: "column",
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff6de",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    cardIconContainer: {
        width: 64,
        height: 64,
        backgroundColor: "#fff",
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cardBody: {
        flex: 1,
        justifyContent: "center",
    },
    cardTitle: {
        fontSize: 19,
        fontWeight: "900",
        color: "#333",
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
        lineHeight: 20,
    },
});


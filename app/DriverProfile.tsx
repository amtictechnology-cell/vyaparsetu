import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DriverLoader from '../components/DriverLoader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FullDriver {
    _id: string;
    driverId: string;
    SRnumber: string;
    driverName: string;
    carNumber: string;
    mobileNumber: string;
    address?: {
        city: string;
        state: string;
        pincode: string;
    };
    status: string;
    createdAt: string;
}

interface DriverEntry {
    _id: string;
    entryId: string;
    driverCommisionAmount: number;
    partyAmount: number;
    description: string;
    foodTaken: boolean;
    status: string;
    entryDate: string;
    createdAt: string;
}

export default function DriverProfile() {
    const { driverId } = useLocalSearchParams<{ driverId: string }>();
    const router = useRouter();
    const [driver, setDriver] = useState<FullDriver | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [senderProfile, setSenderProfile] = useState<any>(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    // Entry Form states
    const [entryModalVisible, setEntryModalVisible] = useState(false);
    const [commission, setCommission] = useState("");
    const [partyAmount, setPartyAmount] = useState("");
    const [description, setDescription] = useState("");
    const [foodTaken, setFoodTaken] = useState(false);
    const [status, setStatus] = useState("pending");
    const [savingEntry, setSavingEntry] = useState(false);

    const [entries, setEntries] = useState<DriverEntry[]>([]);
    const [entriesLoading, setEntriesLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
    const [dateFilterModal, setDateFilterModal] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [activeFromDate, setActiveFromDate] = useState("");
    const [activeToDate, setActiveToDate] = useState("");
    
    // DateTimePicker States
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const [fromObj, setFromObj] = useState(new Date());
    const [toObj, setToObj] = useState(new Date());

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    const fetchEntriesData = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`http://192.168.31.192:6000/api/v1/hotel/get-all-driver-entry?driverId=${driverId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok && data.drivers) {
                const sortedEntries = data.drivers.sort((a: any, b: any) => new Date(b.entryDate || b.createdAt).getTime() - new Date(a.entryDate || a.createdAt).getTime());
                setEntries(sortedEntries);
            }
        } catch (error) {
            console.error("Error fetching entries:", error);
        } finally {
            setEntriesLoading(false);
        }
    };

    useEffect(() => {
        const fetchDriverData = async () => {
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
                    const foundDriver = data.drivers.find((d: any) => d._id === driverId || d.driverId === driverId);
                    if (foundDriver) {
                        setDriver(foundDriver);
                    }
                }
            } catch (error) {
                console.error("Error fetching driver profile:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchSenderProfile = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                if (token) {
                    const response = await fetch("http://192.168.31.192:6000/api/v1/user/profile", {
                        method: "GET",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (response.ok && data.user) {
                        setSenderProfile(data.user);
                    }
                }
            } catch (error) {
                console.error("Error fetching sender profile:", error);
            }
        };

        if (driverId) {
            fetchDriverData();
            fetchEntriesData();
            fetchSenderProfile();
        } else {
            setLoading(false);
            setEntriesLoading(false);
        }
    }, [driverId]);

    const handleAddEntry = async () => {
        if (!commission || !partyAmount) {
            Alert.alert("Error", "Please fill required amounts");
            return;
        }

        setSavingEntry(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch("http://192.168.31.192:6000/api/v1/hotel/add-driver-entry", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    driverId: driverId,
                    driverCommisionAmount: Number(commission),
                    partyAmount: Number(partyAmount),
                    description,
                    foodTaken,
                    status
                })
            });

            const data = await response.json();
            if (response.ok) {
                Alert.alert("Success", "Driver entry added successfully!");
                setEntryModalVisible(false);
                setCommission("");
                setPartyAmount("");
                setDescription("");
                setFoodTaken(false);
                setStatus("pending");
                // Refresh list
                fetchEntriesData();
            } else {
                Alert.alert("Error", data.message || "Failed to add entry");
            }
        } catch (error) {
            console.error("Error adding entry:", error);
            Alert.alert("Error", "Network error. Please try again.");
        } finally {
            setSavingEntry(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        const d = new Date(dateString);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatDisplayDate = (dString: string) => {
        if (!dString) return "";
        const parts = dString.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dString;
    };

    const handleFromDateChange = (event: any, selectedDate?: Date) => {
        setShowFromPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setFromObj(selectedDate);
            setFromDate(selectedDate.toISOString().split('T')[0]);
        }
    };

    const handleToDateChange = (event: any, selectedDate?: Date) => {
        setShowToPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setToObj(selectedDate);
            setToDate(selectedDate.toISOString().split('T')[0]);
        }
    };

    const applyDateFilter = () => {
        setActiveFromDate(fromDate);
        setActiveToDate(toDate);
        setDateFilterModal(false);
    };

    const clearDateFilter = () => {
        setFromDate("");
        setToDate("");
        setActiveFromDate("");
        setActiveToDate("");
        setDateFilterModal(false);
    };

    const generateAndSharePDF = async () => {
        try {
            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
                            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0c831f; padding-bottom: 20px; }
                            .logo { font-size: 32px; font-weight: bold; color: #0c831f; letter-spacing: 1px; }
                            .sub-logo { font-size: 14px; color: #666; font-style: italic; }
                            
                            .info-sections { display: flex; justify-content: space-between; margin-bottom: 30px; }
                            .info-box { width: 48%; padding: 15px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee; }
                            .info-title { font-size: 14px; font-weight: bold; color: #888; text-transform: uppercase; margin-bottom: 10px; }
                            .info-text { font-size: 16px; margin: 4px 0; font-weight: bold; color: #000; }
                            .info-subtext { font-size: 14px; margin: 2px 0; color: #555; }
                            
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                            th { background-color: #0c831f; color: white; padding: 12px; text-align: left; }
                            td { padding: 10px; border-bottom: 1px solid #eee; }
                            tr:nth-child(even) { background-color: #fcfcfc; }
                            
                            .summary-box { margin-top: 30px; padding: 15px; background: #e8f5e9; border-radius: 8px; text-align: right; }
                            .summary-text { font-size: 18px; font-weight: bold; color: #0c831f; }
                            
                            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                            .status-completed { color: #0c831f; font-weight: bold; }
                            .status-pending { color: #f57c00; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">Vyapar Setu</div>
                            <div class="sub-logo">Trusted Business Partner</div>
                        </div>
                        
                        <div class="info-sections">
                            <div class="info-box">
                                <div class="info-title">Driver Details</div>
                                <div class="info-text">${driver?.driverName || "N/A"}</div>
                                <div class="info-subtext">Mobile: +91 ${driver?.mobileNumber || "N/A"}</div>
                                <div class="info-subtext">Car Nu: ${driver?.carNumber || "N/A"}</div>
                            </div>
                            
                            <div class="info-box">
                                <div class="info-title">Report Generated By</div>
                                <div class="info-text">${senderProfile?.businessName || "Your Business"}</div>
                                <div class="info-subtext">Name: ${senderProfile?.name || "N/A"}</div>
                                <div class="info-subtext">Mobile: +91 ${senderProfile?.mobileNo || "N/A"}</div>
                            </div>
                        </div>
                        
                        <h3 style="color: #444; margin-bottom: 10px;">Commission Entries Report</h3>
                        
                        <table>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Commission</th>
                                <th>Party Amount</th>
                                <th>Status</th>
                            </tr>
                            ${filteredEntries.map(entry => `
                                <tr>
                                    <td>${formatDate(entry.entryDate || entry.createdAt)}</td>
                                    <td>${entry.description || '-'} <br><span style="font-size:11px; color:#888;">${entry.foodTaken ? 'Included Food' : 'No Food'}</span></td>
                                    <td style="font-weight: bold; color: #0c831f;">&#8377;${entry.driverCommisionAmount}</td>
                                    <td style="font-weight: bold;">&#8377;${entry.partyAmount}</td>
                                    <td class="${entry.status === 'completed' ? 'status-completed' : 'status-pending'}">${entry.status.toUpperCase()}</td>
                                </tr>
                            `).join('')}
                        </table>
                        
                        <div class="summary-box">
                            <span class="summary-text">Total Commission: &#8377;${filteredEntries.reduce((sum, e) => sum + e.driverCommisionAmount, 0)}</span>
                            <br>
                            <span style="font-size: 14px; color: #555; margin-top: 5px; display: inline-block;">Total Party Amount: &#8377;${filteredEntries.reduce((sum, e) => sum + e.partyAmount, 0)}</span>
                        </div>
                        
                        <div class="footer">
                            Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} by Vyapar Setu App
                        </div>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { 
                    mimeType: 'application/pdf', 
                    dialogTitle: 'Share Driver Report', 
                    UTI: 'com.adobe.pdf' 
                });
            } else {
                Alert.alert("Error", "Your device does not support sharing files directly.");
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            Alert.alert("Error", "Could not generate or share the PDF report.");
        }
    };

    const filteredEntries = entries.filter(entry => {
        // Status match
        if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
        
        // Date match (naive DD/MM/YYYY or YYYY-MM-DD check)
        if (activeFromDate && activeToDate) {
            const eDate = new Date(entry.entryDate || entry.createdAt);
            const fDate = new Date(activeFromDate);
            const tDate = new Date(activeToDate);
            if (!isNaN(fDate.getTime()) && !isNaN(tDate.getTime())) {
                tDate.setHours(23, 59, 59, 999);
                if (eDate < fDate || eDate > tDate) return false;
            }
        }
        return true;
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <DriverLoader text="Loading Profile..." />
            </SafeAreaView>
        );
    }

    if (!driver) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
                <Text style={styles.errorText}>Driver Not Found</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Driver Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.profileCard}>
                    <View style={styles.headerRow}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>{driver.driverName?.charAt(0)?.toUpperCase() || 'D'}</Text>
                            <View style={[styles.statusIndicator, { backgroundColor: driver.status === 'active' ? '#0c831f' : '#f44336' }]} />
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.driverName}>{driver.driverName || "Unknown"}</Text>
                            <View style={styles.quickActions}>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Ionicons name="call" size={18} color="#0c831f" />
                                    <Text style={styles.actionText}>Call</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.actionBtn}
                                    onPress={() => {
                                        setGeneratingPDF(true);
                                        generateAndSharePDF().finally(() => setGeneratingPDF(false));
                                    }}
                                    disabled={generatingPDF}
                                >
                                    {generatingPDF ? (
                                        <ActivityIndicator size="small" color="#25D366" />
                                    ) : (
                                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                                    )}
                                    <Text style={styles.actionText}>Msg</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Expand/Collapse Toggle Button */}
                    <TouchableOpacity style={styles.toggleBtn} onPress={toggleExpand} activeOpacity={0.7}>
                        <Text style={styles.toggleText}>{isExpanded ? "Hide Details" : "View Details"}</Text>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#0c831f" />
                    </TouchableOpacity>

                    {isExpanded && (
                        <View style={styles.expandedContent}>
                            <View style={styles.infoDivider} />

                            <View style={styles.infoList}>
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIconContainer}>
                                        <Ionicons name="phone-portrait-outline" size={20} color="#555" />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Mobile Number</Text>
                                        <Text style={styles.infoValue}>+91 {driver.mobileNumber}</Text>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <View style={styles.infoIconContainer}>
                                        <Ionicons name="car-sport-outline" size={20} color="#555" />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Car & SR Number</Text>
                                        <Text style={styles.infoValue}>{driver.carNumber || "N/A"}  •  SR: {driver.SRnumber || "N/A"}</Text>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <View style={styles.infoIconContainer}>
                                        <Ionicons name="location-outline" size={20} color="#555" />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Location</Text>
                                        <Text style={styles.infoValue}>
                                            {driver.address?.city ? `${driver.address.city}` : "N/A"}
                                            {driver.address?.state ? `, ${driver.address.state}` : ""}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Entries List Header */}
                <View style={styles.entriesHeader}>
                    <View style={styles.entriesTitleRow}>
                        <Text style={styles.entriesTitle}>Recent Entries</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{filteredEntries.length}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => setDateFilterModal(true)} style={styles.filterIconBtn}>
                        <Ionicons name="calendar-outline" size={20} color={activeFromDate ? "#0c831f" : "#555"} />
                        {activeFromDate && <View style={styles.filterActiveDot} />}
                    </TouchableOpacity>
                </View>

                {/* Filters */}
                <View style={styles.filterRow}>
                    <TouchableOpacity 
                        style={[styles.filterBtn, statusFilter === 'all' && styles.filterBtnActive]}
                        onPress={() => setStatusFilter('all')}
                    >
                        <Text style={[styles.filterBtnText, statusFilter === 'all' && styles.filterBtnTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterBtn, statusFilter === 'completed' && styles.filterBtnActive]}
                        onPress={() => setStatusFilter('completed')}
                    >
                        <Text style={[styles.filterBtnText, statusFilter === 'completed' && styles.filterBtnTextActive]}>Completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterBtn, statusFilter === 'pending' && styles.filterBtnActive]}
                        onPress={() => setStatusFilter('pending')}
                    >
                        <Text style={[styles.filterBtnText, statusFilter === 'pending' && styles.filterBtnTextActive]}>Pending</Text>
                    </TouchableOpacity>
                </View>

                {/* Fetching State */}
                {entriesLoading ? (
                    <DriverLoader text="Loading Entries..." small={true} />
                ) : filteredEntries.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No entries found</Text>
                    </View>
                ) : (
                    <View style={styles.entriesList}>
                        {filteredEntries.map((entry) => (
                            <View key={entry._id} style={styles.entryCard}>
                                <View style={styles.entryHeader}>
                                    <View style={styles.entryDateContainer}>
                                        <Ionicons name="calendar" size={12} color="#666" />
                                        <Text style={styles.entryDate}>{formatDate(entry.entryDate || entry.createdAt)}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: entry.status === 'completed' ? '#e8f5e9' : '#fff3e0' }]}>
                                        <Text style={[styles.statusText, { color: entry.status === 'completed' ? '#0c831f' : '#f57c00' }]}>
                                            {entry.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.entryDescription} numberOfLines={1}>
                                    {entry.description || "No description provided"}
                                </Text>

                                <View style={styles.amountsRow}>
                                    <View style={styles.amountBox}>
                                        <Text style={styles.amountLabel}>Commission</Text>
                                        <Text style={styles.amountValueGreen}>₹{entry.driverCommisionAmount}</Text>
                                    </View>
                                    <View style={styles.amountDivider} />
                                    <View style={styles.amountBox}>
                                        <Text style={styles.amountLabel}>Party Amount</Text>
                                        <Text style={styles.amountValue}>₹{entry.partyAmount}</Text>
                                        <Text style={styles.foodTextMini}>
                                            {entry.foodTaken ? "Included Food" : "Without Food"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity 
                style={styles.fab}
                onPress={() => setEntryModalVisible(true)}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Entry Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={entryModalVisible}
                onRequestClose={() => setEntryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Entry</Text>
                            <TouchableOpacity onPress={() => setEntryModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Driver Commission</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter commission amount"
                                    keyboardType="numeric"
                                    value={commission}
                                    onChangeText={setCommission}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Party Amount</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter party amount"
                                    keyboardType="numeric"
                                    value={partyAmount}
                                    onChangeText={setPartyAmount}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                    placeholder="e.g. Airport drop"
                                    multiline
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Food Status</Text>
                                <View style={styles.radioRow}>
                                    <TouchableOpacity 
                                        style={styles.radioOption} 
                                        onPress={() => setFoodTaken(true)}
                                    >
                                        <View style={styles.radioOuter}>
                                            {foodTaken && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={styles.radioText}>Included Food</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.radioOption} 
                                        onPress={() => setFoodTaken(false)}
                                    >
                                        <View style={styles.radioOuter}>
                                            {!foodTaken && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={styles.radioText}>Without Food</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Status</Text>
                                <View style={styles.radioRow}>
                                    <TouchableOpacity 
                                        style={styles.radioOption} 
                                        onPress={() => setStatus("pending")}
                                    >
                                        <View style={styles.radioOuter}>
                                            {status === "pending" && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={styles.radioText}>Pending</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.radioOption} 
                                        onPress={() => setStatus("completed")}
                                    >
                                        <View style={styles.radioOuter}>
                                            {status === "completed" && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={styles.radioText}>Completed</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.saveBtn, (!commission || !partyAmount) ? styles.saveBtnDisabled : {}]} 
                                onPress={handleAddEntry}
                                disabled={savingEntry || !commission || !partyAmount}
                            >
                                {savingEntry ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Entry</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Date Filter Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={dateFilterModal}
                onRequestClose={() => setDateFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.dateModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter by Date</Text>
                            <TouchableOpacity onPress={() => setDateFilterModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.dateHintText}>Select dates from calendar (DD/MM/YYYY).</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>From Date</Text>
                            <TouchableOpacity 
                                style={styles.input}
                                onPress={() => setShowFromPicker(true)}
                            >
                                <Text style={{ color: fromDate ? "#000" : "#999", fontSize: 16 }}>
                                    {fromDate ? formatDisplayDate(fromDate) : "Select from date"}
                                </Text>
                            </TouchableOpacity>
                            {showFromPicker && (
                                <DateTimePicker
                                    value={fromObj}
                                    mode="date"
                                    display="default"
                                    onChange={handleFromDateChange}
                                />
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>To Date</Text>
                            <TouchableOpacity 
                                style={styles.input}
                                onPress={() => setShowToPicker(true)}
                            >
                                <Text style={{ color: toDate ? "#000" : "#999", fontSize: 16 }}>
                                    {toDate ? formatDisplayDate(toDate) : "Select to date"}
                                </Text>
                            </TouchableOpacity>
                            {showToPicker && (
                                <DateTimePicker
                                    value={toObj}
                                    mode="date"
                                    display="default"
                                    onChange={handleToDateChange}
                                />
                            )}
                        </View>

                        <View style={styles.dateFilterActions}>
                            <TouchableOpacity style={styles.clearBtn} onPress={clearDateFilter}>
                                <Text style={styles.clearBtnText}>Clear filter</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyFilterBtn} onPress={applyDateFilter}>
                                <Text style={styles.applyFilterBtnText}>Apply Filter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f6f8",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f4f6f8",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
        fontWeight: "600",
    },
    errorText: {
        fontSize: 18,
        color: "#333",
        fontWeight: "800",
        marginTop: 16,
        marginBottom: 24,
    },
    backBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: "#0c831f",
        borderRadius: 8,
    },
    backBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
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
    headerBackButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#000",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileCard: {
        backgroundColor: "#fff",
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
    },
    avatarContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#e8f5e9",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#0c831f",
        position: "relative",
        marginRight: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: "900",
        color: "#0c831f",
    },
    statusIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        position: "absolute",
        bottom: 0,
        right: 0,
        borderWidth: 2,
        borderColor: "#fff",
    },
    headerInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 22,
        fontWeight: "900",
        color: "#000",
        marginBottom: 8,
    },
    quickActions: {
        flexDirection: "row",
        gap: 12,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#333",
    },
    toggleBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        marginTop: 4,
        backgroundColor: "#f9f9f9",
        borderRadius: 12,
        gap: 6,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0c831f",
    },
    expandedContent: {
        marginTop: 16,
        overflow: "hidden",
    },
    infoDivider: {
        height: 1,
        backgroundColor: "#eee",
        marginBottom: 20,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0c831f',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#000',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#eee',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#000',
        backgroundColor: '#fafafa',
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#0c831f',
    },
    radioText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#444',
    },
    saveBtn: {
        backgroundColor: '#0c831f',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    saveBtnDisabled: {
        backgroundColor: '#ccc',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    infoList: {
        gap: 20,
    },
    entriesHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    entriesTitleRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    filterIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        position: 'relative',
    },
    filterActiveDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0c831f',
        borderWidth: 1,
        borderColor: '#fff',
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "transparent",
    },
    filterBtnActive: {
        backgroundColor: "#e8f5e9",
        borderColor: "#0c831f",
    },
    filterBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#666",
    },
    filterBtnTextActive: {
        color: "#0c831f",
    },
    dateModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    dateHintText: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
        marginBottom: 16,
    },
    dateFilterActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
        marginBottom: 20,
    },
    clearBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    clearBtnText: {
        color: "#f44336",
        fontSize: 15,
        fontWeight: "700",
    },
    applyFilterBtn: {
        backgroundColor: "#0c831f",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    applyFilterBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
    entriesTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: "#000",
    },
    badge: {
        backgroundColor: "#0c831f",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8,
    },
    badgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 40,
        paddingBottom: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 15,
        color: "#999",
        fontWeight: "600",
    },
    entriesList: {
        gap: 2,
    },
    entryCard: {
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 12,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    entryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    entryDateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    entryDate: {
        fontSize: 12,
        color: "#555",
        fontWeight: "700",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "800",
    },
    entryDescription: {
        fontSize: 13,
        color: "#444",
        fontWeight: "500",
        lineHeight: 18,
        marginBottom: 10,
    },
    amountsRow: {
        flexDirection: "row",
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        padding: 10,
    },
    amountBox: {
        flex: 1,
    },
    amountDivider: {
        width: 1,
        backgroundColor: "#e0e0e0",
        marginHorizontal: 12,
    },
    amountLabel: {
        fontSize: 11,
        color: "#888",
        fontWeight: "700",
        marginBottom: 2,
    },
    amountValue: {
        fontSize: 15,
        color: "#000",
        fontWeight: "900",
    },
    amountValueGreen: {
        fontSize: 15,
        color: "#0c831f",
        fontWeight: "900",
    },
    foodTextMini: {
        fontSize: 10,
        color: "#777",
        fontWeight: "600",
        marginTop: 2,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    infoIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#f9f9f9",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    infoLabel: {
        fontSize: 12,
        color: "#888",
        fontWeight: "600",
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        color: "#222",
        fontWeight: "700",
    },
});

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
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
    View
} from "react-native";
import StaffLoader from "../components/StaffLoader";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface KhatabookEntry {
    _id: string;
    staffId: string;
    attendance: string;
    dailySalary: number;
    date: string;
    bonus?: number;
    deduction?: number;
}

interface StaffPayableSalary {
    month: string;
    year: number;
    totalPayableSalary: number;
    presentDays: number;
    paidLeaveDays: number;
    _id: string;
}

interface FullStaff {
    _id: string;
    staffId: string;
    firstName: string;
    lastName: string;
    mobile: string;
    adharNumber: string;
    salary: number;
    role: string;
    DOB: string;
    email?: string;
    profileImage?: string;
    IdProofImage?: string | string[];
    address: {
        city: string;
    };
    createdAt: string;
    staffPayableSalary?: StaffPayableSalary[];
    totalPaidToStaff?: number;
    totalTakenFromStaffUser?: number;
}

interface Transaction {
    _id: string;
    staffId: string;
    amount: number;
    type: 'give' | 'take';
    description?: string;
    date?: string;
    paymentScreenshot?: string;
    createdAt: string;
}

interface GroupedMonth {
    month: number;
    year: number;
    monthName: string;
    dateRangeText: string;
    totalSalary: number;
    transactions: (Transaction & { due: number })[];
}

export default function StaffProfile() {
    const { staffId } = useLocalSearchParams<{ staffId: string }>();
    const router = useRouter();
    const [staff, setStaff] = useState<FullStaff | null>(null);
    const [khatabookData, setKhatabookData] = useState<KhatabookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isKhatabookLoading, setIsKhatabookLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // New transaction & calendar states
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transSummary, setTransSummary] = useState({ totalGiven: 0, totalTaken: 0, netBalance: 0 });
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // Calendar navigation states
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0 - 11
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Transaction action modal states
    const [transModalVisible, setTransModalVisible] = useState(false);
    const [transType, setTransType] = useState<'give' | 'take'>('give');
    const [transAmount, setTransAmount] = useState("");
    const [transDesc, setTransDesc] = useState("");
    const [transDate, setTransDate] = useState("");
    const [transScreenshot, setTransScreenshot] = useState<string | null>(null);
    const [submittingTrans, setSubmittingTrans] = useState(false);

    const renderAttendanceCalendar = () => {
        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        const fullMonthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        
        const days = getCalendarDays(currentMonth, currentYear);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Navigate Month
        const handlePrevMonth = () => {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(prev => prev - 1);
            } else {
                setCurrentMonth(prev => prev - 1);
            }
        };

        const handleNextMonth = () => {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(prev => prev + 1);
            } else {
                setCurrentMonth(prev => prev + 1);
            }
        };

        // Calculations for active month salary based on attendance
        const monthlyEntries = khatabookData.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth;
        });

        const presentCount = monthlyEntries.filter(e => e.attendance === 'present').length;
        const halfDayCount = monthlyEntries.filter(e => e.attendance === 'halfday').length;
        const absentCount = monthlyEntries.filter(e => e.attendance === 'absent').length;
        const paidLeaveCount = monthlyEntries.filter(e => e.attendance === 'paidleave' || e.attendance === 'leave').length;

        const dailyRate = staff ? (staff.salary / daysInMonth) : 0;
        const payableDays = presentCount + paidLeaveCount + (halfDayCount * 0.5);
        const calculatedSalary = payableDays * dailyRate;

        const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

        return (
            <View style={styles.calendarCard}>
                {/* Header: Navigation */}
                <View style={styles.calendarNavHeader}>
                    <TouchableOpacity onPress={handlePrevMonth} style={styles.calendarNavBtn}>
                        <Ionicons name="chevron-back" size={22} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.calendarNavTitle}>
                        Attendance  {monthNames[currentMonth]} {currentYear}
                    </Text>
                    <TouchableOpacity onPress={handleNextMonth} style={styles.calendarNavBtn}>
                        <Ionicons name="chevron-forward" size={22} color="#000" />
                    </TouchableOpacity>
                </View>

                {/* Weekdays Header */}
                <View style={styles.weekdaysRow}>
                    {weekdays.map((wd, idx) => (
                        <Text key={idx} style={styles.weekdayText}>{wd}</Text>
                    ))}
                </View>

                {/* Grid */}
                <View style={styles.calendarGrid}>
                    {days.map((item, idx) => {
                        const att = item.isCurrentMonth ? getAttendanceForDate(item.date) : null;
                        const status = att ? att.attendance : null;
                        const statusNormalized = status ? status.toLowerCase() : '';

                        const isPresent = statusNormalized === 'present';
                        const isAbsent = statusNormalized === 'absent';
                        const isHalfDay = statusNormalized === 'halfday';
                        const isLeave = statusNormalized === 'paidleave' || statusNormalized === 'leave';

                        // Custom styling for day cell
                        let cellBg = 'transparent';
                        let textColor = '#333';
                        let isSpecial = false;

                        if (isPresent) {
                            cellBg = '#cbf3db'; // Mint green
                            textColor = '#333';
                        } else if (isAbsent) {
                            cellBg = '#ffe8e8'; // Soft pink
                            textColor = '#333';
                        } else if (isLeave) {
                            cellBg = '#f3f4f6'; // Soft gray
                            textColor = '#333';
                        } else if (isHalfDay) {
                            isSpecial = true;
                        }

                        if (!item.isCurrentMonth) {
                            textColor = '#ccc';
                        }

                        return (
                            <View key={idx} style={styles.calendarDayCell}>
                                {isSpecial ? (
                                    <View style={styles.halfDayCellContainer}>
                                        <View style={{ flex: 1, backgroundColor: '#ffe8e8' }} />
                                        <View style={{ flex: 1, backgroundColor: '#cbf3db' }} />
                                        <View style={styles.dayTextOverlay}>
                                            <Text style={[styles.dayText, { color: '#00b4d8', fontWeight: 'bold' }]}>
                                                {item.day}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={[styles.dayCircle, { backgroundColor: cellBg }]}>
                                        <Text style={[styles.dayText, { color: textColor }]}>
                                            {item.day}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Custom Legend */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendIndicator, { backgroundColor: '#cbf3db', borderColor: '#8deab1', borderWidth: 1 }]} />
                        <Text style={styles.legendText}>Present</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendIndicator, { backgroundColor: '#ffe8e8', borderColor: '#ffb3b3', borderWidth: 1 }]} />
                        <Text style={styles.legendText}>Absent</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={styles.legendIndicatorHalfDay}>
                            <View style={{ flex: 1, backgroundColor: '#ffe8e8' }} />
                            <View style={{ flex: 1, backgroundColor: '#cbf3db' }} />
                        </View>
                        <Text style={styles.legendText}>Half Day</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendIndicator, { backgroundColor: '#f3f4f6', borderColor: '#cbd5e1', borderWidth: 1 }]} />
                        <Text style={styles.legendText}>Paid Leave</Text>
                    </View>
                </View>

                {/* Simplified Net Paybill display */}
                {staff && (
                    <View style={styles.netPaybillLine}>
                        <Text style={styles.netPaybillLabel}>Net Paybill ({monthNames[currentMonth]}):</Text>
                        <Text style={styles.netPaybillValue}>₹{Math.round(calculatedSalary)}</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderTransactionsLedger = () => {
        const grouped = getGroupedTransactions();

        return (
            <View style={[styles.khatabookContainer, { marginTop: 16 }]}>
                <View style={styles.khatabookHeader}>
                    <View style={styles.detailsHeaderLeft}>
                        <Ionicons name="cash-outline" size={24} color="#0c831f" />
                        <Text style={styles.detailsHeaderText}>Staff Financial Balance</Text>
                    </View>
                </View>

                {/* Transactions Financial Summary */}
                <View style={styles.khatabookSummary}>
                    <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
                        <Text style={[styles.summaryLabel, { color: '#0c831f' }]}>Total Given</Text>
                        <Text style={[styles.summaryValue, { color: '#0c831f' }]}>₹{transSummary.totalGiven}</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: '#ffebee' }]}>
                        <Text style={[styles.summaryLabel, { color: '#d32f2f' }]}>Total Taken</Text>
                        <Text style={[styles.summaryValue, { color: '#d32f2f' }]}>₹{transSummary.totalTaken}</Text>
                    </View>
                </View>

                <View style={styles.netBalanceBox}>
                    <View style={styles.netBalanceRow}>
                        <Text style={styles.netBalanceLabel}>Net Balance:</Text>
                        <Text style={[
                            styles.netBalanceValue,
                            { color: transSummary.netBalance >= 0 ? '#0284c7' : '#e65100' }
                        ]}>
                            ₹{transSummary.netBalance}
                        </Text>
                    </View>
                    <Text style={styles.netBalanceSubText}>
                        {transSummary.netBalance >= 0 
                            ? "Staff has our money (advanced)" 
                            : "We need to pay the staff"}
                    </Text>
                </View>

                {/* Beautiful transaction list matching the user screenshot */}
                <View style={styles.ledgerListContainer}>
                    {grouped.length === 0 ? (
                        <View style={styles.emptyLedger}>
                            <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No transaction records found</Text>
                        </View>
                    ) : (
                        grouped.map((group, gIdx) => (
                            <View key={gIdx} style={styles.monthGroupBlock}>
                                <View style={styles.monthGroupHeaderRow}>
                                    <View>
                                        <Text style={styles.monthGroupRangeText}>{group.dateRangeText}</Text>
                                        <Text style={styles.monthGroupTotalText}>total: ₹{group.totalSalary}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.viewSummaryBtn}>
                                        <Text style={styles.viewSummaryBtnText}>VIEW SUMMARY</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Payments Table Headers */}
                                <View style={styles.ledgerColumnHeaderRow}>
                                    <Text style={[styles.columnHeaderText, { flex: 3 }]}>PAYMENTS</Text>
                                    <Text style={[styles.columnHeaderText, { flex: 1.2, textAlign: 'center' }]}>DUE</Text>
                                    <Text style={[styles.columnHeaderText, { flex: 1.2, textAlign: 'center' }]}>PAID</Text>
                                </View>

                                {/* Transaction Rows */}
                                {group.transactions.map((t, tIdx) => (
                                    <View key={tIdx} style={styles.ledgerCardRow}>
                                        <View style={styles.ledgerCardLeft}>
                                            <Text style={styles.ledgerCardDateText}>{formatTransDate(t.date)}</Text>
                                            <Text style={styles.ledgerCardModeText} numberOfLines={1}>
                                                Payment Mode : {t.description || (t.type === 'give' ? 'Cash' : 'Refund')}
                                            </Text>
                                        </View>

                                        {/* DUE amount (Rose/Red color) */}
                                        <View style={styles.ledgerCardMiddle}>
                                            <Text style={styles.ledgerCardDueText}>₹{t.due}</Text>
                                        </View>

                                        {/* PAID amount (Green color) */}
                                        <View style={styles.ledgerCardRight}>
                                            <Text style={styles.ledgerCardPaidText}>₹{t.amount}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </View>
        );
    };

    const renderTransactionModal = () => {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={transModalVisible}
                onRequestClose={() => setTransModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: transType === 'give' ? '#0c831f' : '#d32f2f' }]}>
                                {transType === 'give' ? 'Give Money (पेमेन्ट दिया)' : 'Take Money (पेमेन्ट लिया)'}
                            </Text>
                            <TouchableOpacity onPress={() => setTransModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.form}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Amount (राशि) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter amount (जैसे: 5000)"
                                        keyboardType="numeric"
                                        value={transAmount}
                                        onChangeText={setTransAmount}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Description (विवरण)</Text>
                                    <TextInput
                                        style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                                        placeholder="Enter description (जैसे: Advance salary for May)"
                                        multiline
                                        value={transDesc}
                                        onChangeText={setTransDesc}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Date (तारीख) - YYYY-MM-DD</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="YYYY-MM-DD"
                                        value={transDate}
                                        onChangeText={setTransDate}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Payment Screenshot / Receipt</Text>
                                    <TouchableOpacity style={styles.imagePicker} onPress={pickTransImage}>
                                        {transScreenshot ? (
                                            <Image source={{ uri: transScreenshot }} style={styles.previewImg} />
                                        ) : (
                                            <View style={{ alignItems: 'center' }}>
                                                <Ionicons name="camera-outline" size={28} color="#666" />
                                                <Text style={styles.imagePickerText}>Upload Image (कैमरा / गैलरी)</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity 
                                    style={[
                                        styles.saveButton, 
                                        { backgroundColor: transType === 'give' ? '#0c831f' : '#d32f2f' }
                                    ]} 
                                    onPress={handleSubmitTransaction}
                                    disabled={submittingTrans}
                                >
                                    {submittingTrans ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Submit Transaction</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    const getMonthlySalaryDue = (month: number, year: number) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthlyEntries = khatabookData.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getFullYear() === year && entryDate.getMonth() === month;
        });

        const presentCount = monthlyEntries.filter(e => e.attendance === 'present').length;
        const halfDayCount = monthlyEntries.filter(e => e.attendance === 'halfday').length;
        const paidLeaveCount = monthlyEntries.filter(e => e.attendance === 'paidleave' || e.attendance === 'leave').length;

        const dailyRate = staff ? (staff.salary / daysInMonth) : 0;
        const payableDays = presentCount + paidLeaveCount + (halfDayCount * 0.5);
        const calculatedSalary = payableDays * dailyRate;

        return calculatedSalary > 0 ? Math.round(calculatedSalary) : (staff ? staff.salary : 0);
    };

    const formatTransDate = (dateStr?: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthsShort[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        return `${day} ${month} ${year}`;
    };

    const getGroupedTransactions = () => {
        if (!staff) return [];

        const monthNamesFull = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // Group transactions by month and year
        const groups: { [key: string]: Transaction[] } = {};
        transactions.forEach(t => {
            if (!t.date) return;
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(t);
        });

        const groupedList: GroupedMonth[] = [];

        // Sort keys descending (latest month first)
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            return yB !== yA ? yB - yA : mB - mA;
        });

        sortedKeys.forEach(key => {
            const [year, month] = key.split('-').map(Number);
            
            // Sort transactions ascending chronologically
            const sortedTrans = groups[key].sort((a, b) => {
                const dA = a.date ? new Date(a.date).getTime() : 0;
                const dB = b.date ? new Date(b.date).getTime() : 0;
                return dA - dB;
            });

            const totalSalary = getMonthlySalaryDue(month, year);

            // Compute running dues from bottom to top
            let currentDue = totalSalary;
            const transWithDue: (Transaction & { due: number })[] = [];

            for (let i = sortedTrans.length - 1; i >= 0; i--) {
                const t = sortedTrans[i];
                if (t.type === 'give') {
                    currentDue -= t.amount;
                } else if (t.type === 'take') {
                    currentDue += t.amount;
                }
                transWithDue[i] = {
                    ...t,
                    due: currentDue
                };
            }

            // Build Date Range Text
            // If they joined in this specific month/year, range starts from joining day
            let startDay = 1;
            if (staff.createdAt) {
                const joinedDate = new Date(staff.createdAt);
                if (joinedDate.getFullYear() === year && joinedDate.getMonth() === month) {
                    startDay = joinedDate.getDate();
                }
            }
            const endDay = new Date(year, month + 1, 0).getDate();
            const startDayStr = String(startDay).padStart(2, '0');
            const endDayStr = String(endDay).padStart(2, '0');
            const dateRangeText = `${startDayStr} ${monthNamesFull[month]} - ${endDayStr} ${monthNamesFull[month]}`;

            groupedList.push({
                month,
                year,
                monthName: monthNamesFull[month],
                dateRangeText,
                totalSalary,
                transactions: transWithDue
            });
        });

        return groupedList;
    };

    const toggleDetails = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDetails(!showDetails);
    };

    // Calendar & Math Helpers
    const getCalendarDays = (month: number, year: number) => {
        const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Adjust Monday to 0

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Previous month filler days
        for (let i = startOffset - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            days.push({
                day: d,
                isCurrentMonth: false,
                date: new Date(year, month - 1, d)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            });
        }

        // Next month filler days
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const getAttendanceForDate = (date: Date) => {
        const targetStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        return khatabookData.find(entry => {
            if (!entry.date) return false;
            
            let entryStr = "";
            // Check if it's an ISO timestamp or date-only string
            if (entry.date.includes("T") || entry.date.includes(":") || entry.date.includes("Z")) {
                const d = new Date(entry.date);
                entryStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else {
                // If it is YYYY-MM-DD date-only string
                const parts = entry.date.split('-');
                if (parts.length === 3) {
                    entryStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else {
                    const d = new Date(entry.date);
                    entryStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }
            }
            return targetStr === entryStr;
        });
    };

    // Transaction Actions & Uploads
    const openTransModal = (type: 'give' | 'take') => {
        setTransType(type);
        setTransAmount("");
        setTransDesc("");
        setTransDate(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
        setTransScreenshot(null);
        setTransModalVisible(true);
    };

    const launchTransCamera = async () => {
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
            setTransScreenshot(result.assets[0].uri);
        }
    };

    const launchTransGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setTransScreenshot(result.assets[0].uri);
        }
    };

    const pickTransImage = async () => {
        Alert.alert(
            "Select Photo Source",
            "Choose how you want to upload the photo",
            [
                { text: "Camera", onPress: launchTransCamera },
                { text: "Gallery", onPress: launchTransGallery },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleSubmitTransaction = async () => {
        if (!transAmount) {
            Alert.alert("Error", "Please enter an amount");
            return;
        }

        setSubmittingTrans(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const formData = new FormData();
            const sId = staff?.staffId || staff?._id;
            if (!sId) {
                Alert.alert("Error", "Staff ID not found");
                return;
            }

            formData.append("staffId", sId);
            formData.append("amount", transAmount);
            if (transDesc) formData.append("description", transDesc);
            if (transDate) formData.append("date", transDate);

            if (transScreenshot) {
                const uriParts = transScreenshot.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append("paymentScreenshot", {
                    uri: transScreenshot,
                    name: `screenshot.${fileType}`,
                    type: `image/${fileType}`,
                } as any);
            }

            const response = await fetch(`http://192.168.31.192:6000/api/v1/staff/transaction/${transType}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                Alert.alert("Success", "Transaction recorded successfully");
                setTransModalVisible(false);
                fetchTransactions(sId);
                fetchStaffData();
            } else {
                Alert.alert("Error", data.message || "Failed to record transaction");
            }
        } catch (error) {
            console.error("Error submitting transaction:", error);
            Alert.alert("Error", "Server error occurred");
        } finally {
            setSubmittingTrans(false);
        }
    };

    const handleDeleteTransaction = async (transactionId: string) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this transaction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("userToken");
                            const response = await fetch(`http://192.168.31.192:6000/api/v1/staff/transaction/delete`, {
                                method: "DELETE",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                },
                                body: JSON.stringify({ transactionId })
                            });
                            const data = await response.json();
                            if (response.ok) {
                                Alert.alert("Deleted", "Transaction deleted successfully");
                                const sId = staff?.staffId || staff?._id;
                                if (sId) {
                                    fetchTransactions(sId);
                                    fetchStaffData();
                                }
                            } else {
                                Alert.alert("Error", data.message || "Failed to delete transaction");
                            }
                        } catch (error) {
                            console.error("Error deleting transaction:", error);
                            Alert.alert("Error", "Server error occurred");
                        }
                    }
                }
            ]
        );
    };

    const fetchKhatabook = async (sId: string) => {
        setIsKhatabookLoading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`http://192.168.31.192:6000/api/v1/staff/khatabook/${sId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok && data) {
                if (Array.isArray(data.khatabook)) {
                    setKhatabookData(data.khatabook);
                } else if (Array.isArray(data)) {
                    setKhatabookData(data);
                } else if (Array.isArray(data.data)) {
                    setKhatabookData(data.data);
                }
            }
        } catch (error) {
            console.error("Error fetching khatabook:", error);
        } finally {
            setIsKhatabookLoading(false);
        }
    };

    const fetchTransactions = async (sId: string) => {
        setLoadingTransactions(true);
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`http://192.168.31.192:6000/api/v1/staff/transaction/get-transactions?staffId=${sId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok && data) {
                setTransactions(data.transactions || data.data || []);
                setTransSummary(data.summary || { totalGiven: 0, totalTaken: 0, netBalance: 0 });
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoadingTransactions(false);
        }
    };

    const fetchStaffData = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`http://192.168.31.192:6000/api/v1/staff/get-staff?staffId=${staffId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok && data && data.staffList && data.staffList.length > 0) {
                const foundStaff = data.staffList[0];
                setStaff(foundStaff);
                const sId = foundStaff.staffId || foundStaff._id;
                fetchKhatabook(sId);
                fetchTransactions(sId);
            } else {
                console.error("Staff not found in detailed fetch. StaffId:", staffId);
            }
        } catch (error) {
            console.error("Error fetching staff profile:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (staffId) {
            fetchStaffData();
        } else {
            setLoading(false);
        }
    }, [staffId]);

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <StaffLoader />
            </SafeAreaView>
        );
    }

    if (!staff) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
                <Text style={styles.errorText}>Staff Member Not Found</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffb703" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.profileHeader}>
                    <View style={styles.headerTop}>
                        <View style={styles.profileImageContainer}>
                            {staff.profileImage ? (
                                <Image source={{ uri: staff.profileImage }} style={styles.profileImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{staff.firstName?.charAt(0)}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.staffName}>{staff.firstName} {staff.lastName}</Text>
                            <View style={styles.mobileRow}>
                                <Ionicons name="call" size={16} color="#0c831f" />
                                <Text style={styles.staffMobile}>{staff.mobile}</Text>
                            </View>
                            <View style={styles.badgeRow}>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleText}>{staff.role.toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.detailsContainer}>
                    <TouchableOpacity
                        style={styles.detailsHeader}
                        onPress={toggleDetails}
                        activeOpacity={0.7}
                    >
                        <View style={styles.detailsHeaderLeft}>
                            <Ionicons name="information-circle-outline" size={24} color="#0c831f" />
                            <Text style={styles.detailsHeaderText}>Full Professional Details</Text>
                        </View>
                        <Ionicons
                            name={showDetails ? "chevron-up" : "chevron-down"}
                            size={24}
                            color="#999"
                        />
                    </TouchableOpacity>

                    {showDetails && (
                        <View style={styles.collapsibleContent}>
                            <Text style={styles.innerSectionTitle}>Personal Info</Text>
                            <DetailItem icon="card-outline" label="Aadhaar Number" value={staff.adharNumber} />
                            <DetailItem icon="calendar-outline" label="Date of Birth" value={staff.DOB} />
                            <DetailItem icon="mail-outline" label="Email" value={staff.email || "N/A"} />
                            <DetailItem icon="location-outline" label="City" value={staff.address?.city} />

                            <View style={styles.divider} />
                            <Text style={styles.innerSectionTitle}>Employment</Text>
                            <DetailItem icon="cash-outline" label="Monthly Salary" value={`₹${staff.salary}`} color="#0c831f" />
                            <DetailItem icon="calendar-outline" label="Joined Date" value={new Date(staff.createdAt).toLocaleDateString()} />

                            <View style={styles.divider} />
                            <Text style={styles.innerSectionTitle}>Documents</Text>
                            {staff.IdProofImage ? (
                                Array.isArray(staff.IdProofImage) ? (
                                    staff.IdProofImage.map((img, idx) => (
                                        <Image key={idx} source={{ uri: img }} style={[styles.idProofImage, { marginBottom: 10 }]} resizeMode="contain" />
                                    ))
                                ) : (
                                    <Image source={{ uri: staff.IdProofImage }} style={styles.idProofImage} resizeMode="contain" />
                                )
                            ) : (
                                <View style={styles.noDocPlaceholder}>
                                    <Ionicons name="document-outline" size={40} color="#ccc" />
                                    <Text style={styles.noDocText}>No ID Proof Uploaded</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {renderAttendanceCalendar()}

                {/* Render New Grouped Transactions Ledger */}
                {renderTransactionsLedger()}
            </ScrollView>

            {/* Sticky Bottom Give & Take Action Buttons */}
            <View style={styles.stickyBottomBar}>
                <TouchableOpacity 
                    style={[styles.bottomBtn, styles.btnGive]}
                    onPress={() => openTransModal('give')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" />
                    <Text style={styles.bottomBtnText}>Give Money</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.bottomBtn, styles.btnTake]}
                    onPress={() => openTransModal('take')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-down-circle-outline" size={20} color="#fff" />
                    <Text style={styles.bottomBtnText}>Take Money</Text>
                </TouchableOpacity>
            </View>

            {/* Render interactive modal */}
            {renderTransactionModal()}
        </SafeAreaView>
    );
}

const DetailItem = ({ icon, label, value, color = "#666" }: { icon: any, label: string, value: any, color?: string }) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, { color: color === "#666" ? "#333" : color }]}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 12, color: "#666" },
    errorText: { fontSize: 18, color: "#333", marginTop: 16 },
    backBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#ffb703", borderRadius: 8 },
    backBtnText: { fontWeight: "700" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "#ffb703",
    },
    headerBackButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: "900", color: "#000" },
    scrollContent: { paddingBottom: 40 },
    profileHeader: { padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    profileImageContainer: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', backgroundColor: '#f0f0f0', marginRight: 20 },
    profileImage: { width: '100%', height: '100%' },
    avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 32, fontWeight: '900', color: '#ffb703' },
    headerInfo: { flex: 1 },
    staffName: { fontSize: 22, fontWeight: "900", color: "#333" },
    mobileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    staffMobile: { fontSize: 16, color: "#666", fontWeight: "600" },
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    roleBadge: { backgroundColor: "#e8f5e9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    roleText: { color: "#0c831f", fontWeight: "800", fontSize: 10 },
    idBadge: { backgroundColor: "#f0f0f0", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    idBadgeText: { color: "#666", fontWeight: "800", fontSize: 10 },
    detailsContainer: { margin: 16, backgroundColor: '#fff', borderRadius: 16, elevation: 2, overflow: 'hidden' },
    detailsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fcfcfc' },
    detailsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    detailsHeaderText: { fontSize: 16, fontWeight: '800', color: '#333' },
    collapsibleContent: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    innerSectionTitle: { fontSize: 14, fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginTop: 8 },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f8f9fa", justifyContent: "center", alignItems: "center", marginRight: 12 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, color: "#888", fontWeight: "600" },
    infoValue: { fontSize: 15, color: "#333", fontWeight: "700", marginTop: 2 },
    documentLabel: { fontSize: 14, fontWeight: "700", color: "#666", marginBottom: 12 },
    idProofImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#f0f0f0' },
    noDocPlaceholder: { width: '100%', height: 150, borderRadius: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
    noDocText: { color: '#999', marginTop: 8, fontWeight: '600' },

    // Financial Stats
    financialStatsContainer: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4 },
    statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, elevation: 2, gap: 12 },
    statIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    statLabel: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase' },
    statValue: { fontSize: 18, fontWeight: '900' },

    // Monthly Summary
    monthlyList: { padding: 16, gap: 10 },
    monthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#f8f9fa', borderRadius: 16 },
    monthNameCol: { flex: 1 },
    monthText: { fontSize: 16, fontWeight: '800', color: '#333' },
    yearText: { fontSize: 11, color: '#999', fontWeight: '600' },
    monthDetailRow: { flexDirection: 'row', gap: 20 },
    miniStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    miniStatValue: { fontSize: 14, fontWeight: '800', color: '#444' },

    // Khatabook Styles
    khatabookContainer: { margin: 16, marginTop: 0, backgroundColor: '#fff', borderRadius: 24, elevation: 4, overflow: 'hidden' },
    khatabookHeader: { padding: 16, backgroundColor: '#fdfcfb', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    khatabookSummary: { flexDirection: 'row', padding: 16, gap: 12 },
    summaryCard: { flex: 1, padding: 12, borderRadius: 16, elevation: 1 },
    summaryLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, opacity: 0.8 },
    summaryValue: { fontSize: 18, fontWeight: '900' },
    ledgerList: { padding: 16 },
    ledgerHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 },
    emptyLedger: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#bbb', marginTop: 8, fontWeight: '600' },
    ledgerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8f9fa' },
    dateCol: { width: 50, alignItems: 'center' },
    ledgerDay: { fontSize: 18, fontWeight: '900', color: '#333' },
    ledgerMonth: { fontSize: 10, fontWeight: '800', color: '#999', textTransform: 'uppercase' },
    statusCol: { flex: 1, paddingLeft: 12 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusBadgeText: { fontSize: 10, fontWeight: '900' },
    ledgerYear: { fontSize: 10, color: '#bbb', marginTop: 2, fontWeight: '600' },
    amountCol: { alignItems: 'flex-end' },
    ledgerAmount: { fontSize: 16, fontWeight: '800', color: '#0c831f' },
    bgPresent: { backgroundColor: "#e8f5e9" },
    bgAbsent: { backgroundColor: "#ffebee" },
    bgHalfDay: { backgroundColor: "#fff8e1" },
    bgLeave: { backgroundColor: "#e3f2fd" },
    textPresent: { color: "#0c831f" },
    textAbsent: { color: "#d32f2f" },
    textHalfDay: { color: "#b45309" },
    textLeave: { color: "#023e8a" },
    
    // New Calendar, Salary, Transactions & Modals Styles
    calendarCard: {
        margin: 16,
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    calendarNavHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    calendarNavBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
    },
    calendarNavTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#000',
    },
    weekdaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    weekdayText: {
        width: 40,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '700',
        color: '#888',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    calendarDayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        fontSize: 15,
        fontWeight: '600',
    },
    halfDayCellContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        flexDirection: 'row',
        position: 'relative',
    },
    dayTextOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        flexWrap: 'wrap',
        gap: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendIndicator: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    legendIndicatorHalfDay: {
        width: 14,
        height: 14,
        borderRadius: 7,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    legendText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
    },
    netPaybillLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        padding: 16,
        backgroundColor: '#e8f5e9',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#cbf3db',
    },
    netPaybillLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0c831f',
    },
    netPaybillValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0c831f',
    },
    netBalanceBox: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f0f9ff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    netBalanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    netBalanceLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0369a1',
    },
    netBalanceValue: {
        fontSize: 20,
        fontWeight: '900',
    },
    netBalanceSubText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#0284c7',
        marginTop: 4,
    },
    ledgerListContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    monthGroupBlock: {
        marginTop: 16,
    },
    monthGroupHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    monthGroupRangeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    monthGroupTotalText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginTop: 2,
    },
    viewSummaryBtn: {
        paddingVertical: 4,
    },
    viewSummaryBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0284c7',
    },
    ledgerColumnHeaderRow: {
        flexDirection: 'row',
        marginTop: 12,
        marginBottom: 6,
        paddingHorizontal: 4,
    },
    columnHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    ledgerCardRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        height: 64,
        overflow: 'hidden',
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
    },
    ledgerCardLeft: {
        flex: 3,
        paddingLeft: 16,
        justifyContent: 'center',
    },
    ledgerCardDateText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    ledgerCardModeText: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 3,
        fontWeight: '500',
    },
    ledgerCardMiddle: {
        flex: 1.2,
        backgroundColor: '#fff1f2',
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#ffe4e6',
    },
    ledgerCardDueText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#e11d48',
    },
    ledgerCardRight: {
        flex: 1.2,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ledgerCardPaidText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#16a34a',
    },
    stickyBottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -4 },
    },
    bottomBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnGive: {
        backgroundColor: '#0c831f',
    },
    btnTake: {
        backgroundColor: '#d32f2f',
    },
    bottomBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
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
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    input: {
        height: 50,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 14,
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    imagePicker: {
        height: 120,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    previewImg: {
        width: '100%',
        height: '100%',
    },
    imagePickerText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
    },
    saveButton: {
        height: 50,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
});

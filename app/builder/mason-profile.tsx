import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/Config';

export default function MasonProfileScreen() {
  const router = useRouter();
  const { id, name, mobile, address } = useLocalSearchParams<{ id: string, name: string, mobile: string, address: string }>();

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'present' | 'absent' | 'half-day'>('present');
  const [submitting, setSubmitting] = useState(false);

  // Helper functions for Calendar
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const fetchAttendance = async (year: number, month: number) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      // Calculate start and end date for the month (YYYY-MM-DD format)
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const days = getDaysInMonth(year, month);
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${days}`;

      const response = await fetch(`${BASE_URL}/builder/mason/attendance?masonId=${id}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAttendanceRecords(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAttendance(currentDate.getFullYear(), currentDate.getMonth());
    }
  }, [id, currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getAttendanceStatus = (dateStr: string) => {
    // API returns date in ISO string or YYYY-MM-DD
    const record = attendanceRecords.find(r => r.date.startsWith(dateStr));
    return record ? record.status : null;
  };

  const getStatusColor = (status: string | null) => {
    switch(status) {
      case 'present': return '#e8f5e9';
      case 'absent': return '#ffebee';
      case 'half-day': return '#fff3e0';
      default: return '#fff';
    }
  };

  const openAttendanceModal = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentStatus = getAttendanceStatus(dateStr);
    
    setSelectedDateStr(dateStr);
    setSelectedStatus(currentStatus as any || 'present');
    setModalVisible(true);
  };

  const handleMarkAttendance = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const payload = {
        masonId: id,
        date: selectedDateStr,
        status: selectedStatus
      };

      const response = await fetch(`${BASE_URL}/builder/mason/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setModalVisible(false);
        fetchAttendance(currentDate.getFullYear(), currentDate.getMonth());
      } else {
        Alert.alert('Error', data.message || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSummary = () => {
    let present = 0, absent = 0, halfDay = 0;
    attendanceRecords.forEach(r => {
      if (r.status === 'present') present++;
      if (r.status === 'absent') absent++;
      if (r.status === 'half-day') halfDay++;
    });
    return { present, absent, halfDay };
  };

  // Render Calendar Grid
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Empty cells before the 1st of the month
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-start-${i}`} style={styles.calendarCell}>
          <Text style={styles.emptyDayText}>{prevMonthDays - firstDay + i + 1}</Text>
        </View>
      );
    }

    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const status = getAttendanceStatus(dateStr);
      const bgColor = getStatusColor(status);
      const isToday = new Date().toISOString().startsWith(dateStr);

      days.push(
        <TouchableOpacity 
          key={i} 
          style={[
            styles.calendarCell, 
            { backgroundColor: bgColor }
          ]}
          onPress={() => openAttendanceModal(i)}
        >
          <Text style={[
            styles.calendarDayText,
            isToday && !status && styles.todayText
          ]}>{i}</Text>
        </TouchableOpacity>
      );
    }

    // Fill remaining cells for standard 6x7 grid (optional but keeps height consistent)
    const totalCells = days.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <View key={`empty-end-${i}`} style={styles.calendarCell}>
          <Text style={styles.emptyDayText}>{i}</Text>
        </View>
      );
    }

    const summary = getSummary();

    return (
      <View style={styles.calendarContainer}>
        {/* Month Navigation */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            Attendance {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Weekdays */}
        <View style={styles.weekdaysRow}>
          {weekdays.map(day => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {days}
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#e8f5e9', borderColor: '#a5d6a7' }]} />
            <Text style={styles.legendText}>Present: {summary.present}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#ffebee', borderColor: '#ef9a9a' }]} />
            <Text style={styles.legendText}>Absent: {summary.absent}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#fff3e0', borderColor: '#ffcc80' }]} />
            <Text style={styles.legendText}>Half: {summary.halfDay}</Text>
          </View>
        </View>
      </View>
    );
  };



  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mason Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : 'M'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameText}>{name || 'Unknown Mason'}</Text>
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color="#666" />
              <Text style={styles.contactText}>{mobile || 'N/A'}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.contactText}>{address || 'No address provided'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Attendance Calendar</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#ff6600" style={{ marginTop: 40 }} />
        ) : (
          renderCalendar()
        )}
      </ScrollView>

      {/* Mark Attendance Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Attendance</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.selectedDateText}>
              Date: {selectedDateStr ? new Date(selectedDateStr).toLocaleDateString() : ''}
            </Text>

            <View style={styles.statusOptions}>
              <TouchableOpacity 
                style={[
                  styles.statusOptionBtn, 
                  selectedStatus === 'present' && { borderColor: '#0c831f', backgroundColor: '#e8f5e9' }
                ]}
                onPress={() => setSelectedStatus('present')}
              >
                <Ionicons name="checkmark-circle" size={24} color="#0c831f" />
                <Text style={[styles.statusOptionText, { color: '#0c831f' }]}>Present</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.statusOptionBtn, 
                  selectedStatus === 'half-day' && { borderColor: '#ffb703', backgroundColor: '#fff8e1' }
                ]}
                onPress={() => setSelectedStatus('half-day')}
              >
                <Ionicons name="time" size={24} color="#ffb703" />
                <Text style={[styles.statusOptionText, { color: '#ffb703' }]}>Half-Day</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.statusOptionBtn, 
                  selectedStatus === 'absent' && { borderColor: '#d32f2f', backgroundColor: '#ffebee' }
                ]}
                onPress={() => setSelectedStatus('absent')}
              >
                <Ionicons name="close-circle" size={24} color="#d32f2f" />
                <Text style={[styles.statusOptionText, { color: '#d32f2f' }]}>Absent</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleMarkAttendance}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Save Attendance</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    backgroundColor: '#ff6600',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#ff6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10,
  },
  backButton: { padding: 8, marginRight: 12, marginLeft: -8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  content: { flex: 1, padding: 16 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#ff6600' },
  nameText: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  contactText: { fontSize: 13, color: '#666', marginLeft: 6, flex: 1 },
  
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryLabel: { fontSize: 12, color: '#666', fontWeight: '700', marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '900' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 12 },
  
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 18, fontWeight: '500', color: '#000' },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '400',
    color: '#000',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#ddd',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#000',
  },
  emptyDayText: {
    fontSize: 16,
    color: '#ccc',
  },
  todayText: {
    color: '#00bcd4',
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#000',
  },

  recordsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 40,
  },
  emptyText: { fontSize: 14, color: '#888', fontStyle: 'italic', textAlign: 'center', padding: 12 },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recordDate: { fontSize: 15, fontWeight: '600', color: '#333' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  selectedDateText: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 20 },
  statusOptions: {
    gap: 12,
    marginBottom: 24,
  },
  statusOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#fff',
    gap: 12,
  },
  statusOptionText: { fontSize: 16, fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#0059ff',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0059ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' }
});

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/Config';

const UNITS = ["Inch", "Feet", "Cm", "Sq ft", "Sq meter", "Running ft"];

export default function RateListScreen() {
  const router = useRouter();
  const [rateLists, setRateLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workName, setWorkName] = useState('');
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [submitting, setSubmitting] = useState(false);

  const fetchRateLists = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/builder/rate-list/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRateLists(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching rate list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRateLists();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setWorkName('');
    setRate('');
    setUnit(UNITS[0]);
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item._id);
    setWorkName(item.workName);
    setRate(item.rate.toString());
    setUnit(item.unit || UNITS[0]);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Rate Item",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${BASE_URL}/builder/rate-list/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              const data = await response.json();
              if (response.ok && data.success) {
                Alert.alert("Success", "Item deleted successfully");
                fetchRateLists();
              } else {
                Alert.alert("Error", data.message || "Failed to delete item");
              }
            } catch (error) {
              console.error("Error deleting item", error);
              Alert.alert("Error", "Network error. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleSaveItem = async () => {
    if (!workName.trim() || !rate.trim() || !unit) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const endpoint = editingId 
        ? `${BASE_URL}/builder/rate-list/${editingId}`
        : `${BASE_URL}/builder/rate-list/`;
        
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workName: workName.trim(),
          rate: Number(rate),
          unit: unit
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Success', editingId ? 'Item updated successfully' : 'Item added successfully');
        setModalVisible(false);
        fetchRateLists(); 
      } else {
        Alert.alert('Error', data.message || 'Failed to save item');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRateItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.workName}>{item.workName}</Text>
        <Text style={styles.priceText}>₹{item.rate} <Text style={styles.unitText}>/ {item.unit}</Text></Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.iconButton} onPress={() => openEditModal(item)}>
          <Ionicons name="pencil" size={20} color="#0c831f" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleDelete(item._id)}>
          <Ionicons name="trash" size={20} color="#d32f2f" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Orange Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Rate List</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#ff6600" style={{ marginTop: 20 }} />
        ) : rateLists.length > 0 ? (
          <FlatList
            data={rateLists}
            keyExtractor={(item, index) => item._id?.toString() || index.toString()}
            renderItem={renderRateItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No rates found</Text>
            <Text style={styles.emptySubText}>Click the + button to add a new rate</Text>
          </View>
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Rate Item' : 'Add Rate Item'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Work Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Brick Work"
                value={workName}
                onChangeText={setWorkName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rate (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 150"
                keyboardType="numeric"
                value={rate}
                onChangeText={setRate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unit</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.chipContainer}
              >
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.chip,
                      unit === u && styles.chipActive
                    ]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[
                      styles.chipText,
                      unit === u && styles.chipTextActive
                    ]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSaveItem}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{editingId ? 'Update Item' : 'Add Item'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
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
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100, 
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    marginBottom: 12,
  },
  workName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ff6600',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 16,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff6600',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#ff6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e8eaed',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 16,
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ff6600',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#ff6600',
  },
  chipText: {
    color: '#ff6600',
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#ff6600',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
    shadowColor: '#ff6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  }
});

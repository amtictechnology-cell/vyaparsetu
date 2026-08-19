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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/Config';

export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [clientName, setClientName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/builder/client`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setClients(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async () => {
    if (!clientName.trim() || !mobileNumber.trim() || !address.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/builder/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          mobileNumber: mobileNumber.trim(),
          address: address.trim()
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Success', 'Client added successfully');
        setModalVisible(false);
        setClientName('');
        setMobileNumber('');
        setAddress('');
        fetchClients(); // Refresh list
      } else {
        Alert.alert('Error', data.message || 'Failed to add client');
      }
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderClientItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.clientCard}
      onPress={() => router.push({
        pathname: "/builder/client-profile",
        params: {
          id: item._id,
          name: item.clientName,
          mobile: item.mobileNumber,
          address: item.address
        }
      })}
    >
      <View style={styles.clientIcon}>
        <Ionicons name="person" size={24} color="#ff6600" />
      </View>
      <View style={styles.clientDetails}>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.clientMobile}><Ionicons name="call-outline" size={12} /> {item.mobileNumber}</Text>
        <Text style={styles.clientAddress}><Ionicons name="location-outline" size={12} /> {item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Orange Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clients</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#ff6600" style={{ marginTop: 20 }} />
        ) : clients.length > 0 ? (
          <FlatList
            data={clients}
            keyExtractor={(item, index) => item._id?.toString() || index.toString()}
            renderItem={renderClientItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No clients found</Text>
            <Text style={styles.emptySubText}>Click the + button to add a new client</Text>
          </View>
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Client Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client name"
                value={clientName}
                onChangeText={setClientName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter address"
                multiline
                numberOfLines={3}
                value={address}
                onChangeText={setAddress}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddClient}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Client</Text>
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
    paddingTop: 60, // For status bar
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
    paddingBottom: 100, // Space for FAB
  },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  clientIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff3e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  clientDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  clientMobile: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 13,
    color: '#888',
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
  textArea: {
    height: 100,
    paddingTop: 16,
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

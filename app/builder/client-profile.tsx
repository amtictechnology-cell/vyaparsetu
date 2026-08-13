import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Linking, 
  Alert,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/Config';

export default function ClientProfileScreen() {
  const router = useRouter();
  const { id, name, mobile, address } = useLocalSearchParams<{ id: string, name: string, mobile: string, address: string }>();

  // Tab State
  const [activeTab, setActiveTab] = useState<'bills' | 'transactions'>('bills');

  // Bills State
  const [bills, setBills] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  
  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTrans, setLoadingTrans] = useState(true);

  // Create Bill Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [rateList, setRateList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Single item being added currently to the bill
  const [currentItem, setCurrentItem] = useState<any>({
    workName: '',
    size: '',
    height: '',
    width: '',
    rate: '',
    amount: ''
  });
  
  const [billItems, setBillItems] = useState<any[]>([]);
  const [showRateSelector, setShowRateSelector] = useState(false);
  
  // View Bill Modal State
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  // Transaction Modal States
  const [transModalVisible, setTransModalVisible] = useState(false);
  const [transAmount, setTransAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [submittingTrans, setSubmittingTrans] = useState(false);

  const handleCall = () => {
    if (mobile) {
      Linking.openURL(`tel:${mobile}`).catch(() => Alert.alert('Error', 'Unable to make a call'));
    }
  };

  const handleMessage = () => {
    if (mobile) {
      Linking.openURL(`sms:${mobile}`).catch(() => Alert.alert('Error', 'Unable to send message'));
    }
  };

  const fetchBills = async () => {
    try {
      setLoadingBills(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/builder/bill/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const clientBills = (data.data || []).filter((b: any) => 
          (b.clientId && b.clientId._id === id) || b.clientId === id
        );
        setBills(clientBills);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoadingBills(false);
    }
  };
  
  const fetchTransactions = async () => {
    try {
      setLoadingTrans(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/builder/transaction/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const clientTrans = (data.data || []).filter((t: any) => 
          (t.clientId && t.clientId._id === id) || t.clientId === id
        );
        setTransactions(clientTrans);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTrans(false);
    }
  };

  const fetchRateList = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/builder/rate-list/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRateList(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching rate list:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBills();
      fetchTransactions();
      fetchRateList();
    }
  }, [id]);

  // Handle auto-calculation whenever item inputs change
  useEffect(() => {
    if (!currentItem.rate) return;
    const rate = parseFloat(currentItem.rate) || 0;
    const size = parseFloat(currentItem.size) || 0;
    const height = parseFloat(currentItem.height) || 0;
    const width = parseFloat(currentItem.width) || 0;
    
    let amount = 0;
    if (size > 0) {
      amount = size * rate;
    } else if (height > 0 && width > 0) {
      amount = (height * width) * rate;
    } else {
      if (!currentItem.amount) amount = rate;
      else return;
    }
    
    if (amount > 0) {
      setCurrentItem((prev: any) => ({ ...prev, amount: amount.toString() }));
    }
  }, [currentItem.size, currentItem.height, currentItem.width, currentItem.rate]);

  const selectRateItem = (rateItem: any) => {
    setCurrentItem((prev: any) => ({
      ...prev,
      workName: rateItem.workName,
      rate: rateItem.rate.toString(),
      amount: rateItem.rate.toString()
    }));
    setShowRateSelector(false);
  };

  const addItemToBill = (isDeduction = false) => {
    if (!currentItem.workName || !currentItem.rate || !currentItem.amount) {
      Alert.alert('Error', 'Work Name, Rate, and Amount are required');
      return;
    }
    
    let itemToAdd = { ...currentItem };
    
    if (isDeduction) {
      itemToAdd.workName = `(Deduction) ${itemToAdd.workName}`;
      // Ensure amount is negative
      let amt = Number(itemToAdd.amount);
      if (amt > 0) amt = -amt;
      itemToAdd.amount = amt.toString();
    }
    
    setBillItems([...billItems, itemToAdd]);
    setCurrentItem({ workName: '', size: '', height: '', width: '', rate: '', amount: '' });
  };

  const removeBillItem = (index: number) => {
    const updated = [...billItems];
    updated.splice(index, 1);
    setBillItems(updated);
  };

  const handleCreateBill = async () => {
    let itemsToSubmit = [...billItems];
    
    // Auto-add current item if user forgot to click "Add Item" but filled the required fields
    if (currentItem.workName && currentItem.rate && currentItem.amount) {
      itemsToSubmit.push({ ...currentItem });
    }

    if (itemsToSubmit.length === 0) {
      Alert.alert('Error', 'Please fill the item details or add at least one item');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const payload = {
        clientId: id,
        items: itemsToSubmit.map(item => ({
          workName: item.workName,
          size: item.size ? Number(item.size) : undefined,
          height: item.height ? Number(item.height) : undefined,
          width: item.width ? Number(item.width) : undefined,
          rate: Number(item.rate),
          amount: Number(item.amount)
        }))
      };

      const endpoint = editingBillId 
        ? `${BASE_URL}/builder/bill/${editingBillId}`
        : `${BASE_URL}/builder/bill/`;
      const method = editingBillId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingBillId ? { items: payload.items } : payload)
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Success', editingBillId ? 'Bill updated successfully' : 'Bill created successfully');
        setModalVisible(false);
        setEditingBillId(null);
        setBillItems([]);
        setCurrentItem({ workName: '', size: '', height: '', width: '', rate: '', amount: '' });
        fetchBills();
      } else {
        Alert.alert('Error', data.message || 'Failed to create bill');
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBill = () => {
    if (!selectedBill) return;
    setEditingBillId(selectedBill._id);
    
    // Convert string fields if needed and populate billItems
    const itemsToEdit = selectedBill.items.map((it: any) => ({
      workName: it.workName,
      size: it.size ? it.size.toString() : '',
      height: it.height ? it.height.toString() : '',
      width: it.width ? it.width.toString() : '',
      rate: it.rate.toString(),
      amount: it.amount.toString()
    }));
    
    setBillItems(itemsToEdit);
    setSelectedBill(null); // Close view modal
    setModalVisible(true); // Open create/edit modal
  };

  const handleDeleteBill = () => {
    if (!selectedBill) return;
    Alert.alert(
      "Delete Bill",
      "Are you sure you want to delete this bill?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${BASE_URL}/builder/bill/${selectedBill._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await response.json();
              if (response.ok && data.success) {
                Alert.alert("Success", "Bill deleted successfully");
                setSelectedBill(null);
                fetchBills();
              } else {
                Alert.alert("Error", data.message || "Failed to delete bill");
              }
            } catch (error) {
              console.error("Error deleting bill", error);
              Alert.alert("Error", "Network error");
            }
          }
        }
      ]
    );
  };

  const handleCreateTransaction = async () => {
    if (!transAmount || Number(transAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setSubmittingTrans(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const payload = {
        clientId: id,
        amount: Number(transAmount),
        paymentMethod: paymentMethod
      };

      const response = await fetch(`${BASE_URL}/builder/transaction/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Success', 'Payment saved successfully');
        setTransModalVisible(false);
        setTransAmount('');
        setPaymentMethod('cash');
        fetchTransactions();
      } else {
        Alert.alert('Error', data.message || 'Failed to save payment');
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmittingTrans(false);
    }
  };

  const renderBillItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => setSelectedBill(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardId}>{item.billId}</Text>
        <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.cardInfoBadge}>{item.items?.length || 0} Items</Text>
        <Text style={styles.cardTotal}>₹{item.totalAmount}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTransactionItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardId}>{item.transactionId || 'Payment'}</Text>
        <Text style={styles.cardDate}>{new Date(item.date || item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.methodBadgeContainer}>
          <Ionicons name={item.paymentMethod === 'online' ? "phone-portrait" : "cash"} size={14} color="#555" />
          <Text style={styles.methodBadgeText}>{item.paymentMethod?.toUpperCase()}</Text>
        </View>
        <Text style={[styles.cardTotal, { color: '#0059ff' }]}>+ ₹{item.amount}</Text>
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
        <Text style={styles.headerTitle}>Client Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Text style={styles.nameText}>{name || 'Unknown Client'}</Text>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.contactText}>{mobile || 'N/A'}</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.contactText}>{address || 'No address provided'}</Text>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.messageButton]} onPress={handleMessage}>
              <Ionicons name="chatbubble" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'bills' && styles.activeTabButton]} 
            onPress={() => setActiveTab('bills')}
          >
            <Text style={[styles.tabText, activeTab === 'bills' && styles.activeTabText]}>Client Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'transactions' && styles.activeTabButton]} 
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>Amount</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'bills' ? (
            loadingBills ? (
              <ActivityIndicator size="small" color="#ff6600" style={{ marginTop: 20 }} />
            ) : bills.length > 0 ? (
              <FlatList
                data={bills}
                keyExtractor={(item, index) => item._id?.toString() || index.toString()}
                renderItem={renderBillItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="#ddd" />
                <Text style={styles.emptyText}>No bills generated yet.</Text>
              </View>
            )
          ) : (
            loadingTrans ? (
              <ActivityIndicator size="small" color="#ff6600" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item, index) => item._id?.toString() || index.toString()}
                renderItem={renderTransactionItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListHeaderComponent={() => {
                  const totalBilled = bills.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
                  const totalPaid = transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                  const finalDue = totalBilled - totalPaid;
                  
                  return (
                    <View style={styles.summaryContainer}>
                      <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Total Bill</Text>
                        <Text style={[styles.summaryValue, { color: '#333' }]}>₹{totalBilled}</Text>
                      </View>
                      <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Total Paid</Text>
                        <Text style={[styles.summaryValue, { color: '#0c831f' }]}>₹{totalPaid}</Text>
                      </View>
                      <View style={[styles.summaryCard, { backgroundColor: '#fff3e0', borderColor: '#ff6600' }]}>
                        <Text style={styles.summaryLabel}>Final Due</Text>
                        <Text style={[styles.summaryValue, { color: '#ff6600' }]}>₹{finalDue}</Text>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="wallet-outline" size={48} color="#ddd" />
                    <Text style={styles.emptyText}>No payments received yet.</Text>
                  </View>
                )}
              />
            )
          )}
        </View>
      </View>

      {/* Floating Buttons based on Active Tab */}
      {activeTab === 'bills' ? (
        <TouchableOpacity 
          style={styles.floatingBtn}
          onPress={() => {
            setEditingBillId(null);
            setBillItems([]);
            setCurrentItem({ workName: '', size: '', height: '', width: '', rate: '', amount: '' });
            setModalVisible(true);
          }}
        >
          <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.floatingBtnText}>Create Bill</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.floatingBtn}
          onPress={() => setTransModalVisible(true)}
        >
          <Ionicons name="cash" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.floatingBtnText}>Add Payment</Text>
        </TouchableOpacity>
      )}

      {/* -------------------- CREATE BILL MODAL -------------------- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingBillId ? 'Edit Bill' : 'Create New Bill'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}>
                {/* Added Items List */}
                {billItems.length > 0 && (
                  <View style={styles.addedItemsContainer}>
                    <Text style={styles.addedItemsTitle}>Added Items ({billItems.length})</Text>
                    {billItems.map((item, index) => (
                      <View key={index} style={styles.addedItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addedItemName}>{item.workName}</Text>
                          <Text style={styles.addedItemDetails}>
                            ₹{Math.abs(Number(item.amount))} (Rate: ₹{item.rate})
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => removeBillItem(index)}>
                          <Ionicons name="trash" size={20} color="#d32f2f" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={styles.totalRow}>
                      <Text style={styles.totalText}>Total Amount:</Text>
                      <Text style={styles.totalAmount}>₹{billItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)}</Text>
                    </View>
                  </View>
                )}

                {/* Add Item Form */}
                <View style={styles.itemForm}>
                  <Text style={styles.formTitle}>Add Item</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Work Name <Text style={{color: 'red'}}>*</Text></Text>
                    <TouchableOpacity 
                      style={styles.selectorInput} 
                      onPress={() => setShowRateSelector(!showRateSelector)}
                    >
                      <Text style={{ color: currentItem.workName ? '#333' : '#999', fontSize: 16 }}>
                        {currentItem.workName || 'Select work from rate list'}
                      </Text>
                      <Ionicons name={showRateSelector ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                    </TouchableOpacity>
                    
                    {showRateSelector && (
                      <View style={styles.rateListDropdown}>
                        {rateList.length === 0 ? (
                          <Text style={{ padding: 12, color: '#888' }}>No rates found. Please add in Work Rate List.</Text>
                        ) : (
                          rateList.map((r, idx) => (
                            <TouchableOpacity 
                              key={idx} 
                              style={styles.rateDropdownItem}
                              onPress={() => selectRateItem(r)}
                            >
                              <Text style={styles.rateDropdownName}>{r.workName}</Text>
                              <Text style={styles.rateDropdownPrice}>₹{r.rate} / {r.unit}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}
                  </View>

                  {/* Optional Size / Dimensions */}
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Size (Optional)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 100"
                        keyboardType="numeric"
                        value={currentItem.size}
                        onChangeText={(t) => setCurrentItem({...currentItem, size: t, height: '', width: ''})}
                      />
                    </View>
                    <View style={{ justifyContent: 'center', paddingHorizontal: 10, paddingTop: 15 }}><Text>OR</Text></View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>H x W</Text>
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="H"
                          keyboardType="numeric"
                          value={currentItem.height}
                          onChangeText={(t) => setCurrentItem({...currentItem, height: t, size: ''})}
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="W"
                          keyboardType="numeric"
                          value={currentItem.width}
                          onChangeText={(t) => setCurrentItem({...currentItem, width: t, size: ''})}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Rate & Amount */}
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Rate (₹) <Text style={{color: 'red'}}>*</Text></Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={currentItem.rate}
                        onChangeText={(t) => setCurrentItem({...currentItem, rate: t})}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                      <Text style={styles.label}>Amount (₹) <Text style={{color: 'red'}}>*</Text></Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: '#fff3e0', borderColor: '#ff6600', fontWeight: '700' }]}
                        placeholder="0"
                        keyboardType="numeric"
                        value={currentItem.amount}
                        onChangeText={(t) => setCurrentItem({...currentItem, amount: t})}
                      />
                    </View>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={[styles.addItemBtn, { flex: 1 }]} onPress={() => addItemToBill(false)}>
                      <Ionicons name="add" size={18} color="#ff6600" />
                      <Text style={styles.addItemBtnText}>Add Item</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.addItemBtn, styles.deductionBtn, { flex: 1 }]} onPress={() => addItemToBill(true)}>
                      <Ionicons name="remove" size={18} color="#0059ff" />
                      <Text style={[styles.addItemBtnText, { color: '#0059ff' }]}>Deduction</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </ScrollView>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleCreateBill}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Save Bill (₹{billItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) + (Number(currentItem.amount) || 0)})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* -------------------- ADD TRANSACTION MODAL -------------------- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={transModalVisible}
        onRequestClose={() => setTransModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Receive Payment</Text>
                <TouchableOpacity onPress={() => setTransModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput
                  style={[styles.input, { fontSize: 20, fontWeight: '700' }]}
                  placeholder="e.g. 5000"
                  keyboardType="numeric"
                  value={transAmount}
                  onChangeText={setTransAmount}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Method</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.chip, paymentMethod === 'cash' && styles.chipActive]}
                    onPress={() => setPaymentMethod('cash')}
                  >
                    <Ionicons name="cash" size={20} color={paymentMethod === 'cash' ? '#fff' : '#555'} />
                    <Text style={[styles.chipText, paymentMethod === 'cash' && styles.chipTextActive]}>Cash</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.chip, paymentMethod === 'online' && styles.chipActive]}
                    onPress={() => setPaymentMethod('online')}
                  >
                    <Ionicons name="phone-portrait" size={20} color={paymentMethod === 'online' ? '#fff' : '#555'} />
                    <Text style={[styles.chipText, paymentMethod === 'online' && styles.chipTextActive]}>Online</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleCreateTransaction}
                disabled={submittingTrans}
              >
                {submittingTrans ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* -------------------- VIEW BILL DETAILS MODAL -------------------- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedBill}
        onRequestClose={() => setSelectedBill(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Bill Details</Text>
                <Text style={styles.cardDate}>{selectedBill ? new Date(selectedBill.createdAt).toLocaleDateString() : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBill(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.viewBillCard}>
                <Text style={styles.viewBillId}>{selectedBill?.billId}</Text>
                <Text style={styles.viewBillTotalLabel}>Total Amount</Text>
                <Text style={styles.viewBillTotal}>₹{selectedBill?.totalAmount}</Text>
              </View>

              <Text style={styles.sectionTitle}>Items ({selectedBill?.items?.length || 0})</Text>
              
              {selectedBill?.items?.map((item: any, index: number) => (
                <View key={index} style={styles.viewItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.viewItemName}>{item.workName}</Text>
                    <Text style={styles.viewItemDims}>
                      {item.size ? `Size: ${item.size}` : item.height ? `H: ${item.height} x W: ${item.width}` : 'No Size'} | Rate: ₹{item.rate}
                    </Text>
                  </View>
                  <Text style={styles.viewItemAmount}>
                    {item.amount < 0 ? `- ₹${Math.abs(item.amount)}` : `₹${item.amount}`}
                  </Text>
                </View>
              ))}

              <View style={styles.viewBillActionRow}>
                <TouchableOpacity style={[styles.viewBillActionBtn, styles.editBillBtn]} onPress={handleEditBill}>
                  <Ionicons name="pencil" size={18} color="#fff" />
                  <Text style={styles.viewBillActionText}>Edit Bill</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.viewBillActionBtn, styles.deleteBillBtn]} onPress={handleDeleteBill}>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.viewBillActionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
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
    zIndex: 10,
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
  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c831f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  messageButton: {
    backgroundColor: '#ff6600',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#ff6600',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#888',
  },
  activeTabText: {
    color: '#ff6600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6600',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
  },
  cardDate: {
    fontSize: 12,
    color: '#888',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardInfoBadge: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0059ff',
  },
  methodBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  methodBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  floatingBtn: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#ff6600',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#ff6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
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
    maxHeight: '90%',
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  addedItemsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addedItemsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 12,
  },
  addedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0c831f',
  },
  addedItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  addedItemDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0059ff',
  },
  itemForm: {
    backgroundColor: '#fff',
    padding: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e8eaed',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 15,
    color: '#333',
  },
  selectorInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e8eaed',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  rateListDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 150,
    elevation: 2,
  },
  rateDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  rateDropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rateDropdownPrice: {
    fontSize: 14,
    color: '#ff6600',
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  addItemBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff6600',
    borderRadius: 10,
    padding: 12,
  },
  deductionBtn: {
    backgroundColor: '#e6f0ff',
    borderColor: '#0059ff',
  },
  addItemBtnText: {
    color: '#ff6600',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  submitButton: {
    backgroundColor: '#ff6600',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    gap: 6,
  },
  chipActive: {
    borderColor: '#ff6600',
    backgroundColor: '#ff6600',
  },
  chipText: {
    color: '#555',
    fontWeight: '700',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
  },
  viewBillCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff6600',
  },
  viewBillId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6600',
    marginBottom: 8,
  },
  viewBillTotalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  viewBillTotal: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ff6600',
  },
  viewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  viewItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  viewItemDims: {
    fontSize: 12,
    color: '#666',
  },
  viewItemAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ff6600',
  },
  viewBillActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  viewBillActionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  editBillBtn: {
    backgroundColor: '#0059ff',
  },
  deleteBillBtn: {
    backgroundColor: '#ff6600',
  },
  viewBillActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  }
});

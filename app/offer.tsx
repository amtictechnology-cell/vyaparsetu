import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/Config";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function OfferScreen() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [amount, setAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cachedDataStr = await AsyncStorage.getItem('cachedOffers');
        const cachedTimeStr = await AsyncStorage.getItem('cachedOffersTime');
        
        if (cachedDataStr && cachedTimeStr) {
          const cachedTime = parseInt(cachedTimeStr, 10);
          const now = new Date().getTime();
          const sixMinutes = 6 * 60 * 1000;
          
          if (now - cachedTime < sixMinutes) {
            setOffers(JSON.parse(cachedDataStr));
            setLoading(false);
            return;
          }
        }
      }

      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}/hotel/get-offers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const offersData = data.data || data.offers || [];
        setOffers(offersData);
        await AsyncStorage.setItem('cachedOffers', JSON.stringify(offersData));
        await AsyncStorage.setItem('cachedOffersTime', new Date().getTime().toString());
      } else {
        console.error("Failed to fetch offers", data);
      }
    } catch (error) {
      console.error("Error fetching offers", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffer = async () => {
    if (!amount || !discountAmount) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      
      // Format date to YYYY-MM-DD
      const formattedDate = date.toISOString().split('T')[0];

      const response = await fetch(`${BASE_URL}/hotel/add-offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          discountAmount: Number(discountAmount),
          discountDate: formattedDate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Offer added successfully!");
        setAmount("");
        setDiscountAmount("");
        setDate(new Date());
        setModalVisible(false);
        fetchOffers(true); // Refresh list and bypass cache
      } else {
        Alert.alert("Error", data.message || "Failed to add offer");
      }
    } catch (error) {
      console.error("Error adding offer", error);
      Alert.alert("Error", "Something went wrong!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    Alert.alert(
      "Delete Offer",
      "Are you sure you want to delete this offer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              const response = await fetch(`${BASE_URL}/hotel/delete-offer`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ offerId }),
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert("Success", "Offer deleted!");
                fetchOffers(true);
              } else {
                Alert.alert("Error", data.message || "Failed to delete offer");
              }
            } catch (error) {
              console.error("Error deleting offer", error);
              Alert.alert("Error", "Something went wrong!");
            }
          },
        },
      ]
    );
  };

  const renderOfferItem = ({ item }: { item: any }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerInfo}>
        <Text style={styles.offerAmount}>Amount: ₹{item.amount}</Text>
        <Text style={styles.offerDiscount}>Discount: ₹{item.discountAmount}</Text>
        <Text style={styles.offerDate}>Valid till: {item.discountDate}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteOffer(item.offerId || item._id)}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hotel Offers</Text>
        <Text style={styles.headerSubtitle}>Manage your special offers & discounts</Text>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Active Offers</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#ff6600" style={{ marginTop: 20 }} />
        ) : offers.length === 0 ? (
          <Text style={styles.emptyText}>No active offers found.</Text>
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(item, index) => item.offerId || item._id || index.toString()}
            renderItem={renderOfferItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Offer Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            style={styles.modalContent} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Offer</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Ionicons name="cash-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Minimum Amount (₹)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="pricetag-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Discount Amount (₹)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={discountAmount}
                onChangeText={setDiscountAmount}
              />
            </View>

            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.dateText}>Valid Till: {date.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}

            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
              onPress={handleAddOffer}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Offer</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 40,
    paddingBottom: 24,
    backgroundColor: "#ff6600",
    borderBottomWidth: 1,
    borderBottomColor: "#ff6600",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
    fontWeight: "500",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
    fontSize: 14,
  },
  offerCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 0,
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  offerInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  offerAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  offerDiscount: {
    fontSize: 14,
    color: "#ff6600",
    fontWeight: "700",
    marginBottom: 4,
  },
  offerDate: {
    fontSize: 12,
    color: "#666",
  },
  deleteButton: {
    backgroundColor: "#ff6600",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ff6600",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#ff6600",
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8eaed",
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8eaed",
    marginBottom: 24,
    paddingHorizontal: 12,
    height: 50,
  },
  dateText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#ff6600",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ff6600",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});


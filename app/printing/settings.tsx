import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { BASE_URL } from "../../constants/Config";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
} from "react-native";
import LogoutModal from "../../components/LogoutModal";
import ActivePlanCard from "../../components/ActivePlanCard";

export default function PrintingSettingsScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState("");
    const [editBusinessName, setEditBusinessName] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [activePlan, setActivePlan] = useState<any>(null);
    const [activatedAt, setActivatedAt] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfileAndPlan = async () => {
            try {
                const cachedProfileStr = await AsyncStorage.getItem('cachedSettingsProfile');
                if (cachedProfileStr) {
                    const parsedProfile = JSON.parse(cachedProfileStr);
                    setProfile(parsedProfile);
                    setLoading(false);
                    if (parsedProfile.activeSubscription) {
                        const fetchedPlan = { ...parsedProfile.activeSubscription, description: "Active Subscription Plan" };
                        setActivePlan(fetchedPlan);
                        setActivatedAt(parsedProfile.activeSubscription.activatedAt);
                    }
                }

                const token = await AsyncStorage.getItem("userToken");
                let currentProfile = null;
                if (token) {
                    const response = await fetch(`${BASE_URL}/user/profile`, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    const data = await response.json();
                    if (response.ok && data.user) {
                        setProfile(data.user);
                        currentProfile = data.user;
                        await AsyncStorage.setItem('cachedSettingsProfile', JSON.stringify(data.user));
                        
                        if (currentProfile.activeSubscription) {
                            const fetchedPlan = {
                                ...currentProfile.activeSubscription,
                                description: "Active Subscription Plan"
                            };
                            setActivePlan(fetchedPlan);
                            setActivatedAt(currentProfile.activeSubscription.activatedAt);
                            
                            await AsyncStorage.setItem("selectedPlan", JSON.stringify(fetchedPlan));
                            await AsyncStorage.setItem("planActivatedAt", currentProfile.activeSubscription.activatedAt);
                            
                            setLoading(false);
                            return;
                        }
                    }
                }

                const planString = await AsyncStorage.getItem("selectedPlan");
                const activatedAtString = await AsyncStorage.getItem("planActivatedAt");
                
                if (planString) {
                    setActivePlan(JSON.parse(planString));
                    setActivatedAt(activatedAtString);
                } else {
                    const isSub = await AsyncStorage.getItem("isSubscribed");
                    if (isSub === "true") {
                        const fallbackPlan = {
                            planId: "PLNSILVER",
                            name: "Active Plan",
                            category: currentProfile?.businessCategory || "printing",
                            price: 199,
                            durationInDays: 30,
                            features: ["Basic Business Setup"],
                            description: "Subscription active on account",
                            status: "active"
                        };
                        setActivePlan(fallbackPlan);
                        const mockDate = new Date();
                        mockDate.setDate(mockDate.getDate() - 3);
                        setActivatedAt(mockDate.toISOString());
                    }
                }
            } catch (error) {
                console.error("Error fetching profile and plan", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileAndPlan();
    }, []);

    const handleConfirmLogout = async () => {
        try {
            await AsyncStorage.removeItem("userToken");
            await AsyncStorage.removeItem("isSubscribed");
            await AsyncStorage.removeItem("selectedPlan");
            await AsyncStorage.removeItem("planActivatedAt");
            setShowLogoutModal(false);
            router.replace("/signup");
        } catch (error) {
            console.error("Error clearing token:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
        }
    };

    const handleEditProfile = () => {
        setEditName(profile?.name || "");
        setEditBusinessName(profile?.businessName || "");
        setShowEditModal(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim() || !editBusinessName.trim()) {
            Alert.alert("Error", "Name and Business Name cannot be empty.");
            return;
        }

        try {
            setSavingProfile(true);
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${BASE_URL}/user/complete-profile`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editName,
                    businessName: editBusinessName
                })
            });

            const data = await response.json();
            if (response.ok && data.user) {
                setProfile(data.user);
                setShowEditModal(false);
                Alert.alert("Success", "Profile updated successfully.");
            } else {
                Alert.alert("Update Failed", data.message || "Failed to update profile.");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        } finally {
            setSavingProfile(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#ff6600" />
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#ff6600" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Printing Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Details Card */}
                <View style={styles.hotelBanner}>
                    <View style={styles.bannerRow}>
                        <View style={styles.avatarContainer}>
                            <Ionicons name="print" size={28} color="#ff6600" />
                        </View>
                        <View style={styles.profileDetails}>
                            <Text style={styles.businessName}>{profile?.businessName || "Your Business"}</Text>
                            <Text style={styles.categoryBadge}>{(profile?.businessCategory || "Printing").toUpperCase()}</Text>
                        </View>
                        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                            <Ionicons name="pencil" size={18} color="#0059ff" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.profileInfoList}>
                        <View style={styles.infoRow}>
                            <Ionicons name="person-outline" size={16} color="#666" />
                            <Text style={styles.infoText}>{profile?.name || "User Name"}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="call-outline" size={16} color="#666" />
                            <Text style={styles.infoText}>{profile?.mobileNo || "Mobile Number"}</Text>
                        </View>
                    </View>
                </View>

                {/* Active Plan Card Component */}
                <ActivePlanCard plan={activePlan} activatedAtString={activatedAt} />

                {/* Actions Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>General Options</Text>
                    
                    <TouchableOpacity style={styles.edgeRow} onPress={() => router.push("/Appaboutus")}>
                        <View style={[styles.infoIconWrapper, { backgroundColor: "#fff0e6" }]}>
                            <Ionicons name="information-circle-outline" size={20} color="#ff6600" />
                        </View>
                        <View style={styles.actionTextWrapper}>
                            <Text style={styles.actionLabel}>About Us</Text>
                            <Text style={styles.actionSubtitle}>Know more about Vyapar Setu</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={18} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.edgeRow} onPress={() => router.push("/HelpSupport")}>
                        <View style={[styles.infoIconWrapper, { backgroundColor: "#e6f0ff" }]}>
                            <Ionicons name="help-buoy-outline" size={20} color="#0059ff" />
                        </View>
                        <View style={styles.actionTextWrapper}>
                            <Text style={styles.actionLabel}>Help & Support</Text>
                            <Text style={styles.actionSubtitle}>Get help for your account</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={18} color="#999" />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)}>
                    <Ionicons name="log-out-outline" size={22} color="#ff6600" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Vyapar Setu</Text>
                    <Text style={styles.versionNumber}>Version 1.0.0</Text>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={showEditModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        
                        <Text style={styles.inputLabel}>Full Name</Text>
                        <TextInput
                            style={styles.inputField}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Enter your name"
                        />
                        
                        <Text style={styles.inputLabel}>Business Name</Text>
                        <TextInput
                            style={styles.inputField}
                            value={editBusinessName}
                            onChangeText={setEditBusinessName}
                            placeholder="Enter business name"
                        />
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={savingProfile}>
                                {savingProfile ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <LogoutModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleConfirmLogout}
            />
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
        paddingTop: Platform.OS === 'android' ? 40 : 60,
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
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#fff",
    },
    scrollContent: {
        paddingVertical: 0,
    },
    hotelBanner: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderColor: "#eee",
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    bannerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarContainer: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#fff5eb",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
        borderWidth: 1,
        borderColor: "#ffb380",
    },
    profileDetails: {
        flex: 1,
    },
    businessName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#333",
    },
    categoryBadge: {
        fontSize: 10,
        fontWeight: "800",
        color: "#ff6600",
        backgroundColor: "#fff0e6",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: "flex-start",
        marginTop: 6,
    },
    sectionContainer: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: "#888",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    edgeRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#eee",
    },
    infoIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    actionTextWrapper: {
        flex: 1,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: "800",
        color: "#333",
    },
    actionSubtitle: {
        fontSize: 12,
        color: "#999",
        fontWeight: "500",
        marginTop: 2,
    },
    editButton: {
        padding: 8,
        backgroundColor: "#e6f0ff",
        borderRadius: 20,
    },
    logoutButton: {
        backgroundColor: "rgba(255, 243, 233, 1)",
        borderWidth: 1.5,
        borderColor: "#ff6600",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        marginHorizontal: 16,
        borderRadius: 12,
        marginTop: 40,
    },
    logoutButtonText: {
        color: "#ff6600",
        fontSize: 16,
        fontWeight: "800",
    },
    versionContainer: {
        alignItems: "center",
        marginTop: 24,
        marginBottom: 40,
    },
    versionText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#888",
    },
    versionNumber: {
        fontSize: 12,
        color: "#aaa",
        marginTop: 2,
    },
    profileInfoList: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#f1f3f5",
        gap: 8,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    infoText: {
        fontSize: 14,
        color: "#444",
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#fff",
        width: "100%",
        borderRadius: 20,
        padding: 24,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#000",
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#555",
        marginBottom: 8,
    },
    inputField: {
        backgroundColor: "#f5f5f5",
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: "#000",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#eee",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 8,
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: "#f5f5f5",
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#555",
    },
    saveBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        backgroundColor: "#ff6600",
        justifyContent: "center",
        alignItems: "center",
        minWidth: 90,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#fff",
    },
});

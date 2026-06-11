import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function Appaboutus() {
    const router = useRouter();

    const features = [
        { icon: 'receipt-outline' as const, label: 'Instant Bill Generation', desc: 'Create professional bills for your customers in seconds.' },
        { icon: 'people-outline' as const, label: 'Customer Management', desc: 'Manage all your customers in one place with ease.' },
        { icon: 'bar-chart-outline' as const, label: 'Business Insights', desc: 'Track your revenue, orders and growth with smart analytics.' },
        { icon: 'wallet-outline' as const, label: 'Fast Payments', desc: 'Receive and withdraw payments directly to your bank account.' },
    ];

    const owner = { name: 'Ashish Nokhwal', role: 'Founder', initials: 'AN' };

    const leadership = [
        { name: 'Pankaj', role: 'CEO', initials: 'P' },
        { name: 'Sonam Kumari', role: 'CTO', initials: 'SK' },
        { name: 'Nikita Kumari', role: 'Head of Design', initials: 'NK' },
    ];

    const developers = [
        { name: 'Nitesh', initials: 'N' },
        { name: 'Hemant Kumar', initials: 'HK' },
        { name: 'Rahul Kumar', initials: 'RK' },
        { name: 'Vijye', initials: 'V' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About Us</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Brand Hero */}
                <View style={styles.heroBanner}>
                    <View style={styles.brandNameRow}>
                        <Text style={styles.brandBlack}>Vyapar</Text>
                        <Text style={styles.brandGreen}>Setu</Text>
                    </View>
                    <Text style={styles.tagline}>Hotel Management · Supplier · Shopkeeper</Text>
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </View>
                </View>

                {/* Mission */}
                <Text style={styles.sectionTitle}>Our Mission</Text>
                <View style={styles.missionCard}>
                    <Ionicons name="rocket-outline" size={28} color="#0c831f" style={{ marginBottom: 10 }} />
                    <Text style={styles.missionText}>
                        VyaparSetu ek all-in-one platform hai jo Hotel Management, Suppliers aur Shopkeepers ke liye
                        banaya gaya hai. Hamare saath aap apne customers manage kar sakte hain, bills generate kar sakte
                        hain, aur apni business growth track kar sakte hain — sab kuch ek jagah se, aasaani se.
                    </Text>
                </View>

                {/* Features */}
                <Text style={styles.sectionTitle}>What We Offer</Text>
                <View style={styles.featuresCard}>
                    {features.map((f, idx) => (
                        <View key={idx}>
                            <View style={styles.featureRow}>
                                <View style={styles.featureIconBox}>
                                    <Ionicons name={f.icon} size={22} color="#0c831f" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.featureLabel}>{f.label}</Text>
                                    <Text style={styles.featureDesc}>{f.desc}</Text>
                                </View>
                            </View>
                            {idx < features.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                </View>

                {/* Team */}
                <Text style={styles.sectionTitle}>Meet The Team</Text>

                {/* Team - all same size cards in grid */}
                <View style={styles.teamRow}>
                    {/* Owner first */}
                    <View style={styles.teamCard}>
                        <View style={styles.teamAvatar}>
                            <Text style={styles.teamInitials}>{owner.initials}</Text>
                        </View>
                        <Text style={styles.teamName}>{owner.name}</Text>
                        <Text style={styles.teamRole}>{owner.role}</Text>
                    </View>

                    {/* Leadership */}
                    {leadership.map((member, idx) => (
                        <View key={idx} style={styles.teamCard}>
                            <View style={styles.teamAvatar}>
                                <Text style={styles.teamInitials}>{member.initials}</Text>
                            </View>
                            <Text style={styles.teamName}>{member.name}</Text>
                            <Text style={styles.teamRole}>{member.role}</Text>
                        </View>
                    ))}
                </View>

                {/* Developer Team */}
                <Text style={styles.sectionTitle}>Developer Team</Text>
                <View style={styles.devGrid}>
                    {developers.map((dev, idx) => (
                        <View key={idx} style={styles.devCard}>
                            <View style={styles.devAvatar}>
                                <Text style={styles.devInitials}>{dev.initials}</Text>
                            </View>
                            <Text style={styles.devName}>{dev.name}</Text>
                        </View>
                    ))}
                </View>

                {/* Contact */}
                <Text style={styles.sectionTitle}>Get In Touch</Text>
                <View style={styles.contactCard}>
                    <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('mailto:support@vyaparsetu.in')}>
                        <View style={styles.cIconBox}>
                            <Ionicons name="mail-outline" size={20} color="#0c831f" />
                        </View>
                        <View>
                            <Text style={styles.cLabel}>Email</Text>
                            <Text style={styles.cValue}>support@vyaparsetu.in</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('https://vyaparsetu.in')}>
                        <View style={styles.cIconBox}>
                            <Ionicons name="globe-outline" size={20} color="#0c831f" />
                        </View>
                        <View>
                            <Text style={styles.cLabel}>Website</Text>
                            <Text style={styles.cValue}>www.vyaparsetu.in</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <View style={styles.contactRow}>
                        <View style={styles.cIconBox}>
                            <Ionicons name="location-outline" size={20} color="#0c831f" />
                        </View>
                        <View>
                            <Text style={styles.cLabel}>Office</Text>
                            <Text style={styles.cValue}>Sikar, Rajasthan, India</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.copyright}>© 2026 VyaparSetu. All rights reserved.</Text>
                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffffff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 52,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
    content: { paddingTop: 0 },
    heroBanner: {
        backgroundColor: '#f9fff2ff',
        padding: 28,
        alignItems: 'center',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    brandNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    brandBlack: { fontSize: 32, fontWeight: '900', color: '#111' },
    brandGreen: { fontSize: 32, fontWeight: '900', color: '#0c831f' },
    tagline: { fontSize: 13, color: '#000000ff', textAlign: 'center', fontStyle: 'italic', marginBottom: 14 },
    versionBadge: {
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
    },
    versionText: { fontSize: 12, fontWeight: '700', color: '#0c831f' },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#888',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: 12,
        paddingHorizontal: 16,
    },
    missionCard: {
        backgroundColor: '#fff',
        padding: 20,
        alignItems: 'center',
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    missionText: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
    featuresCard: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 12 },
    featureIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureLabel: { fontSize: 14, fontWeight: '800', color: '#222', marginBottom: 3 },
    featureDesc: { fontSize: 12, color: '#888', fontWeight: '500', lineHeight: 17 },
    divider: { height: 1, backgroundColor: '#f0f0f0' },
    /* Team Cards - unused owner styles removed */

    /* Team Grid */
    teamRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 8 },
    teamCard: {
        width: '50%',
        backgroundColor: '#fff',
        paddingVertical: 18,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: '#f0f0f0',
    },
    teamAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0c831f',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    teamInitials: { fontSize: 15, fontWeight: '900', color: '#fff' },
    teamName: { fontSize: 12, fontWeight: '800', color: '#222', textAlign: 'center', marginBottom: 3 },
    teamRole: { fontSize: 10, color: '#999', fontWeight: '600', textAlign: 'center' },

    /* Developer Grid */
    devGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 8 },
    devCard: {
        width: '50%',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 0.5,
        borderColor: '#f0f0f0',
    },
    devAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    devInitials: { fontSize: 13, fontWeight: '900', color: '#1565c0' },
    devName: { fontSize: 12, fontWeight: '700', color: '#333', flex: 1 },
    contactCard: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 4,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
    cIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center' },
    cLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', marginBottom: 2 },
    cValue: { fontSize: 14, fontWeight: '700', color: '#222' },
    copyright: { textAlign: 'center', fontSize: 12, color: '#bbb', fontWeight: '500' },
});

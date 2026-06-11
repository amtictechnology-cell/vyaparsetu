import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HelpSupport() {
    const router = useRouter();
    const [message, setMessage] = useState('');

    const faqs = [
        { q: 'How do I create a bill for a customer?', a: 'Go to the Supplier screen, tap "Create Bill", select a customer and add items to generate a bill instantly.' },
        { q: 'How do I update my rate list?', a: 'Navigate to the Dashboard tab and look for Rate List section where you can add or edit your item prices.' },
        { q: 'How do I withdraw my balance?', a: 'Go to App Balance from your menu, and tap the "Withdraw" button. Funds are transferred within 2 business days.' },
        { q: 'How do I contact customer support?', a: 'Use the message box below or call our helpline number directly.' },
    ];

    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Hero Banner */}
                <View style={styles.heroBanner}>
                    <View style={styles.heroIconWrap}>
                        <Ionicons name="headset-outline" size={40} color="#fff" />
                    </View>
                    <Text style={styles.heroTitle}>How can we help?</Text>
                    <Text style={styles.heroSub}>We're here 24/7 to assist you</Text>
                </View>

                {/* Contact Options */}
                <View style={styles.contactRow}>
                    <TouchableOpacity style={[styles.contactCard, { borderLeftColor: '#0c831f' }]}
                        onPress={() => Alert.alert('Calling...', '+91 98765 43210')}>
                        <Ionicons name="call-outline" size={24} color="#0c831f" />
                        <Text style={styles.contactLabel}>Call Us</Text>
                        <Text style={styles.contactValue}>+91 98765 43210</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.contactCard, { borderLeftColor: '#25D366' }]}
                        onPress={() => Alert.alert('WhatsApp', 'Opening WhatsApp support...')}>
                        <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                        <Text style={styles.contactLabel}>WhatsApp</Text>
                        <Text style={styles.contactValue}>Chat with us</Text>
                    </TouchableOpacity>
                </View>

                {/* FAQ */}
                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                <View style={styles.faqCard}>
                    {faqs.map((faq, idx) => (
                        <View key={idx}>
                            <TouchableOpacity
                                style={styles.faqRow}
                                onPress={() => setOpenFaq(openFaq === idx ? null : idx)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.faqQ}>{faq.q}</Text>
                                <Ionicons
                                    name={openFaq === idx ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color="#0c831f"
                                />
                            </TouchableOpacity>
                            {openFaq === idx && (
                                <Text style={styles.faqA}>{faq.a}</Text>
                            )}
                            {idx < faqs.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                </View>

                {/* Send Message */}
                <Text style={styles.sectionTitle}>Send Us a Message</Text>
                <View style={styles.msgCard}>
                    <TextInput
                        style={styles.msgInput}
                        placeholder="Describe your issue or question..."
                        placeholderTextColor="#bbb"
                        multiline
                        numberOfLines={4}
                        value={message}
                        onChangeText={setMessage}
                        textAlignVertical="top"
                    />
                    <TouchableOpacity
                        style={styles.sendBtn}
                        onPress={() => {
                            Alert.alert('Sent!', 'Your message has been received. We will get back to you shortly.');
                            setMessage('');
                        }}
                    >
                        <Ionicons name="send-outline" size={18} color="#fff" />
                        <Text style={styles.sendBtnText}>Send Message</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
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
    content: { padding: 16 },
    heroBanner: {
        backgroundColor: '#0c831f',
        borderRadius: 22,
        padding: 28,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 5,
        shadowColor: '#0c831f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    heroIconWrap: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    contactRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    contactCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderLeftWidth: 4,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        gap: 6,
    },
    contactLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
    contactValue: { fontSize: 11, color: '#888', fontWeight: '500' },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#888',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 4,
    },
    faqCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 24,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    faqRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    faqQ: { flex: 1, fontSize: 14, fontWeight: '700', color: '#222', lineHeight: 20 },
    faqA: {
        fontSize: 13,
        color: '#666',
        lineHeight: 20,
        paddingBottom: 12,
        paddingLeft: 4,
    },
    divider: { height: 1, backgroundColor: '#f0f0f0' },
    msgCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    msgInput: {
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        color: '#222',
        minHeight: 110,
        marginBottom: 12,
        backgroundColor: '#fafafa',
    },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0c831f',
        borderRadius: 14,
        paddingVertical: 14,
    },
    sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

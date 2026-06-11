import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StaffLoaderProps {
    text?: string;
    small?: boolean;
}

export default function StaffLoader({ text = "Loading Staff Members...", small = false }: StaffLoaderProps) {
    return (
        <View style={[styles.container, small && styles.smallContainer]}>
            <LottieView
                source={{ uri: 'https://lottie.host/8fa8b7a6-3c2c-47a6-a0a4-e95e7c8ea9e5/f8K9Q4H4uW.json' }}
                autoPlay
                loop
                style={[styles.lottie, small && styles.smallLottie]}
            />
            <Text style={[styles.text, small && styles.smallText]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'transparent',
    },
    smallContainer: {
        padding: 10,
    },
    lottie: {
        width: 150,
        height: 150,
    },
    smallLottie: {
        width: 60,
        height: 60,
    },
    text: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    smallText: {
        fontSize: 12,
        marginTop: 5,
    },
});

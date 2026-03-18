import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface DriverLoaderProps {
    text?: string;
    small?: boolean;
}

export default function DriverLoader({ text = "Loading Details...", small = false }: DriverLoaderProps) {
    const jumpAnim1 = useRef(new Animated.Value(0)).current;
    const jumpAnim2 = useRef(new Animated.Value(0)).current;
    const jumpAnim3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createJumpAnimation = (anim: Animated.Value, delay: number) => {
            return Animated.sequence([
                Animated.delay(delay),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: -15,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.spring(anim, {
                            toValue: 0,
                            friction: 4,
                            useNativeDriver: true,
                        }),
                        Animated.delay(600) // pause between jumps
                    ])
                )
            ]);
        };

        createJumpAnimation(jumpAnim1, 0).start();
        createJumpAnimation(jumpAnim2, 150).start();
        createJumpAnimation(jumpAnim3, 300).start();
    }, []);

    const emojiSize = small ? 20 : 36;
    const textSize = small ? 12 : 14;

    return (
        <View style={[styles.container, small && { padding: 10, paddingTop: 20 }]}>
            <View style={styles.emojiRow}>
                <Animated.Text style={[styles.emoji, { fontSize: emojiSize, transform: [{ translateY: jumpAnim1 }] }]}>🚕</Animated.Text>
                <Animated.Text style={[styles.emoji, { fontSize: emojiSize, transform: [{ translateY: jumpAnim2 }] }]}>👨🏻‍✈️</Animated.Text>
                <Animated.Text style={[styles.emoji, { fontSize: emojiSize, transform: [{ translateY: jumpAnim3 }] }]}>📍</Animated.Text>
            </View>
            <Text style={[styles.text, { fontSize: textSize }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        width: '100%'
    },
    emojiRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16
    },
    emoji: {
        fontSize: 36,
    },
    text: {
        color: '#888',
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 0.5
    }
});

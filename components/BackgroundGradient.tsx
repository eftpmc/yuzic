import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
    current: string[];
    next: string[];
    onFadeComplete: () => void;
};

const BackgroundGradient: React.FC<Props> = ({ current, next, onFadeComplete }) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            fadeAnim.setValue(1); // no fade, start fully visible
            onFadeComplete?.();
            return;
        }

        if (current.join() === next.join()) {
            fadeAnim.setValue(1);
            onFadeComplete?.();
            return;
        }

        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
        }).start(() => {
            onFadeComplete?.();
        });
    }, [next.join()]);

    return (
        <>
            <LinearGradient colors={current} style={StyleSheet.absoluteFill} />
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                <LinearGradient colors={next} style={StyleSheet.absoluteFill} />
            </Animated.View>
        </>
    );
};

export default BackgroundGradient;
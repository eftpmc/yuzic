import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    View,
    Easing,
    AppState,
    AppStateStatus,
    StyleProp,
    ViewStyle,
} from 'react-native';

interface AnimatedBarProps {
    delay?: number;
    color?: string;
    minHeight?: number;
    maxHeight?: number;
    isActive: boolean;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
                                                     delay = 0,
                                                     color = '#fff',
                                                     minHeight = 5,
                                                     maxHeight = 13,
                                                     isActive,
                                                 }) => {
    const animatedHeight = useRef(new Animated.Value(minHeight)).current;
    const loopRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (isActive) {
            if (!loopRef.current) {
                loopRef.current = Animated.loop(
                    Animated.sequence([
                        Animated.timing(animatedHeight, {
                            toValue: maxHeight,
                            duration: 500,
                            delay,
                            easing: Easing.inOut(Easing.quad),
                            useNativeDriver: false,
                        }),
                        Animated.timing(animatedHeight, {
                            toValue: minHeight,
                            duration: 500,
                            easing: Easing.inOut(Easing.quad),
                            useNativeDriver: false,
                        }),
                    ])
                );
                loopRef.current.start();
            }
        } else {
            if (loopRef.current) {
                loopRef.current.stop();
                loopRef.current = null;
                animatedHeight.setValue(minHeight);
            }
        }
    }, [isActive]);

    return (
        <View
            style={{
                width: 3,
                height: maxHeight,
                marginHorizontal: 1.5,
                justifyContent: 'flex-end',
                overflow: 'hidden',
            }}
        >
            <Animated.View
                style={{
                    width: 3,
                    height: animatedHeight,
                    backgroundColor: color,
                    borderRadius: 999,
                }}
            />
        </View>
    );
};

interface PlayingBarsProps {
    color?: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

const PlayingBars: React.FC<PlayingBarsProps> = ({ color = '#fff', size = 18, style }) => {
    const barHeight = size - 5; // padding inside the button
    const [appState, setAppState] = useState(AppState.currentState);

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            setAppState(nextAppState);
        };

        const sub = AppState.addEventListener('change', handleAppStateChange);
        return () => sub.remove();
    }, []);

    const isActive = appState === 'active';

    return (
        <View
            style={[
                {
                    width: size,
                    height: size,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                style,
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <AnimatedBar delay={0} color={color} maxHeight={barHeight} isActive={isActive} />
                <AnimatedBar delay={200} color={color} maxHeight={barHeight} isActive={isActive} />
                <AnimatedBar delay={400} color={color} maxHeight={barHeight} isActive={isActive} />
            </View>
        </View>
    );
};

export default PlayingBars;
import React from 'react';
import {
    View,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlayingBar from './PlayingBar';

const PlayingBarHolder: React.FC = () => {
    const insets = useSafeAreaInsets();

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: insets.bottom,
                zIndex: 10,
            }}
        >
            <PlayingBar />
        </KeyboardAvoidingView>
    );
};

export default PlayingBarHolder;
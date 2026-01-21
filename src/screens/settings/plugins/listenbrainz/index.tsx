import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import Header from '../../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';

import {
  selectListenBrainzUsername,
  selectListenBrainzToken,
  selectListenBrainzAuthenticated,
  selectListenBrainzConfig,
} from '@/utils/redux/selectors/listenbrainzSelectors';

import {
  setUsername,
  setToken,
  setAuthenticated,
  disconnect,
} from '@/utils/redux/slices/listenbrainzSlice';

import * as listenbrainz from '@/api/listenbrainz';

const ListenBrainzView: React.FC = () => {
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode } = useTheme();

  const username = useSelector(selectListenBrainzUsername);
  const token = useSelector(selectListenBrainzToken);
  const isAuthenticated = useSelector(selectListenBrainzAuthenticated);
  const config = useSelector(selectListenBrainzConfig);

  const [isLoading, setIsLoading] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handlePing = async () => {
    if (!username || !token) {
      toast.error('Enter username and token first.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await listenbrainz.testConnection(config);

      if (result.success) {
        dispatch(setAuthenticated(true));
        toast.success('ListenBrainz connection successful.');
      } else {
        dispatch(setAuthenticated(false));
        toast.error(result.message || 'Connection failed.');
      }
    } catch {
      dispatch(setAuthenticated(false));
      toast.error('Failed to connect to ListenBrainz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    dispatch(disconnect());
    toast('Disconnected from ListenBrainz.');
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title="ListenBrainz" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Username
          </Text>
          <TextInput
            value={username}
            onChangeText={(v) => dispatch(setUsername(v.trim()))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="ListenBrainz username"
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            User Token
          </Text>
          <TextInput
            value={token}
            onChangeText={(v) => dispatch(setToken(v.trim()))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="ListenBrainz user token"
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <TouchableOpacity style={styles.row} onPress={handlePing}>
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              Connectivity
            </Text>

            {isLoading ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Loader2 size={20} color={themeColor} />
              </Animated.View>
            ) : (
              <MaterialIcons
                name={isAuthenticated ? 'check-circle' : 'cancel'}
                size={20}
                color={isAuthenticated ? 'green' : 'red'}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.helperText, isDarkMode && styles.helperTextDark]}>
            ListenBrainz is used for scrobbling and personalized discovery.
            MusicBrainz provides artist, albums, genres, and release metadata.
            No listening data is sent without your permission.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.disconnectButton,
            isDarkMode && styles.disconnectButtonDark,
          ]}
          onPress={handleDisconnect}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ListenBrainzView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  labelDark: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  inputDark: {
    borderColor: '#444',
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rowText: {
    fontSize: 16,
    color: '#000',
  },
  rowTextDark: {
    color: '#fff',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  helperTextDark: {
    color: '#aaa',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  disconnectButtonDark: {
    backgroundColor: '#FF453A',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { Artist, Song } from '@/types';
import { usePlaying } from '@/contexts/PlayingContext';
import { useSettings } from '@/contexts/SettingsContext';

type Props = {
  artist: Artist;
};

const Header: React.FC<Props> = ({ artist }) => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';

  const { themeColor } = useSettings();
  const { playSongInCollection } = usePlaying();

  const artistSongs: Song[] = artist.songs ?? [];

  return (
    <>
      <View style={styles.fullBleedWrapper}>
        <Image
          source={{ uri: artist.cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={Platform.OS === 'ios' ? 20 : 10}
          transition={300}
        />

        <LinearGradient
          colors={
            isDarkMode
              ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']
              : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,1)']
          }
          style={StyleSheet.absoluteFill}
        />

        {/* CENTERED ARTIST IMAGE */}
        <View style={styles.centeredCoverContainer}>
          <Image
            source={{ uri: artist.cover }}
            style={styles.centeredCover}
            contentFit="cover"
          />
        </View>

        {/* BACK BUTTON */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ARTIST META */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Text style={[styles.artistName, isDarkMode && styles.artistNameDark]}>
            {artist.name}
          </Text>

          {artist.bio && (
            <Text
              style={[styles.artistBio, isDarkMode && styles.artistBioDark]}
            >
              {artist.bio.replace(/<[^>]*>/g, '')}
            </Text>
          )}
        </View>
      </View>

      {/* PLAY / SHUFFLE */}
      {artistSongs.length > 0 && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() =>
              playSongInCollection(artistSongs[0], {
                id: artist.id,
                title: artist.name,
                artist: artist.name,
                cover: artist.cover,
                songs: artistSongs,
                type: 'playlist',
              })
            }
            style={[styles.button, isDarkMode && styles.buttonDark]}
          >
            <Ionicons name="play" size={18} color={themeColor} />
            <Text style={[styles.buttonText, isDarkMode && styles.buttonTextDark]}>
              Play
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              playSongInCollection(
                artistSongs[0],
                {
                  id: artist.id,
                  title: artist.name,
                  artist: artist.name,
                  cover: artist.cover,
                  songs: artistSongs,
                  type: 'playlist',
                },
                true
              )
            }
            style={[styles.button, isDarkMode && styles.buttonDark]}
          >
            <Ionicons name="shuffle" size={18} color={themeColor} />
            <Text style={[styles.buttonText, isDarkMode && styles.buttonTextDark]}>
              Shuffle
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  fullBleedWrapper: {
    width: '100%',
    height: 300,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },

  centeredCoverContainer: {
    position: 'absolute',
    bottom: -32,
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredCover: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },

  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 50,
    left: 16,
    zIndex: 20,
  },
  backButton: {
    padding: 6,
  },

  content: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },

  artistName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  artistNameDark: {
    color: '#fff',
  },

  artistBio: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  artistBioDark: {
    color: '#ccc',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  buttonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    fontWeight: '600',
    color: '#000',
  },
  buttonTextDark: {
    color: '#fff',
  },
});


export default Header;
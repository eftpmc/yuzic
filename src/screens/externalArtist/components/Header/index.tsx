import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { MediaImage } from '@/components/MediaImage'
import { buildCover } from '@/utils/builders/buildCover'
import { useTheme } from '@/hooks/useTheme'
import type { ExternalArtist } from '@/types'

type Props = {
  artist: ExternalArtist
}

export default function ExternalArtistHeader({ artist }: Props) {
  const navigation = useNavigation()
  const { isDarkMode } = useTheme()
  const bgUri = buildCover(artist.cover, 'background')

  return (
    <>
      <View style={styles.fullBleedWrapper}>
        {bgUri ? (
          <Image
            source={{ uri: bgUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={Platform.OS === 'ios' ? 20 : 10}
            transition={300}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDarkMode ? '#1a1a1a' : '#e5e5e5' },
            ]}
          />
        )}
        <LinearGradient
          colors={
            isDarkMode
              ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']
              : [
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.7)',
                  'rgba(255,255,255,1)',
                ]
          }
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centeredCoverContainer}>
          <MediaImage
            cover={artist.cover}
            size="detail"
            style={styles.centeredCover}
          />
        </View>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Text
            style={[styles.artistName, isDarkMode && styles.artistNameDark]}
          >
            {artist.name}
          </Text>
          {artist.subtext ? (
            <Text
              style={[styles.subtext, isDarkMode && styles.subtextDark]}
              numberOfLines={1}
            >
              {artist.subtext}
            </Text>
          ) : null}
        </View>
      </View>
    </>
  )
}

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
  subtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  subtextDark: {
    color: '#aaa',
  },
})

import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import TurboImage from 'react-native-turbo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'

import { MediaImage } from '@/components/MediaImage'
import { buildCover } from '@/utils/builders/buildCover'
import { useTheme } from '@/hooks/useTheme'
import type { ExternalArtist } from '@/types'

type Props = {
  artist: ExternalArtist
}

export default function ExternalArtistHeader({ artist }: Props) {
  const { t } = useTranslation()
  const navigation = useNavigation<any>()
  const { isDarkMode } = useTheme()

  const bgUri = buildCover(artist.cover, 'background')

  const metadataItems = useMemo(() => {
    const items: string[] = []
    const albumCount = artist.albums?.length ?? 0
    if (albumCount > 0) {
      items.push(`${albumCount} ${albumCount === 1 ? t('common.album') : t('common.albums')}`)
    }
    if (artist.subtext) items.push(artist.subtext)
    return items
  }, [artist.albums?.length, artist.subtext, t])

  return (
    <>
      <View style={styles.fullBleedWrapper}>
        {bgUri ? (
          <TurboImage
            source={{ uri: bgUri }}
            style={[StyleSheet.absoluteFill, { left: -50, right: -50 }]}
            resizeMode="cover"
            blur={Platform.OS === 'ios' ? 20 : 10}
            fadeDuration={300}
            cachePolicy="dataCache"
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
              : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,1)']
          }
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.centeredCoverContainer}>
          <MediaImage cover={artist.cover} size="detail" style={styles.centeredCover} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.backButton} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Text style={[styles.artistName, isDarkMode && styles.artistNameDark]}>
            {artist.name}
          </Text>
          <View style={styles.metaRow}>
            {metadataItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && (
                  <Text style={[styles.metaDot, isDarkMode && styles.metaTextDark]}>•</Text>
                )}
                <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]} numberOfLines={1}>
                  {item}
                </Text>
              </React.Fragment>
            ))}
          </View>
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
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaDot: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  metaTextDark: {
    color: '#aaa',
  },
})

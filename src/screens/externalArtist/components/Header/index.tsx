import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { ChevronLeft } from 'lucide-react-native'
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

function isAlbumCountText(value?: string | null): boolean {
  return /^\s*\d+\s+albums?\s*$/i.test(value ?? '')
}

export default function ExternalArtistHeader({ artist }: Props) {
  const { t } = useTranslation()
  const navigation = useNavigation<any>()
  const { isDarkMode, colors } = useTheme()
  const [bioExpanded, setBioExpanded] = useState(false)

  const bgUri = buildCover(artist.cover, 'background')

  const metadataItems = useMemo(() => {
    const items: string[] = []
    const albumCount = artist.albums?.length ?? 0
    if (albumCount > 0) {
      items.push(`${albumCount} ${albumCount === 1 ? t('common.album') : t('common.albums')}`)
    }
    if (artist.subtext && !isAlbumCountText(artist.subtext)) items.push(artist.subtext)
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
            <ChevronLeft size={24} color="#fff" style={{ marginLeft: -2 }} />
          </TouchableOpacity>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Text
            style={[styles.artistName, { color: colors.secondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {artist.name}
          </Text>
          <View style={styles.metaRow}>
            {metadataItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && (
                  <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>
                )}
                <Text style={[styles.metaText, { color: colors.subtext }]} numberOfLines={1}>
                  {item}
                </Text>
              </React.Fragment>
            ))}
          </View>
          {!!artist.biography && (
            <TouchableOpacity onPress={() => setBioExpanded(e => !e)} activeOpacity={0.7} style={styles.bioContainer}>
              <Text
                style={[styles.bioText, { color: colors.subtext }]}
                numberOfLines={bioExpanded ? undefined : 3}
              >
                {artist.biography}
              </Text>
              <Text style={[styles.bioToggle, { color: colors.subtext }]}>
                {bioExpanded ? t('common.less') : t('common.more')}
              </Text>
            </TouchableOpacity>
          )}
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  artistName: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
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
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 14,
  },
  bioContainer: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  bioToggle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
})

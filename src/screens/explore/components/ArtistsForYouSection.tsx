import React, { useCallback } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import MediaTile from './MediaTile'
import ExploreEmptyCard from './ExploreEmptyCard'
import { ExternalArtistBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5

type Props = {
  data: ExternalArtistBase[]
  ready: boolean
}

export default function ArtistsForYouSection({ data, ready }: Props) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const screenWidth = Dimensions.get('window').width
  const gridGap = 12

  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS
  const tileHeight = gridItemWidth + 8 + 14 + 4 + 12
  const renderArtist = useCallback(({ item }: { item: ExternalArtistBase }) => (
    <MediaTile
      cover={item.cover}
      title={item.name}
      subtitle={item.subtext}
      size={gridItemWidth}
      radius={gridItemWidth / 2}
      onPress={() => navigation.navigate('externalArtistView', { mbid: item.id, name: item.name })}
    />
  ), [navigation, gridItemWidth])

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.artistsForYou')}
      </Text>
      {!ready || data.length === 0 ? (
        <View style={{ paddingHorizontal: H_PADDING }}>
          <ExploreEmptyCard
            width={screenWidth - H_PADDING * 2}
            height={tileHeight}
            radius={14}
          />
        </View>
      ) : (
        <FlashList
          horizontal
          data={data}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: H_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: gridGap }} />}
          renderItem={renderArtist}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: H_PADDING,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleDark: {
    color: '#888',
  },
})

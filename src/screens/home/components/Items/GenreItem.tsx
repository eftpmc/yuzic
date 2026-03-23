import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { MediaImage } from '@/components/MediaImage'
import { CoverSource } from '@/types'
import { useTheme } from '@/hooks/useTheme'

interface Props {
  name: string
  albumCount: number
  cover: CoverSource
  isGridView: boolean
  gridWidth: number
  gridSpacing?: number
  onPress: () => void
}

const GenreItem: React.FC<Props> = ({
  name,
  albumCount,
  cover,
  isGridView,
  gridWidth,
  gridSpacing = 8,
  onPress,
}) => {
  const { isDarkMode } = useTheme()

  const subtext = `${albumCount} ${albumCount === 1 ? 'album' : 'albums'}`

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        isGridView
          ? [styles.gridItemContainer, { width: gridWidth, marginHorizontal: gridSpacing, marginVertical: gridSpacing }]
          : styles.itemContainer,
        pressed && styles.pressed,
      ]}
    >
      <MediaImage
        cover={cover}
        size={isGridView ? 'grid' : 'thumb'}
        style={
          isGridView
            ? { width: gridWidth, aspectRatio: 1, borderRadius: 8 }
            : { width: 50, height: 50, borderRadius: 4, marginRight: 12 }
        }
      />

      <View style={isGridView ? styles.gridTextContainer : styles.textContainer}>
        <Text
          style={[styles.title, isDarkMode && styles.titleDark]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={[styles.subtext, isDarkMode && styles.subtextDark]}
          numberOfLines={1}
        >
          {subtext}
        </Text>
      </View>

      {!isGridView && (
        <TouchableOpacity hitSlop={10}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDarkMode ? '#444' : '#ccc'}
          />
        </TouchableOpacity>
      )}
    </Pressable>
  )
}

export default GenreItem

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  gridItemContainer: {
    alignItems: 'flex-start',
    borderRadius: 14,
  },
  gridTextContainer: {
    marginTop: 4,
    width: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#e6e6e6',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
  subtextDark: {
    color: '#aaa',
  },
  pressed: {
    opacity: 0.9,
  },
})
